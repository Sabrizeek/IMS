const mongoose = require("mongoose");

const portfolioFileSchema = new mongoose.Schema(
  {
    name: String,
    url: String,
    mimeType: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const studentProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, required: true },
    name: { type: String, trim: true },
    studentId: { type: String, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    specialization: { type: String, enum: ["", "Computer Science", "Software Engineering", "Information Systems", "Data Science", "Cybersecurity", "Computer Engineering"], default: "" },
    specializationConfirmed: { type: Boolean, default: false },
    photo: { type: String },
    linkedin: { type: String },
    github: { type: String },
    projects: [
      {
        projectTitle: String,
        projectDescription: String,
        technologies: [String],
      }
    ],
    cvFileName: String,
    cvMimeType: String,
    cvDataUrl: String,
    certificationsFileName: String,
    certificationsMimeType: String,
    certificationsDataUrl: String,
    additionalItemsFileName: String,
    additionalItemsMimeType: String,
    additionalItemsDataUrl: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("StudentProfile", studentProfileSchema);
