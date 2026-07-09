const mongoose = require("mongoose");

const internshipApplicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    state: { type: String, enum: ["idle", "selected", "notSelected"], default: "idle" },
    companyName: { type: String, trim: true },
    jobPosition: { type: String, trim: true },
    internshipStartDate: { type: Date },
    duration: { type: String, trim: true },
    offerFileName: { type: String, trim: true },
    offerMimeType: { type: String, trim: true },
    offerDataUrl: { type: String }, // Store base64 Data URL or file upload path
    submittedAt: { type: Date },
    approved: { type: Boolean, default: false },
    rejectionReason: { type: String, trim: true },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model("InternshipApplication", internshipApplicationSchema);
