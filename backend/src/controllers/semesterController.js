const Semester = require("../models/Semester");
const AcademicYear = require("../models/AcademicYear");
const GpaSubject = require("../models/GpaSubject");

// ─── LIST ──────────────────────────────────────────────────────────────────
async function listSemesters(req, res) {
  try {
    const filter = {};
    if (req.query.academicYearId) filter.academicYearId = req.query.academicYearId;
    const semesters = await Semester.find(filter)
      .populate("academicYearId", "year isLocked")
      .sort({ semesterNumber: 1 });
    res.json({ semesters });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ─── CREATE ────────────────────────────────────────────────────────────────
async function createSemester(req, res) {
  try {
    const { academicYearId, semesterNumber, label } = req.body;
    if (!academicYearId || semesterNumber == null)
      return res.status(400).json({ message: "academicYearId and semesterNumber are required" });

    const year = await AcademicYear.findById(academicYearId);
    if (!year) return res.status(404).json({ message: "Academic year not found" });
    if (year.isLocked) return res.status(423).json({ message: "Parent academic year is locked" });

    const doc = await Semester.create({ academicYearId, semesterNumber, label });
    res.status(201).json({ semester: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "Semester number already exists for this academic year" });
    res.status(500).json({ message: err.message });
  }
}

// ─── UPDATE ────────────────────────────────────────────────────────────────
async function updateSemester(req, res) {
  try {
    const doc = await Semester.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Semester not found" });
    if (doc.isLocked) return res.status(423).json({ message: "Semester is locked and cannot be edited" });

    const { label, semesterNumber } = req.body;
    if (label !== undefined) doc.label = label;
    if (semesterNumber !== undefined) doc.semesterNumber = semesterNumber;
    await doc.save();
    res.json({ semester: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "Semester number already exists for this academic year" });
    res.status(500).json({ message: err.message });
  }
}

// ─── DELETE ────────────────────────────────────────────────────────────────
async function deleteSemester(req, res) {
  try {
    const doc = await Semester.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Semester not found" });
    if (doc.isLocked) return res.status(423).json({ message: "Semester is locked and cannot be deleted" });
    const childCount = await GpaSubject.countDocuments({ semesterId: doc._id });
    if (childCount > 0) return res.status(409).json({ message: "Cannot delete: subjects exist in this semester" });
    await Semester.deleteOne({ _id: doc._id });
    res.json({ message: "Semester deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { listSemesters, createSemester, updateSemester, deleteSemester };
