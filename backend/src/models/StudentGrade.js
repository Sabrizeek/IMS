const mongoose = require("mongoose");

const gradeRowSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    code: { type: String, trim: true },
    credit: { type: Number, default: 0 },
    grade: {
      type: String,
      enum: ["", "A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "E"],
      default: "",
    },
  },
  { _id: false },
);

const semesterSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    rows: { type: [gradeRowSchema], default: [] },
  },
  { _id: false },
);

const studentGradeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, required: true },
    semesters: { type: [semesterSchema], default: [] },
    gpa: { type: Number, default: 0 },
    totalCredits: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("StudentGrade", studentGradeSchema);
