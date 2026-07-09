/**
 * resultsController.js
 * Handles: template generation, upload, publish, archive, history.
 */
const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");
const mongoose = require("mongoose");

const GpaSubject = require("../models/GpaSubject");
const Semester = require("../models/Semester");
const AcademicYear = require("../models/AcademicYear");
const ResultUpload = require("../models/ResultUpload");
const StudentResult = require("../models/StudentResult");
const StudentSemesterGPA = require("../models/StudentSemesterGPA");
const StudentCGPA = require("../models/StudentCGPA");
const User = require("../models/User");
const { resolveGradePoint, calculateSemesterGPA, calculateCGPA, MC_GRADE } = require("../utils/gpaCalculator");

const VALID_GRADES = new Set(["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "E", "E*", "F", "MC"]);
const UPLOAD_DIR = path.join(__dirname, "../../uploads/results");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/results/template?semesterId=
// Generates a fresh .xlsx template from current DB subjects — NO CACHING
// ─────────────────────────────────────────────────────────────────────────────
async function getTemplate(req, res) {
  try {
    const { semesterId } = req.query;
    if (!semesterId) return res.status(400).json({ message: "semesterId query param is required" });

    const subjects = await GpaSubject.find({ semesterId }).sort({ subjectCode: 1 });
    if (subjects.length === 0)
      return res.status(400).json({ message: "No subjects found for this semester. Add subjects before downloading the template." });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Results");

    // Build header row: STUDENT NO | NAME | CODE1 | CODE2 | ...
    const headers = ["STUDENT NO", "NAME"];
    for (const sub of subjects) {
      headers.push(sub.subjectCode.toUpperCase()); // Grade column
    }
    sheet.addRow(headers);

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3864" } };
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.alignment = { horizontal: "center" };

    // Set column widths
    sheet.getColumn(1).width = 20; // STUDENT NO
    sheet.getColumn(2).width = 30; // NAME
    for (let i = 3; i <= headers.length; i++) {
      sheet.getColumn(i).width = 12; // Subject columns
    }

    // Add a metadata comment row so parsers know which columns are grades
    // (Row 2 is intentionally left blank for the department to fill)
    sheet.addRow([]); // blank sample row

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="results_template_${semesterId}.xlsx"`);
    res.setHeader("Cache-Control", "no-store");
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/results/upload  (multipart/form-data: file + semesterId)
// ─────────────────────────────────────────────────────────────────────────────
async function uploadResults(req, res) {
  try {
    const { semesterId } = req.body;
    if (!semesterId) return res.status(400).json({ message: "semesterId is required" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // Validate mime / extension
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== ".xlsx")
      return res.status(400).json({ message: "Only .xlsx files are accepted" });
    if (req.file.size > 10 * 1024 * 1024)
      return res.status(400).json({ message: "File exceeds 10 MB limit" });

    // Load semester & its subjects
    const semester = await Semester.findById(semesterId);
    if (!semester) return res.status(404).json({ message: "Semester not found" });

    const dbSubjects = await GpaSubject.find({ semesterId }).sort({ subjectCode: 1 });
    if (dbSubjects.length === 0)
      return res.status(400).json({ message: "No subjects defined for this semester" });

    // Build a set of active subject codes for fast lookup
    const subjectMap = new Map(); // CODE → { credits, subjectType }
    for (const s of dbSubjects) subjectMap.set(s.subjectCode.toUpperCase(), s);

    // ── Parse Excel ──────────────────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];

    // Step 1: Scan for header row where col[0]="NAME" and col[2]="STUDENT NO"
    let headerRowIndex = -1;
    let studentNoCol = -1;
    let nameCol = -1;
    const subjectColIndices = new Map(); // colIndex → subjectCode

    sheet.eachRow((row, rowNumber) => {
      if (headerRowIndex !== -1) return;
      const col0 = String(row.getCell(1).value || "").trim().toUpperCase();
      const col1 = String(row.getCell(2).value || "").trim().toUpperCase();
      
      if (col0 === "STUDENT NO" && col1 === "NAME") {
        headerRowIndex = rowNumber;
        studentNoCol = 1;
        nameCol = 2;
      } else if (col0 === "NAME" && col1 === "STUDENT NO") {
        headerRowIndex = rowNumber;
        studentNoCol = 2;
        nameCol = 1;
      }

      if (headerRowIndex !== -1) {
        // Step 2: Walk columns to find subject code columns, skip empty/space placeholders
        row.eachCell({ includeEmpty: true }, (cell, colNum) => {
          const val = String(cell.value || "").trim().toUpperCase();
          if (subjectMap.has(val)) {
            subjectColIndices.set(colNum, val);
          }
        });
      }
    });

    if (headerRowIndex === -1)
      return res.status(422).json({ errors: [{ row: null, message: 'Header row not found. Expected row with "STUDENT NO" and "NAME" in the first two columns.' }] });

    // ── Validation pass ───────────────────────────────────────────────────────
    const errors = [];
    const warnings = [];
    const seenRegNos = new Set();
    const parsedRows = []; // { registrationNo, studentName, grades: Map<code, grade> }

    // Build a set of all known user registration numbers for warning purposes
    const allStudentIds = new Set(
      (await User.find({ role: "student" }).select("studentId").lean()).map(u => (u.studentId || "").toUpperCase())
    );

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowIndex) return; // skip header and above

      const registrationNo = String(row.getCell(studentNoCol).value || "").trim().toUpperCase();
      const studentName = String(row.getCell(nameCol).value || "").trim();

      // Skip completely empty rows
      if (!studentName && !registrationNo) return;
      if (!registrationNo) {
        errors.push({ row: rowNumber, message: `Row ${rowNumber}: STUDENT NO is empty` });
        return;
      }

      // Duplicate check within this file
      if (seenRegNos.has(registrationNo)) {
        errors.push({ row: rowNumber, message: `Row ${rowNumber}: Duplicate STUDENT NO "${registrationNo}" in this file` });
        return;
      }
      seenRegNos.add(registrationNo);

      // Warn if student not in user DB (do NOT reject)
      if (!allStudentIds.has(registrationNo)) {
        warnings.push({ row: rowNumber, message: `Row ${rowNumber}: Student "${registrationNo}" not found in user database (result will still be stored)` });
      }

      // Extract grades from subject columns
      const grades = new Map();
      subjectColIndices.forEach((subjectCode, colNum) => {
        const raw = row.getCell(colNum).value;
        if (raw === null || raw === undefined || String(raw).trim() === "") return; // empty → did not sit, skip silently
        const grade = String(raw).trim().toUpperCase();
        if (!VALID_GRADES.has(grade)) {
          errors.push({ row: rowNumber, message: `Row ${rowNumber}, subject ${subjectCode}: Invalid grade "${raw}"` });
          return;
        }
        grades.set(subjectCode, grade);
      });

      parsedRows.push({ registrationNo, studentName, grades });
    });

    // Hard errors → abort, commit nothing
    if (errors.length > 0) {
      return res.status(422).json({ errors, warnings });
    }

    // ── Persist ───────────────────────────────────────────────────────────────
    // Save file to disk
    const fileName = `${Date.now()}_${req.file.originalname.replace(/[^a-z0-9._-]/gi, "_")}`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    fs.writeFileSync(filePath, req.file.buffer);

    // Deactivate previous uploads for this semester
    await ResultUpload.updateMany({ semesterId, isActive: true }, { $set: { isActive: false } });

    // Determine next version
    const prevUpload = await ResultUpload.findOne({ semesterId }).sort({ version: -1 });
    const version = prevUpload ? prevUpload.version + 1 : 1;

    // Count total result rows that will be inserted
    let totalRecords = 0;
    for (const row of parsedRows) totalRecords += row.grades.size;

    const upload = await ResultUpload.create({
      semesterId,
      fileName: req.file.originalname,
      filePath: `uploads/results/${fileName}`,
      uploadedBy: req.user._id,
      recordCount: totalRecords,
      version,
      isActive: true,
      isPublished: false,
    });

    // Build StudentResult docs; handle repeat module rule globally
    const resultDocs = [];
    for (const row of parsedRows) {
      for (const [subjectCode, grade] of row.grades) {
        const subjectMeta = subjectMap.get(subjectCode);
        resultDocs.push({
          registrationNo: row.registrationNo,
          studentName: row.studentName,
          semesterId: semester._id,
          subjectCode,
          credits: subjectMeta ? subjectMeta.credits : 0,
          grade,
          gradePoint: resolveGradePoint(grade),
          isLatestAttempt: true,
          resultUploadId: upload._id,
        });
      }
    }

    // NOTE: We do NOT apply the global repeat-module rule here anymore.
    // Draft uploads should not mutate `isLatestAttempt` of prior published records.
    // That logic is now strictly handled inside `publishResults` (Atomic Transaction).

    // Bulk insert
    await StudentResult.insertMany(resultDocs);

    res.status(201).json({
      message: "Upload successful. Results saved but not yet published.",
      upload: { _id: upload._id, version, recordCount: totalRecords },
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/results/publish/:uploadId
// Runs in a Mongoose transaction — publishes results, locks semester, calcs GPAs
// ─────────────────────────────────────────────────────────────────────────────
async function publishResults(req, res) {
  let semesterLocked = false;
  let yearLocked = false;

  try {
    const upload = await ResultUpload.findById(req.params.uploadId);
    if (!upload) return res.status(404).json({ message: "Upload not found" });
    if (upload.isPublished) return res.status(409).json({ message: "Upload already published" });

    const semester = await Semester.findById(upload.semesterId);
    if (!semester) return res.status(404).json({ message: "Semester not found" });

    const academicYear = await AcademicYear.findById(semester.academicYearId);
    if (!academicYear) return res.status(404).json({ message: "Academic year not found" });

    // 1. Lock semester + academic year
    semester.isLocked = true;
    await semester.save();
    semesterLocked = true;

    academicYear.isLocked = true;
    await academicYear.save();
    yearLocked = true;

    // 2. Mark upload as published
    upload.isPublished = true;
    await upload.save();

    // 3. Repeat Module Rule (Global Scope)
    // Find all records in this upload, and mark older published records for the same (regNo + subjectCode) as false
    const uploadResults = await StudentResult.find({ resultUploadId: upload._id });
    const registrationNos = [...new Set(uploadResults.map(r => r.registrationNo))];
    const affectedPastRecords = new Map(); // pastSemesterId -> Set of registrationNos

    for (const row of uploadResults) {
      const olderRecords = await StudentResult.find({
        registrationNo: row.registrationNo,
        subjectCode: row.subjectCode,
        isLatestAttempt: true,
        _id: { $ne: row._id }
      });

      for (const old of olderRecords) {
        old.isLatestAttempt = false;
        await old.save();
        const semStr = old.semesterId.toString();
        if (!affectedPastRecords.has(semStr)) affectedPastRecords.set(semStr, new Set());
        affectedPastRecords.get(semStr).add(old.registrationNo);
      }
    }

    // 4. Calculate & upsert StudentSemesterGPA for the current upload's semester
    for (const regNo of registrationNos) {
      const rows = await StudentResult.find({
        registrationNo: regNo,
        semesterId: upload.semesterId,
        isLatestAttempt: true,
      });
      const { semesterGPA, totalCredits } = calculateSemesterGPA(rows);
      await StudentSemesterGPA.findOneAndUpdate(
        { registrationNo: regNo, semesterId: upload.semesterId },
        { semesterGPA, totalCredits, calculatedAt: new Date() },
        { upsert: true, new: true }
      );
    }

    // 5. Recalculate StudentSemesterGPA for any affected past semesters
    for (const [pastSemId, regNos] of affectedPastRecords.entries()) {
      const pastUpload = await ResultUpload.findOne({ semesterId: pastSemId, isPublished: true });
      if (!pastUpload) continue;
      for (const regNo of regNos) {
        const rows = await StudentResult.find({
          registrationNo: regNo,
          semesterId: pastSemId,
          isLatestAttempt: true,
          resultUploadId: pastUpload._id
        });
        const { semesterGPA, totalCredits } = calculateSemesterGPA(rows);
        await StudentSemesterGPA.findOneAndUpdate(
          { registrationNo: regNo, semesterId: pastSemId },
          { semesterGPA, totalCredits, calculatedAt: new Date() },
          { upsert: true, new: true }
        );
      }
    }

    // 6. Recalculate CGPA globally for all affected students
    const allAffectedStudents = new Set([...registrationNos]);
    for (const regNos of affectedPastRecords.values()) {
      regNos.forEach(r => allAffectedStudents.add(r));
    }
    await _recalcCGPAForStudents([...allAffectedStudents]);

    res.json({ message: "Results published successfully", uploadId: upload._id });
  } catch (err) {
    try {
      if (semesterLocked) await Semester.findByIdAndUpdate(req.params.uploadId && (await ResultUpload.findById(req.params.uploadId))?.semesterId, { isLocked: false });
    } catch (_) { /* ignore rollback errors */ }
    res.status(500).json({ message: `Publish failed: ${err.message}` });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/results/archive/:uploadId
// Unpublishes results, unlocks semester, recalculates CGPA & restores old repeats
// ─────────────────────────────────────────────────────────────────────────────
async function deleteResults(req, res) {
  try {
    const upload = await ResultUpload.findById(req.params.uploadId);
    if (!upload) return res.status(404).json({ message: "Upload not found" });

    // 1. Delete StudentSemesterGPA records for this semester
    await StudentSemesterGPA.deleteMany({ semesterId: upload.semesterId });

    // 3. Unlock semester if no other published uploads remain for it
    const otherPublished = await ResultUpload.countDocuments({
      semesterId: upload.semesterId,
      isPublished: true,
      _id: { $ne: upload._id },
    });
    if (otherPublished === 0) {
      await Semester.findByIdAndUpdate(upload.semesterId, { isLocked: false });
      const semester = await Semester.findById(upload.semesterId);
      if (semester) {
        const lockedSiblings = await Semester.countDocuments({ academicYearId: semester.academicYearId, isLocked: true });
        if (lockedSiblings === 0) {
          await AcademicYear.findByIdAndUpdate(semester.academicYearId, { isLocked: false });
        }
      }
    }

    // 4. Repeat Module Rollback: restore isLatestAttempt to prior published attempts
    const uploadResults = await StudentResult.find({ resultUploadId: upload._id });
    const affectedRestoredRecords = new Map();
    const allAffectedRegNos = new Set();

    for (const row of uploadResults) {
      allAffectedRegNos.add(row.registrationNo);
      // Delete the record
      await StudentResult.deleteOne({ _id: row._id });

      // Find all other attempts for this student + subject
      const allOtherAttempts = await StudentResult.find({
        registrationNo: row.registrationNo,
        subjectCode: row.subjectCode,
        _id: { $ne: row._id }
      }).populate({
        path: 'resultUploadId',
        match: { isPublished: true }
      });

      // Filter only published ones
      const publishedAttempts = allOtherAttempts.filter(r => r.resultUploadId !== null);
      if (publishedAttempts.length > 0) {
        // Sort to find the latest by upload date
        publishedAttempts.sort((a, b) => b.resultUploadId.uploadedAt - a.resultUploadId.uploadedAt);
        const restoredRecord = publishedAttempts[0];
        
        restoredRecord.isLatestAttempt = true;
        await restoredRecord.save();

        const semStr = restoredRecord.semesterId.toString();
        if (!affectedRestoredRecords.has(semStr)) affectedRestoredRecords.set(semStr, new Set());
        affectedRestoredRecords.get(semStr).add(restoredRecord.registrationNo);
      }
    }

    // 5. Recalculate StudentSemesterGPA for restored past semesters
    for (const [pastSemId, regNos] of affectedRestoredRecords.entries()) {
      const pastUpload = await ResultUpload.findOne({ semesterId: pastSemId, isPublished: true });
      if (!pastUpload) continue;
      for (const regNo of regNos) {
        const rows = await StudentResult.find({
          registrationNo: regNo,
          semesterId: pastSemId,
          isLatestAttempt: true,
          resultUploadId: pastUpload._id
        });
        const { semesterGPA, totalCredits } = calculateSemesterGPA(rows);
        await StudentSemesterGPA.findOneAndUpdate(
          { registrationNo: regNo, semesterId: pastSemId },
          { semesterGPA, totalCredits, calculatedAt: new Date() },
          { upsert: true, new: true }
        );
      }
    }

    // 6. Delete the ResultUpload document
    await ResultUpload.deleteOne({ _id: upload._id });

    // 7. Recalculate CGPA for all affected students
    await _recalcCGPAForStudents([...allAffectedRegNos], null);

    res.json({ message: "Upload deleted permanently. Semester GPA records removed. CGPA recalculated.", deletedUploadId: upload._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/results/history?semesterId=
// ─────────────────────────────────────────────────────────────────────────────
async function getHistory(req, res) {
  try {
    const { semesterId } = req.query;
    if (!semesterId) return res.status(400).json({ message: "semesterId query param is required" });

    const uploads = await ResultUpload.find({ semesterId })
      .populate("uploadedBy", "firstName lastName email")
      .sort({ version: -1 });

    const history = uploads.map(u => ({
      _id: u._id,
      version: u.version,
      fileName: u.fileName,
      recordCount: u.recordCount,
      isActive: u.isActive,
      isPublished: u.isPublished,
      uploadedAt: u.uploadedAt,
      uploadedBy: u.uploadedBy,
      downloadUrl: `http://localhost:${process.env.PORT || 5000}/${u.filePath}`,
    }));

    res.json({ history });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/results/upload/:uploadId/data
// ─────────────────────────────────────────────────────────────────────────────
async function getUploadData(req, res) {
  try {
    const { uploadId } = req.params;
    const upload = await ResultUpload.findById(uploadId);
    if (!upload) return res.status(404).json({ message: "Upload not found" });

    const results = await StudentResult.find({ resultUploadId: uploadId });
    
    // Group by student
    const studentMap = new Map();
    const subjectsSet = new Set();
    
    results.forEach(r => {
      if (!studentMap.has(r.registrationNo)) {
        studentMap.set(r.registrationNo, {
          registrationNo: r.registrationNo,
          studentName: r.studentName || "",
          grades: {}
        });
      }
      studentMap.get(r.registrationNo).grades[r.subjectCode] = r.grade;
      subjectsSet.add(r.subjectCode);
    });
    
    const rows = Array.from(studentMap.values());
    const subjects = Array.from(subjectsSet).sort();
    
    res.json({ rows, subjects });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/academic-performance  (Student auth)
// Returns CGPA + per-semester published results for the requesting student
// ─────────────────────────────────────────────────────────────────────────────
async function getMyAcademicPerformance(req, res) {
  try {
    const registrationNo = (req.user.studentId || "").toUpperCase();
    if (!registrationNo) return res.status(400).json({ message: "Student ID not set on account" });

    // 1. CGPA
    const cgpaDoc = await StudentCGPA.findOne({ registrationNo });

    // 2. Semester GPAs (only from published uploads)
    const semGPAs = await StudentSemesterGPA.find({ registrationNo })
      .populate({
        path: "semesterId",
        select: "label semesterNumber academicYearId",
        populate: { path: "academicYearId", select: "year" },
      })
      .sort({ "semesterId.semesterNumber": 1 });

    // 3. For each semester, get published subject results
    const semesterDetails = await Promise.all(
      semGPAs.map(async (sgpa) => {
        // Find an active published upload for this semester
        const publishedUpload = await ResultUpload.findOne({ semesterId: sgpa.semesterId, isPublished: true });
        if (!publishedUpload) return null; // Guard: only published data

        const results = await StudentResult.find({
          registrationNo,
          semesterId: sgpa.semesterId._id,
          isLatestAttempt: true,
          resultUploadId: publishedUpload._id,
        }).select("subjectCode credits grade gradePoint");

        return {
          semesterId: sgpa.semesterId._id,
          semesterNumber: sgpa.semesterId.semesterNumber,
          label: sgpa.semesterId.label,
          academicYear: sgpa.semesterId.academicYearId?.year,
          semesterGPA: sgpa.semesterGPA,
          totalCredits: sgpa.totalCredits,
          subjects: results,
        };
      })
    );

    res.json({
      registrationNo,
      cgpa: cgpaDoc?.cgpa ?? null,
      semesters: semesterDetails.filter(Boolean),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper: recalculate CGPA for a list of registrationNos
// Uses only StudentSemesterGPA records that correspond to published uploads
// ─────────────────────────────────────────────────────────────────────────────
async function _recalcCGPAForStudents(registrationNos, session) {
  for (const regNo of registrationNos) {
    // Get all semester GPA records for this student
    const semGPAs = await StudentSemesterGPA.find({ registrationNo: regNo });

    // Filter: only include semesters that have a published upload
    const validSemGPAs = [];
    for (const sg of semGPAs) {
      const published = await ResultUpload.findOne({ semesterId: sg.semesterId, isPublished: true });
      if (published) validSemGPAs.push(sg);
    }

    const { cgpa } = calculateCGPA(validSemGPAs);

    const updateOp = StudentCGPA.findOneAndUpdate(
      { registrationNo: regNo },
      { cgpa, calculatedAt: new Date() },
      { upsert: true, new: true }
    );
    if (session) await updateOp.session(session);
    else await updateOp;
  }
}

module.exports = {
  getTemplate,
  uploadResults,
  publishResults,
  deleteResults,
  getHistory,
  getMyAcademicPerformance,
  getUploadData,
};
