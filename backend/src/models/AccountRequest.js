const mongoose = require("mongoose");

const accountRequestSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true },
    studentId: { type: String, required: true, trim: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    tempPassword: { type: String, trim: true },
    notes: { type: String }, // Rejection reason
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AccountRequest", accountRequestSchema);
