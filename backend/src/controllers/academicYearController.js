const mongoose = require("mongoose");
const AcademicYear = require("../models/AcademicYear");
const Semester = require("../models/Semester");

// ─── LIST ──────────────────────────────────────────────────────────────────
async function listAcademicYears(_req, res) {
  try {
    const years = await AcademicYear.find().sort({ year: -1 });
    res.json({ academicYears: years });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ─── CREATE ────────────────────────────────────────────────────────────────
async function createAcademicYear(req, res) {
  try {
    const { year } = req.body;
    if (!year) return res.status(400).json({ message: "year is required" });
    const existing = await AcademicYear.findOne({ year });
    if (existing) return res.status(409).json({ message: "Academic year already exists" });
    const doc = await AcademicYear.create({ year });
    res.status(201).json({ academicYear: doc });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ─── UPDATE ────────────────────────────────────────────────────────────────
async function updateAcademicYear(req, res) {
  try {
    const doc = await AcademicYear.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Academic year not found" });
    if (doc.isLocked) return res.status(423).json({ message: "Academic year is locked and cannot be edited" });
    const { year } = req.body;
    if (year) doc.year = year;
    await doc.save();
    res.json({ academicYear: doc });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ─── DELETE ────────────────────────────────────────────────────────────────
async function deleteAcademicYear(req, res) {
  try {
    const doc = await AcademicYear.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Academic year not found" });
    if (doc.isLocked) return res.status(423).json({ message: "Academic year is locked and cannot be deleted" });
    const childCount = await Semester.countDocuments({ academicYearId: doc._id });
    if (childCount > 0) return res.status(409).json({ message: "Cannot delete: semesters exist under this academic year" });
    await AcademicYear.deleteOne({ _id: doc._id });
    res.json({ message: "Academic year deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { listAcademicYears, createAcademicYear, updateAcademicYear, deleteAcademicYear };
