const mongoose = require("mongoose");

const monthlyRecordSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    monthNumber: { type: Number, required: true },
    monthStart: { type: Date, required: true },
    monthEnd: { type: Date, required: true },
    filePath: { type: String, default: "" },
    originalFilename: { type: String, default: "" },
    isLateSubmission: { type: Boolean, default: false },
    status: { type: String, enum: ["Pending", "Submitted", "Missing"], default: "Pending" },
    submittedAt: { type: Date },
  },
  { timestamps: true }
);

monthlyRecordSchema.index({ user: 1, monthNumber: 1 }, { unique: true });

module.exports = mongoose.model("MonthlyRecord", monthlyRecordSchema);
