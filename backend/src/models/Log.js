const mongoose = require("mongoose");

const logSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { 
      type: String, 
      required: true,
      enum: [
        "Registration Request", 
        "Registration Approval", 
        "Registration Rejection", 
        "Registration Deletion",
        "Unlock Request Submitted",
        "Unlock Request Approved",
        "Unlock Request Rejected",
        "Placement Approved",
        "Placement Rejected",
        "Record Book Access"
      ]
    },
    timestamp: { type: Date, default: Date.now },
    studentId: { type: String }, // Related student ID (if any)
  },
  { timestamps: true }
);

module.exports = mongoose.model("Log", logSchema);
