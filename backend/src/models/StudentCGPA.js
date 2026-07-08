const mongoose = require("mongoose");

const studentCGPASchema = new mongoose.Schema(
  {
    registrationNo: { type: String, required: true, unique: true, trim: true, uppercase: true },
    cgpa: { type: Number, required: true },
    calculatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

module.exports = mongoose.model("StudentCGPA", studentCGPASchema);
