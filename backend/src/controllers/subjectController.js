const Subject = require("../models/Subject");

async function listSubjects(req, res) {
  try {
    const query = {};
    if (req.query.specialization) {
      query.specialization = req.query.specialization;
    }
    if (req.query.semester) {
      query.semester = { $regex: new RegExp(`^${req.query.semester.trim()}$`, "i") };
    }
    if (req.query.code) {
      // Direct exact match, or case-insensitive
      query.code = { $regex: new RegExp(`^${req.query.code.trim()}$`, "i") };
    }
    const subjects = await Subject.find(query).sort({ code: 1 });
    res.json({ subjects });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function createSubject(req, res) {
  try {
    const subject = await Subject.create(req.body);
    res.status(201).json({ subject });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = { listSubjects, createSubject };
