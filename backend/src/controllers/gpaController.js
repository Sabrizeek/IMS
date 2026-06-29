const StudentGrade = require("../models/StudentGrade");
const Subject = require("../models/Subject");

const GRADE_POINTS = {
  "A+": 4.0, A: 4.0, "A-": 3.7, "B+": 3.3, B: 3.0, "B-": 2.7, "C+": 2.3, C: 2.0, "C-": 1.7, D: 1.0, E: 0,
};

const VALID_GRADES = ["", "A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "E"];

function calculate(semesters = []) {
  const rows = semesters.flatMap((s) => s.rows || []).filter((r) => r.grade && Number(r.credit) > 0);
  const totalCredits = rows.reduce((sum, r) => sum + Number(r.credit), 0);
  const gpa = totalCredits === 0 ? 0 : rows.reduce((sum, r) => sum + Number(r.credit) * GRADE_POINTS[r.grade], 0) / totalCredits;
  return { gpa, totalCredits };
}

async function getMyGrades(req, res) {
  const doc = await StudentGrade.findOne({ user: req.user._id });
  res.json(doc || { semesters: [], gpa: 0, totalCredits: 0 });
}

async function saveMyGrades(req, res) {
  try {
    const semesters = Array.isArray(req.body.semesters) ? req.body.semesters : [];
    
    // Fetch all subjects to get correct credits
    const subjects = await Subject.find({});
    const subjectMap = {};
    subjects.forEach((s) => {
      subjectMap[s.code.toUpperCase()] = s.credits;
    });

    // Validate grades and enforce credits
    for (const semester of semesters) {
      if (semester.rows) {
        for (const row of semester.rows) {
          if (!VALID_GRADES.includes(row.grade)) {
            return res.status(400).json({ message: "Invalid Grade Entered" });
          }
          if (row.code) {
            const codeUpper = row.code.trim().toUpperCase();
            if (subjectMap[codeUpper] !== undefined) {
              row.credit = subjectMap[codeUpper];
            } else {
              row.credit = 0; // If unknown subject, credit is 0
            }
          } else {
            row.credit = 0;
          }
        }
      }
    }

    const summary = calculate(semesters);
    const doc = await StudentGrade.findOneAndUpdate(
      { user: req.user._id },
      { semesters, ...summary },
      { new: true, upsert: true },
    );
    res.json({ grades: doc, summary });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = { getMyGrades, saveMyGrades };
