const StudentProfile = require("../models/StudentProfile");
const User = require("../models/User");

async function getMe(req, res) {
  const profile =
    req.user.role === "student"
      ? await StudentProfile.findOne({ user: req.user._id })
      : req.user.role === "department"
        ? req.user.departmentProfile
        : null;
  res.json({ profile });
}

async function upsertMe(req, res) {
  if (req.user.role !== "student" && req.user.role !== "department") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const update = req.body;
    let profile;
    if (req.user.role === "student") {
      const existingProfile = await StudentProfile.findOne({ user: req.user._id });
      if (existingProfile && existingProfile.specializationConfirmed) {
        delete update.specialization;
        delete update.specializationConfirmed;
      }
      profile = await StudentProfile.findOneAndUpdate(
        { user: req.user._id },
        { $set: update },
        { new: true, upsert: true }
      );
    } else {
      profile = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { departmentProfile: update } },
        { new: true }
      ).select("-password");
    }
  res.json({ profile });
}

async function getDepartmentProfile(req, res) {
  const department = await User.findById(req.user._id).select("departmentProfile email role");
  if (!department) return res.status(404).json({ message: "Department profile not found" });
  res.json({ profile: department.departmentProfile || {} });
}

async function updateDepartmentProfile(req, res) {
  const department = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { departmentProfile: req.body } },
    { new: true },
  ).select("-password");
  if (!department) return res.status(404).json({ message: "Department profile not found" });
  res.json({ profile: department.departmentProfile || {} });
}

module.exports = { getMe, upsertMe, getDepartmentProfile, updateDepartmentProfile };
