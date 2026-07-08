const mongoose = require("mongoose");

const semesterSchema = new mongoose.Schema(
  {
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
    },
    semesterNumber: { type: Number, required: true },
    label: { type: String, trim: true },
    isLocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound unique index: one semester number per academic year
semesterSchema.index({ academicYearId: 1, semesterNumber: 1 }, { unique: true });

module.exports = mongoose.model("Semester", semesterSchema);
