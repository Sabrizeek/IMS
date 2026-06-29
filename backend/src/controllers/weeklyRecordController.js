const WeeklyRecord = require("../models/WeeklyRecord");
const User = require("../models/User");
const Log = require("../models/Log");
const Skill = require("../models/Skill");
const InternshipApplication = require("../models/InternshipApplication");

// Helper to check if a week is closed by date
function isWeekClosed(weekEnd) {
  return new Date() > new Date(weekEnd);
}

// Helper to upsert skills
async function upsertSkills(skillsArr) {
  if (!skillsArr || !Array.isArray(skillsArr)) return;
  for (const skillName of skillsArr) {
    if (skillName.trim()) {
      await Skill.updateOne(
        { name: skillName.trim() },
        { $setOnInsert: { name: skillName.trim() } },
        { upsert: true }
      );
    }
  }
}

async function listMyRecords(req, res) {
  try {
    let records = await WeeklyRecord.find({ user: req.user._id }).sort({ weekNumber: 1 });
    
    // Auto-update isLocked if date is past weekEnd
    let updated = false;
    for (let record of records) {
      if (!record.isLocked && isWeekClosed(record.weekEnd)) {
        record.isLocked = true;
        await record.save();
        updated = true;
      }
    }
    if (updated) {
      records = await WeeklyRecord.find({ user: req.user._id }).sort({ weekNumber: 1 });
    }

    res.json({ records });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function createRecord(req, res) {
  try {
    const { weekNumber, weekStart, weekEnd, activities, challengesEncountered, reflections, skillsGained, status } = req.body;
    
    // 1. Enforce internship approval
    const application = await InternshipApplication.findOne({ user: req.user._id });
    if (!application || !application.approved) {
      return res.status(400).json({ message: "Access denied. Internship has not been approved yet." });
    }

    if (!weekStart || !weekEnd) {
      return res.status(400).json({ message: "Start Date and End Date are required." });
    }

    const internshipStartDate = application.internshipStartDate;
    const baseDate = new Date(internshipStartDate);
    
    // Calculate boundaries for the week
    const expectedStart = new Date(baseDate);
    expectedStart.setDate(baseDate.getDate() + (weekNumber - 1) * 7);
    const expectedEnd = new Date(expectedStart);
    expectedEnd.setDate(expectedStart.getDate() + 6);

    expectedStart.setHours(0,0,0,0);
    expectedEnd.setHours(23,59,59,999);

    const inputStart = new Date(weekStart);
    const inputEnd = new Date(weekEnd);
    inputStart.setHours(0,0,0,0);
    inputEnd.setHours(0,0,0,0);

    // 2. Date checks
    if (inputStart > inputEnd) {
      return res.status(400).json({ message: "End Date cannot be earlier than Start Date." });
    }
    if (inputStart < expectedStart || inputStart > expectedEnd) {
      return res.status(400).json({ message: `Start Date must belong to Week ${weekNumber} (${expectedStart.toLocaleDateString()} - ${expectedEnd.toLocaleDateString()}).` });
    }
    if (inputEnd < expectedStart || inputEnd > expectedEnd) {
      return res.status(400).json({ message: `End Date must belong to Week ${weekNumber} (${expectedStart.toLocaleDateString()} - ${expectedEnd.toLocaleDateString()}).` });
    }

    // 3. Disable future weeks selection
    if (new Date() < expectedStart) {
      return res.status(400).json({ message: `Week ${weekNumber} is in the future and not yet available.` });
    }

    // 4. Validate sequential progression (cannot skip weeks)
    if (weekNumber > 1) {
      const prevRecord = await WeeklyRecord.findOne({ user: req.user._id, weekNumber: weekNumber - 1 });
      if (!prevRecord || prevRecord.status !== "Submitted") {
        return res.status(400).json({ message: `Week ${weekNumber - 1} must be submitted before starting or saving Week ${weekNumber}.` });
      }
    }

    // 5. Prevent overlapping date ranges
    const overlapping = await WeeklyRecord.findOne({
      user: req.user._id,
      $or: [
        { weekStart: { $lte: inputEnd }, weekEnd: { $gte: inputStart } }
      ]
    });
    if (overlapping) {
      return res.status(400).json({ message: `The selected date range overlaps with Week ${overlapping.weekNumber}.` });
    }

    // 6. Check if record already exists
    const existing = await WeeklyRecord.findOne({ user: req.user._id, weekNumber });
    if (existing) {
      return res.status(400).json({ message: "Record for this week already exists. Use PUT to edit." });
    }

    // Filter duplicates and trim skills
    const uniqueSkills = Array.from(new Set((skillsGained || []).map(s => s.trim()))).filter(Boolean);

    // 7. Full validation for submission
    if (status === "Submitted") {
      if (!activities || activities.trim().length < 200) return res.status(400).json({ message: "Tasks Completed must be at least 200 characters to submit." });
      if (!challengesEncountered || !challengesEncountered.trim()) return res.status(400).json({ message: "Challenges Encountered is required to submit." });
      if (!reflections || !reflections.trim()) return res.status(400).json({ message: "Reflections & Learning Outcomes is required to submit." });
      if (uniqueSkills.length === 0) return res.status(400).json({ message: "At least one skill must be added to submit." });
    }

    if (uniqueSkills.length > 0) {
      await upsertSkills(uniqueSkills);
    }

    const isLocked = isWeekClosed(expectedEnd);
    const record = await WeeklyRecord.create({
      user: req.user._id,
      weekNumber,
      weekStart: inputStart,
      weekEnd: inputEnd,
      activities: activities || "",
      challengesEncountered: challengesEncountered || "",
      reflections: reflections || "",
      skillsGained: uniqueSkills,
      status: status || "Draft",
      isLocked,
      submittedAt: status === "Submitted" ? new Date() : undefined,
    });

    res.status(201).json({ record });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function updateRecord(req, res) {
  try {
    const record = await WeeklyRecord.findOne({ _id: req.params.id, user: req.user._id });
    if (!record) return res.status(404).json({ message: "Weekly record not found" });

    // Check if locked or submitted
    if (record.status === "Submitted") {
      return res.status(400).json({ message: "Cannot edit a submitted record." });
    }
    if (record.isLocked && !record.unlockRequested) {
      return res.status(400).json({ message: "Week has closed. Editing is locked. Request an unlock to edit." });
    }

    const { weekStart, weekEnd, activities, challengesEncountered, reflections, skillsGained, status } = req.body;
    
    // 1. Fetch approved internship
    const application = await InternshipApplication.findOne({ user: req.user._id });
    if (!application || !application.approved) {
      return res.status(400).json({ message: "Access denied. Internship not approved." });
    }

    const wStart = weekStart !== undefined ? new Date(weekStart) : record.weekStart;
    const wEnd = weekEnd !== undefined ? new Date(weekEnd) : record.weekEnd;
    wStart.setHours(0,0,0,0);
    wEnd.setHours(0,0,0,0);

    const baseDate = new Date(application.internshipStartDate);
    const expectedStart = new Date(baseDate);
    expectedStart.setDate(baseDate.getDate() + (record.weekNumber - 1) * 7);
    const expectedEnd = new Date(expectedStart);
    expectedEnd.setDate(expectedStart.getDate() + 6);
    expectedStart.setHours(0,0,0,0);
    expectedEnd.setHours(23,59,59,999);

    // 2. Date checks
    if (wStart > wEnd) {
      return res.status(400).json({ message: "End Date cannot be earlier than Start Date." });
    }
    if (wStart < expectedStart || wStart > expectedEnd) {
      return res.status(400).json({ message: `Start Date must belong to Week ${record.weekNumber} (${expectedStart.toLocaleDateString()} - ${expectedEnd.toLocaleDateString()}).` });
    }
    if (wEnd < expectedStart || wEnd > expectedEnd) {
      return res.status(400).json({ message: `End Date must belong to Week ${record.weekNumber} (${expectedStart.toLocaleDateString()} - ${expectedEnd.toLocaleDateString()}).` });
    }

    // 3. Disable future weeks selection
    if (new Date() < expectedStart) {
      return res.status(400).json({ message: `Week ${record.weekNumber} is in the future and not yet available.` });
    }

    // 4. Validate sequential progression (cannot submit Week 2 if Week 1 is not submitted)
    if (status === "Submitted" && record.weekNumber > 1) {
      const prevRecord = await WeeklyRecord.findOne({ user: req.user._id, weekNumber: record.weekNumber - 1 });
      if (!prevRecord || prevRecord.status !== "Submitted") {
        return res.status(400).json({ message: `Week ${record.weekNumber - 1} must be submitted before submitting Week ${record.weekNumber}.` });
      }
    }

    // 5. Prevent overlapping date ranges
    const overlapping = await WeeklyRecord.findOne({
      user: req.user._id,
      _id: { $ne: record._id },
      $or: [
        { weekStart: { $lte: wEnd }, weekEnd: { $gte: wStart } }
      ]
    });
    if (overlapping) {
      return res.status(400).json({ message: `The selected date range overlaps with Week ${overlapping.weekNumber}.` });
    }

    // Filter duplicates and trim skills
    const uniqueSkills = skillsGained !== undefined 
      ? Array.from(new Set(skillsGained.map(s => s.trim()))).filter(Boolean)
      : record.skillsGained;

    // 6. Validation for submission
    if (status === "Submitted") {
      const act = activities !== undefined ? activities : record.activities;
      const chall = challengesEncountered !== undefined ? challengesEncountered : record.challengesEncountered;
      const refl = reflections !== undefined ? reflections : record.reflections;
      
      if (!act || act.trim().length < 200) return res.status(400).json({ message: "Tasks Completed must be at least 200 characters to submit." });
      if (!chall || !chall.trim()) return res.status(400).json({ message: "Challenges Encountered is required to submit." });
      if (!refl || !refl.trim()) return res.status(400).json({ message: "Reflections & Learning Outcomes is required to submit." });
      if (uniqueSkills.length === 0) return res.status(400).json({ message: "At least one skill must be added to submit." });
    }
    
    // Save version history if activities change
    let changed = false;
    if (activities !== undefined && activities !== record.activities) changed = true;
    if (challengesEncountered !== undefined && challengesEncountered !== record.challengesEncountered) changed = true;
    if (reflections !== undefined && reflections !== record.reflections) changed = true;
    if (skillsGained !== undefined && JSON.stringify(skillsGained) !== JSON.stringify(record.skillsGained)) changed = true;
    if (weekStart !== undefined && new Date(weekStart).getTime() !== record.weekStart.getTime()) changed = true;
    if (weekEnd !== undefined && new Date(weekEnd).getTime() !== record.weekEnd.getTime()) changed = true;

    if (changed) {
      record.versionHistory.push({ activities: record.activities, updatedAt: new Date() });
      if (activities !== undefined) record.activities = activities;
      if (challengesEncountered !== undefined) record.challengesEncountered = challengesEncountered;
      if (reflections !== undefined) record.reflections = reflections;
      if (weekStart !== undefined) record.weekStart = wStart;
      if (weekEnd !== undefined) record.weekEnd = wEnd;
      if (skillsGained !== undefined) {
        record.skillsGained = uniqueSkills;
        await upsertSkills(uniqueSkills);
      }
      
      // Auto-progress status to Edited if we are saving changes to a Draft
      if (record.status === "Draft" && status !== "Submitted") {
        record.status = "Edited";
      }
    }
    
    if (status !== undefined) {
      if (status === "Submitted") {
        record.status = "Submitted";
        record.isLocked = true;
        record.submittedAt = new Date();
      } else if (status === "Draft" && record.status === "Edited") {
        // preserve edited state if frontend sends "Draft"
      } else {
        record.status = status;
      }
    }

    await record.save();
    res.json({ record });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function requestUnlock(req, res) {
  try {
    const record = await WeeklyRecord.findOne({ _id: req.params.id, user: req.user._id });
    if (!record) return res.status(404).json({ message: "Weekly record not found" });

    record.unlockRequested = true;
    await record.save();

    // Log the request
    await Log.create({
      userId: req.user._id,
      action: "Unlock Request Submitted",
      studentId: req.user.studentId,
    });

    res.json({ record });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Department endpoints
async function listStudentRecords(req, res) {
  try {
    const student = await User.findById(req.params.studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const records = await WeeklyRecord.find({ user: student._id }).sort({ weekNumber: 1 });

    // Create Audit Log for Record Book Access
    await Log.create({
      userId: req.user._id, // Department user
      action: "Record Book Access",
      studentId: student.studentId,
    });

    res.json({ student, records });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function unlockRecord(req, res) {
  try {
    const { action } = req.body; // "approve" or "reject"
    const record = await WeeklyRecord.findById(req.params.id).populate("user");
    if (!record) return res.status(404).json({ message: "Weekly record not found" });

    if (action === "approve") {
      record.isLocked = false;
      record.status = "Draft"; // Allow editing
      record.unlockRequested = false;
      await record.save();

      // Log the unlock action
      await Log.create({
        userId: req.user._id,
        action: "Unlock Request Approved",
        studentId: record.user?.studentId || "",
      });
    } else {
      record.unlockRequested = false;
      await record.save();
      
      // Log the rejection
      await Log.create({
        userId: req.user._id,
        action: "Unlock Request Rejected",
        studentId: record.user?.studentId || "",
      });
    }

    res.json({ record });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

const PDFDocument = require("pdfkit");

async function generatePdfReport(req, res) {
  try {
    const { type, weekIds } = req.body;
    // type: "weekly" | "summary"
    // weekIds: Array of IDs to include

    const records = await WeeklyRecord.find({ 
      _id: { $in: weekIds }, 
      user: req.user._id 
    }).sort({ weekNumber: 1 });

    if (records.length === 0) {
      return res.status(404).json({ message: "No records found for generation" });
    }

    const doc = new PDFDocument({ margin: 50 });
    const filename = type === "summary" ? "Three-Week-Summary.pdf" : `Weekly-Report-W${records[0].weekNumber}.pdf`;
    
    res.setHeader("Content-disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-type", "application/pdf");
    
    doc.pipe(res);

    doc.fontSize(20).text(type === "summary" ? "Three-Week Summary Report" : "Weekly Internship Report", { align: 'center' });
    doc.moveDown();

    for (const record of records) {
      doc.fontSize(14).text(`Week ${record.weekNumber} (${new Date(record.weekStart).toLocaleDateString()} - ${new Date(record.weekEnd).toLocaleDateString()})`);
      doc.fontSize(12).text(`Status: ${record.status}`);
      doc.moveDown();
      doc.fontSize(12).text("Activities:", { underline: true });
      doc.fontSize(11).text(record.activities || "No activities recorded.");
      doc.moveDown(2);
    }

    doc.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = {
  listMyRecords,
  createRecord,
  updateRecord,
  requestUnlock,
  listStudentRecords,
  unlockRecord,
  generatePdfReport,
};
