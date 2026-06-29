const mongoose = require("mongoose");

const weeklyRecordSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    weekNumber: { type: Number, required: true },
    weekStart: { type: Date, required: true },
    weekEnd: { type: Date, required: true },
    activities: { type: String, default: "" }, // Used as Tasks Completed
    challengesEncountered: { type: String, default: "" },
    reflections: { type: String, default: "" },
    skillsGained: { type: [String], default: [] },
    status: { type: String, enum: ["Draft", "Edited", "Submitted"], default: "Draft" },
    unlockRequested: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    submittedAt: { type: Date },
    versionHistory: [
      {
        activities: String,
        updatedAt: { type: Date, default: Date.now },
      }
    ],
  },
  { timestamps: true },
);

// Compound index to ensure uniqueness of weekNumber per student
weeklyRecordSchema.index({ user: 1, weekNumber: 1 }, { unique: true });

module.exports = mongoose.model("WeeklyRecord", weeklyRecordSchema);
