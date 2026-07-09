const GpaSubject = require("../models/GpaSubject");
const Semester = require("../models/Semester");
const StudentResult = require("../models/StudentResult");

// ─── LIST ──────────────────────────────────────────────────────────────────
async function listGpaSubjects(req, res) {
  try {
    const filter = {};
    if (req.query.semesterId) filter.semesterId = req.query.semesterId;
    const subjects = await GpaSubject.find(filter).sort({ subjectCode: 1 });
    res.json({ subjects });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ─── CREATE ────────────────────────────────────────────────────────────────
async function createGpaSubject(req, res) {
  try {
    const { semesterId, subjectCode, subjectName, credits, subjectType } = req.body;
    if (!semesterId || !subjectCode || !subjectName || !credits || !subjectType)
      return res.status(400).json({ message: "semesterId, subjectCode, subjectName, credits, and subjectType are required" });

    const sem = await Semester.findById(semesterId);
    if (!sem) return res.status(404).json({ message: "Semester not found" });
    if (sem.isLocked) return res.status(423).json({ message: "Parent semester is locked — cannot add subjects" });

    const doc = await GpaSubject.create({ semesterId, subjectCode, subjectName, credits, subjectType });
    res.status(201).json({ subject: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "Subject code already exists in this semester" });
    res.status(500).json({ message: err.message });
  }
}

// ─── UPDATE ────────────────────────────────────────────────────────────────
async function updateGpaSubject(req, res) {
  try {
    const doc = await GpaSubject.findById(req.params.id).populate("semesterId", "isLocked");
    if (!doc) return res.status(404).json({ message: "Subject not found" });
    if (doc.semesterId && doc.semesterId.isLocked)
      return res.status(423).json({ message: "Parent semester is locked — cannot edit subject" });

    const { subjectCode, subjectName, credits, subjectType } = req.body;
    if (subjectCode !== undefined) doc.subjectCode = subjectCode;
    if (subjectName !== undefined) doc.subjectName = subjectName;
    if (credits !== undefined) doc.credits = credits;
    if (subjectType !== undefined) doc.subjectType = subjectType;
    await doc.save();
    res.json({ subject: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "Subject code already exists in this semester" });
    res.status(500).json({ message: err.message });
  }
}

// ─── DELETE ────────────────────────────────────────────────────────────────
async function deleteGpaSubject(req, res) {
  try {
    const doc = await GpaSubject.findById(req.params.id).populate("semesterId", "isLocked");
    if (!doc) return res.status(404).json({ message: "Subject not found" });
    if (doc.semesterId && doc.semesterId.isLocked)
      return res.status(423).json({ message: "Parent semester is locked — cannot delete subject" });

    await GpaSubject.deleteOne({ _id: doc._id });
    res.json({ message: "Subject deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { listGpaSubjects, createGpaSubject, updateGpaSubject, deleteGpaSubject };
