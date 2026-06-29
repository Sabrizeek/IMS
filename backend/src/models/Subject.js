const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, unique: true },
    name: { type: String, trim: true },
    credits: { type: Number, default: 0 },
    specialization: { type: String, trim: true },
    semester: { type: String, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Subject", subjectSchema);
