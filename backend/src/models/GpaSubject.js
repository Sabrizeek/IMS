const mongoose = require("mongoose");

/**
 * GPA Subject model — stores subjects belonging to a specific Semester document.
 * NOTE: This is a NEW model for the GPA Management module.
 * The existing Subject.js model (legacy) stores catalogue/specialization subjects
 * and is kept untouched.
 */
const gpaSubjectSchema = new mongoose.Schema(
  {
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Semester",
      required: true,
    },
    subjectCode: { type: String, required: true, trim: true, uppercase: true },
    subjectName: { type: String, required: true, trim: true },
    credits: { type: Number, required: true, min: 1 },
    subjectType: {
      type: String,
      enum: ["Core", "Optional"],
      required: true,
    },
  },
  { timestamps: true }
);

// Compound unique index: one subject code per semester
gpaSubjectSchema.index({ semesterId: 1, subjectCode: 1 }, { unique: true });

module.exports = mongoose.model("GpaSubject", gpaSubjectSchema);
