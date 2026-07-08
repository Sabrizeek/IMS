const mongoose = require("mongoose");

const studentSemesterGPASchema = new mongoose.Schema(
  {
    registrationNo: { type: String, required: true, trim: true, uppercase: true },
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Semester",
      required: true,
    },
    semesterGPA: { type: Number, required: true },
    totalCredits: { type: Number, required: true },
    calculatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Compound unique: one GPA record per student per semester
studentSemesterGPASchema.index({ registrationNo: 1, semesterId: 1 }, { unique: true });

module.exports = mongoose.model("StudentSemesterGPA", studentSemesterGPASchema);
