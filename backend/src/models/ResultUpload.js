const mongoose = require("mongoose");

const resultUploadSchema = new mongoose.Schema(
  {
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Semester",
      required: true,
    },
    fileName: { type: String, required: true, trim: true },
    filePath: { type: String, required: true, trim: true },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    uploadedAt: { type: Date, default: Date.now },
    recordCount: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ResultUpload", resultUploadSchema);
