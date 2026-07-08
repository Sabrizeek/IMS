const mongoose = require("mongoose");

const VALID_GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "E", "E*", "F", "MC"];

const studentResultSchema = new mongoose.Schema(
  {
    registrationNo: { type: String, required: true, trim: true, uppercase: true },
    studentName: { type: String, trim: true },
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Semester",
      required: true,
    },
    subjectCode: { type: String, required: true, trim: true, uppercase: true },
    credits: { type: Number, required: true },
    grade: { type: String, required: true, enum: VALID_GRADES },
    gradePoint: { type: Number, required: true },
    isLatestAttempt: { type: Boolean, default: true },
    resultUploadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ResultUpload",
      required: true,
    },
  },
  { timestamps: true }
);

// Index for repeat-module lookup and CGPA calculation
studentResultSchema.index({ registrationNo: 1, semesterId: 1, subjectCode: 1, isLatestAttempt: 1 });

module.exports = mongoose.model("StudentResult", studentResultSchema);
