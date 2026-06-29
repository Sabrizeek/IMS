const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["student", "department", "admin"], required: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    studentId: { type: String, trim: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    password: { type: String, required: true, select: false },
    mustResetPassword: { type: Boolean, default: false },
    departmentProfile: {
      fullName: { type: String, trim: true, default: "" },
      universityId: { type: String, trim: true, default: "" },
      designation: { type: String, trim: true, default: "" },
      academicTitle: { type: String, trim: true, default: "" },
      contactNumber: { type: String, trim: true, default: "" },
      email: { type: String, trim: true, lowercase: true, default: "" },
      photo: { type: String, default: "" },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
