const mongoose = require("mongoose");

const academicYearSchema = new mongoose.Schema(
  {
    year: { type: String, required: true, unique: true, trim: true },
    isLocked: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

module.exports = mongoose.model("AcademicYear", academicYearSchema);
