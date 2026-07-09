const InternshipApplication = require("../models/InternshipApplication");
const User = require("../models/User");
const Log = require("../models/Log");
const StudentProfile = require("../models/StudentProfile");

async function listMine(req, res) {
  try {
    const application = await InternshipApplication.findOne({ user: req.user._id });
    res.json({ application });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function createMine(req, res) {
  try {
    const existing = await InternshipApplication.findOne({ user: req.user._id });

    const data = {
      user: req.user._id,
      state: req.body.state,
      companyName: req.body.state === "notSelected" ? "" : req.body.companyName,
      jobPosition: req.body.state === "notSelected" ? "" : req.body.jobPosition,
      internshipStartDate: req.body.state === "notSelected" ? undefined : req.body.internshipStartDate,
      duration: req.body.state === "notSelected" ? "" : req.body.duration,
      offerFileName: req.body.state === "notSelected" ? "" : req.body.offerFileName,
      offerMimeType: req.body.state === "notSelected" ? "" : req.body.offerMimeType,
      offerDataUrl: req.body.state === "notSelected" ? "" : req.body.offerDataUrl,
      submittedAt: req.body.state === "notSelected" ? undefined : (req.body.submittedAt ? new Date(req.body.submittedAt) : undefined),
      approved: false, // Reset approved when re-submitted
      rejectionReason: "", // Clear rejection reason on new submission
    };

    let application;
    if (existing) {
      application = await InternshipApplication.findOneAndUpdate(
        { user: req.user._id },
        { $set: data },
        { new: true }
      );
    } else {
      application = await InternshipApplication.create(data);
    }

    res.status(existing ? 200 : 201).json({ application });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function updateMine(req, res) {
  try {
    const updateData = { ...req.body };
    if (updateData.state === "notSelected") {
      updateData.companyName = "";
      updateData.jobPosition = "";
      updateData.internshipStartDate = undefined;
      updateData.duration = "";
      updateData.offerFileName = "";
      updateData.offerMimeType = "";
      updateData.offerDataUrl = "";
      updateData.submittedAt = undefined;
      updateData.approved = false;
      updateData.rejectionReason = "";
    }

    const application = await InternshipApplication.findOneAndUpdate(
      { user: req.user._id },
      { $set: updateData },
      { new: true }
    );
    if (!application) return res.status(404).json({ message: "Application not found" });
    res.json({ application });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function deleteMine(req, res) {
  try {
    await InternshipApplication.deleteOne({ user: req.user._id });
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function listAll(_req, res) {
  try {
    const applications = await InternshipApplication.find()
      .populate("user", "firstName lastName studentId email")
      .sort({ updatedAt: -1 });

    const studentIds = applications.map(app => app.user?._id).filter(id => id);
    const profiles = await StudentProfile.find({ user: { $in: studentIds } }).select("user photo");
    const photoMap = {};
    profiles.forEach(p => { photoMap[p.user.toString()] = p.photo; });
    
    // Format to align with department approvals table structure
    const formatted = applications.map(app => ({
      _id: app._id,
      student: `${app.user?.firstName || ""} ${app.user?.lastName || ""}`.trim(),
      id: app.user?.studentId || "",
      email: app.user?.email || "",
      studentUserId: app.user?._id || "", // Student Mongoose ID
      photo: app.user ? (photoMap[app.user._id.toString()] || "") : "",
      company: app.companyName || "",
      role: app.jobPosition || "",
      date: app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : "",
      status: app.approved ? "Approved" : app.rejectionReason ? "Rejected" : "Pending Review",
      offerFileName: app.offerFileName || "",
      offerMimeType: app.offerMimeType || "",
      internshipStartDate: app.internshipStartDate ? app.internshipStartDate.toISOString() : "",
      duration: app.duration || "",
      offerDataUrl: app.offerDataUrl || "",
      rejectionReason: app.rejectionReason || "",
    }));

    res.json({ applications: formatted });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function review(req, res) {
  try {
    const { approved, rejectionReason } = req.body;

    if (req.user.role !== "department" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Only Department can approve placements" });
    }

    const application = await InternshipApplication.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          approved,
          reviewedAt: new Date(),
          rejectionReason: approved ? "" : (rejectionReason || "Rejected by department.")
        }
      },
      { new: true }
    ).populate("user");

    if (!application) return res.status(404).json({ message: "Application not found" });

    // Log the audit actions
    const studentId = application.user?.studentId || "";
    await Log.create({
      userId: req.user._id,
      action: approved ? "Placement Approved" : "Placement Rejected",
      studentId: studentId,
    });

    res.json({ application });
  } catch (error) {
    console.error("Review Error:", error);
    res.status(500).json({ message: error.message });
  }
}

module.exports = { listMine, createMine, updateMine, deleteMine, listAll, review };
