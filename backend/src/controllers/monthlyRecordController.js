const MonthlyRecord = require("../models/MonthlyRecord");
const User = require("../models/User");
const InternshipApplication = require("../models/InternshipApplication");

async function listMyRecords(req, res) {
  try {
    const records = await MonthlyRecord.find({ user: req.user._id }).sort({ monthNumber: 1 });
    res.json({ records });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function createRecord(req, res) {
  try {
    const { monthNumber, monthStart, monthEnd } = req.body;
    
    // 1. Enforce internship approval
    const application = await InternshipApplication.findOne({ user: req.user._id });
    if (!application || !application.approved) {
      return res.status(400).json({ message: "Access denied. Internship has not been approved yet." });
    }

    if (!monthStart || !monthEnd) {
      return res.status(400).json({ message: "Start Date and End Date are required." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "PDF file is required." });
    }
    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ message: "Only PDF files are allowed." });
    }

    const internshipStartDate = application.internshipStartDate;
    const baseDate = new Date(internshipStartDate);
    
    // Monthly calculation (approx 4 weeks per month)
    const expectedStart = new Date(baseDate);
    expectedStart.setDate(baseDate.getDate() + (Number(monthNumber) - 1) * 28);
    const expectedEnd = new Date(expectedStart);
    expectedEnd.setDate(expectedStart.getDate() + 27);
    expectedStart.setHours(0,0,0,0);
    expectedEnd.setHours(23,59,59,999);

    const inputStart = new Date(monthStart);
    const inputEnd = new Date(monthEnd);
    inputStart.setHours(0,0,0,0);
    inputEnd.setHours(0,0,0,0);

    // Disable future months selection
    if (new Date() < expectedStart) {
      return res.status(400).json({ message: `Month ${monthNumber} is in the future and not yet available.` });
    }

    // Check if record already exists
    const existing = await MonthlyRecord.findOne({ user: req.user._id, monthNumber });
    if (existing) {
      return res.status(400).json({ message: "Record for this month already exists. Use PUT to edit." });
    }
    
    // Check deadline (Month End + 5 days)
    const deadline = new Date(expectedEnd);
    deadline.setDate(deadline.getDate() + 5);
    const isLateSubmission = new Date() > deadline;

    const record = await MonthlyRecord.create({
      user: req.user._id,
      monthNumber,
      monthStart: inputStart,
      monthEnd: inputEnd,
      filePath: req.file.path,
      originalFilename: req.file.originalname,
      isLateSubmission,
      status: "Submitted",
      submittedAt: new Date(),
    });

    res.status(201).json({ record });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function updateRecord(req, res) {
  try {
    const record = await MonthlyRecord.findOne({ _id: req.params.id, user: req.user._id });
    if (!record) return res.status(404).json({ message: "Monthly record not found" });

    // 1. Fetch approved internship
    const application = await InternshipApplication.findOne({ user: req.user._id });
    if (!application || !application.approved) {
      return res.status(400).json({ message: "Access denied. Internship not approved." });
    }
    
    const expectedEnd = new Date(record.monthEnd);
    expectedEnd.setHours(23,59,59,999);
    
    // Check deadline (Month End + 5 days)
    const deadline = new Date(expectedEnd);
    deadline.setDate(deadline.getDate() + 5);
    
    if (new Date() > deadline) {
      return res.status(400).json({ message: "Deadline has passed. You cannot re-upload the record." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "PDF file is required." });
    }
    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ message: "Only PDF files are allowed." });
    }
    
    record.filePath = req.file.path;
    record.originalFilename = req.file.originalname;
    record.submittedAt = new Date();
    // It's not late since they uploaded before deadline
    record.isLateSubmission = false;
    record.status = "Submitted";
    
    await record.save();

    res.json({ record });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function listStudentRecords(req, res) {
  try {
    const student = await User.findById(req.params.studentId);
    if (!student || student.role !== "student") return res.status(404).json({ message: "Student not found" });

    const records = await MonthlyRecord.find({ user: student._id }).sort({ monthNumber: 1 });
    // IMPORTANT: Only return safe fields to the department! Do NOT return filePath or file URL!
    const safeRecords = records.map(r => ({
      _id: r._id,
      monthNumber: r.monthNumber,
      monthStart: r.monthStart,
      monthEnd: r.monthEnd,
      isLateSubmission: r.isLateSubmission,
      status: r.status,
      submittedAt: r.submittedAt,
    }));
    
    res.json({ records: safeRecords });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = {
  listMyRecords,
  createRecord,
  updateRecord,
  listStudentRecords,
};
