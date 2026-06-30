const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const StudentGrade = require("../models/StudentGrade");
const AccountRequest = require("../models/AccountRequest");
const InternshipApplication = require("../models/InternshipApplication");

async function listStudents(_req, res) {
  try {
    const users = await User.find({ role: "student" }).select("-password").sort({ createdAt: -1 });
    // Fetch all student profiles to add specialization, GPA, and internship status
    const studentData = await Promise.all(
      users.map(async (user) => {
        const profile = await StudentProfile.findOne({ user: user._id });
        const grades = await StudentGrade.findOne({ user: user._id });
        const placement = await InternshipApplication.findOne({ user: user._id });
        
        let status = "Not Selected";
        if (placement) {
          if (placement.approved) {
            status = "Approved";
          } else if (placement.state === "selected") {
            status = "Pending Approval";
          } else if (placement.state === "notSelected") {
            status = "Not Selected";
          }
        }

        return {
          id: user._id,
          name: profile?.name || `${user.firstName} ${user.lastName ?? ""}`.trim(),
          studentId: user.studentId,
          email: user.email,
          specialization: profile?.specialization || "",
          specializationConfirmed: profile?.specializationConfirmed || false,
          gpa: grades?.gpa || 0,
          totalCredits: grades?.totalCredits || 0,
          internshipStatus: status,
          linkedin: profile?.linkedin || "",
          github: profile?.github || "",
          projects: profile?.projects || [],
          photo: profile?.photo || "",
          cvFileName: profile?.cvFileName || "",
          cvMimeType: profile?.cvMimeType || "",
          cvDataUrl: profile?.cvDataUrl || "",
          certificationsFileName: profile?.certificationsFileName || "",
          certificationsMimeType: profile?.certificationsMimeType || "",
          certificationsDataUrl: profile?.certificationsDataUrl || "",
          additionalItemsFileName: profile?.additionalItemsFileName || "",
          additionalItemsMimeType: profile?.additionalItemsMimeType || "",
          additionalItemsDataUrl: profile?.additionalItemsDataUrl || "",
        };
      })
    );
    res.json({ students: studentData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getStudentById(req, res) {
  try {
    const student = await User.findById(req.params.id).select("-password");
    if (!student) return res.status(404).json({ message: "Student not found" });

    const profile = await StudentProfile.findOne({ user: req.params.id });
    const grades = await StudentGrade.findOne({ user: req.params.id });
    const placement = await InternshipApplication.findOne({ user: req.params.id });
    const Portfolio = require("../models/Portfolio");
    const portfolio = await Portfolio.findOne({ user: req.params.id });

    res.json({ student, profile, grades, placement, portfolio });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getDashboardStats(req, res) {
  try {
    const registrationRequestsCount = await AccountRequest.countDocuments({ status: "pending" });
    const activeStudentsCount = await StudentProfile.countDocuments({ specializationConfirmed: true });
    const pendingApprovalsCount = await InternshipApplication.countDocuments({ approved: false, state: "selected" });

    res.json({
      registrationRequestsCount,
      activeStudentsCount,
      pendingApprovalsCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = { listStudents, getStudentById, getDashboardStats };
