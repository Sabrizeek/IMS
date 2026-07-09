const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const StudentCGPA = require("../models/StudentCGPA");
const AccountRequest = require("../models/AccountRequest");
const InternshipApplication = require("../models/InternshipApplication");

async function listStudents(_req, res) {
  try {
    const users = await User.find({ role: "student" }).select("-password").sort({ createdAt: -1 });
    // Fetch all student profiles to add specialization, GPA, and internship status
    const studentData = await Promise.all(
      users.map(async (user) => {
        const profile = await StudentProfile.findOne({ user: user._id });
        const cgpaDoc = await StudentCGPA.findOne({ registrationNo: (user.studentId || "").toUpperCase() });
        const placement = await InternshipApplication.findOne({ user: user._id });
        
        let status = "Not Selected";
        if (placement) {
          if (placement.approved) {
            status = "Selected";
          } else if (placement.rejectionReason) {
            status = "Not Selected";
          } else if (placement.state === "selected") {
            status = "Pending";
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
          gpa: cgpaDoc ? cgpaDoc.cgpa : 0,
          totalCredits: 0,
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
    const activeStudentsCount = await require("../models/User").countDocuments({ role: "student" });
    const pendingApprovalsCount = await InternshipApplication.countDocuments({ approved: false, state: "selected" });

    const { specialization, gpa, internType } = req.query;

    const pipeline = [
      {
        $lookup: {
          from: "studentprofiles",
          localField: "user",
          foreignField: "user",
          as: "profile"
        }
      },
      {
        $lookup: {
          from: "studentcgpas",
          let: { studentId: { $toUpper: { $arrayElemAt: ["$profile.studentId", 0] } } },
          pipeline: [
            { $match: { $expr: { $eq: ["$registrationNo", "$$studentId"] } } }
          ],
          as: "cgpa"
        }
      }
    ];

    const matchStage = {
      state: "selected",
      companyName: { $exists: true, $ne: "" },
      approved: true
    };

    if (specialization) {
      matchStage["profile.specialization"] = specialization;
    }

    if (internType) {
      matchStage["jobPosition"] = internType;
    }

    if (gpa) {
      if (gpa === "high") {
        matchStage["cgpa.cgpa"] = { $gte: 3.5 };
      } else if (gpa === "mid") {
        matchStage["cgpa.cgpa"] = { $gte: 3.0, $lt: 3.5 };
      } else if (gpa === "low") {
        matchStage["cgpa.cgpa"] = { $lt: 3.0 };
      }
    }

    pipeline.push({ $match: matchStage });
    pipeline.push({ 
      $group: { 
        _id: "$companyName", 
        count: { $sum: 1 },
        students: { 
          $push: { 
            name: { $arrayElemAt: ["$profile.name", 0] },
            position: "$jobPosition"
          } 
        }
      } 
    });
    pipeline.push({ $sort: { count: -1 } });
    pipeline.push({ $limit: 6 });

    const companyPlacements = await InternshipApplication.aggregate(pipeline);

    res.json({
      registrationRequestsCount,
      activeStudentsCount,
      pendingApprovalsCount,
      companyPlacements: companyPlacements.map(p => ({ 
        name: p._id, 
        count: p.count,
        students: p.students 
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = { listStudents, getStudentById, getDashboardStats };
