/**
 * gpaCalculator.test.js
 *
 * Standalone Node.js test script — NO external test framework needed.
 * Run with:  node src/utils/gpaCalculator.test.js
 *
 * Tests:
 *  1. Grade point table spot-checks
 *  2. Semester GPA basic calculation
 *  3. MC exclusion rule (MC rows must not affect denominator or numerator)
 *  4. F grade DOES count in denominator (0 GP, positive credits)
 *  5. CGPA weighted average across semesters
 *  6. Edge cases: empty arrays, all-MC semester
 *  7. Schema compile check (Mongoose models load without error)
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const {
  GRADE_POINT_TABLE,
  getGradePoint,
  resolveGradePoint,
  calculateSemesterGPA,
  calculateCGPA,
} = require("./gpaCalculator");

// --------------------------------------------------------------------------
// Mini test harness
// --------------------------------------------------------------------------
let passed = 0;
let failed = 0;

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✅ PASS  ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL  ${label}${detail ? `  →  ${detail}` : ""}`);
    failed++;
  }
}

function assertClose(label, actual, expected, tolerance = 0.0001) {
  const ok = Math.abs(actual - expected) <= tolerance;
  assert(label, ok, `expected ${expected}, got ${actual}`);
}

// --------------------------------------------------------------------------
// 1. Grade point table spot-checks
// --------------------------------------------------------------------------
console.log("\n── 1. Grade Point Table ──────────────────────────────────");
assert("A+  = 4.0", getGradePoint("A+")  === 4.0);
assert("A   = 4.0", getGradePoint("A")   === 4.0);
assert("A-  = 3.7", getGradePoint("A-")  === 3.7);
assert("B+  = 3.3", getGradePoint("B+")  === 3.3);
assert("B   = 3.0", getGradePoint("B")   === 3.0);
assert("B-  = 2.7", getGradePoint("B-")  === 2.7);
assert("C+  = 2.3", getGradePoint("C+")  === 2.3);
assert("C   = 2.0", getGradePoint("C")   === 2.0);
assert("C-  = 1.7", getGradePoint("C-")  === 1.7);
assert("D+  = 1.3", getGradePoint("D+")  === 1.3);
assert("D   = 1.0", getGradePoint("D")   === 1.0);
assert("E   = 0.0", getGradePoint("E")   === 0.0);
assert("E*  = 0.0", getGradePoint("E*")  === 0.0);
assert("F   = 0.0", getGradePoint("F")   === 0.0);
assert("MC  = 0.0", getGradePoint("MC")  === 0.0);
assert("unknown returns null", getGradePoint("Z") === null);
assert("resolveGradePoint(null-like) returns 0", resolveGradePoint("UNKNOWN") === 0);

// --------------------------------------------------------------------------
// 2. Semester GPA: basic calculation (no MC)
// --------------------------------------------------------------------------
console.log("\n── 2. Semester GPA — Basic ───────────────────────────────");
// Maths: (3×4.0 + 3×3.7 + 2×3.0) / (3+3+2) = (12 + 11.1 + 6) / 8 = 29.1 / 8 = 3.6375
const rows1 = [
  { grade: "A+", credits: 3, gradePoint: 4.0 },
  { grade: "A-", credits: 3, gradePoint: 3.7 },
  { grade: "B",  credits: 2, gradePoint: 3.0 },
];
const r1 = calculateSemesterGPA(rows1);
assertClose("GPA correct (3.6375)", r1.semesterGPA, 3.6375);
assert("totalCredits = 8", r1.totalCredits === 8);

// --------------------------------------------------------------------------
// 3. MC Exclusion Rule — MC must NOT appear in denominator or numerator
// --------------------------------------------------------------------------
console.log("\n── 3. MC Exclusion Rule ──────────────────────────────────");
// If MC subject (credits=3) is excluded:
// Remaining: A+(3) + A-(3) + B(2) → same as test 2: GPA = 3.6375, totalCredits = 8
const rows2 = [
  { grade: "A+", credits: 3, gradePoint: 4.0 },
  { grade: "A-", credits: 3, gradePoint: 3.7 },
  { grade: "B",  credits: 2, gradePoint: 3.0 },
  { grade: "MC", credits: 3, gradePoint: 0.0 }, // Must be excluded
];
const r2 = calculateSemesterGPA(rows2);
assertClose("GPA unchanged by MC row (3.6375)", r2.semesterGPA, 3.6375);
assert("totalCredits unchanged by MC (still 8, not 11)", r2.totalCredits === 8);

// Verify: if MC were included incorrectly: (29.1 + 0) / 11 = 2.645...
assert("GPA is NOT the wrong value 2.6455 (MC included wrongly)", Math.abs(r2.semesterGPA - 2.6455) > 0.01);

// All-MC semester
console.log("\n── 3b. All-MC Semester ───────────────────────────────────");
const allMC = [
  { grade: "MC", credits: 3, gradePoint: 0.0 },
  { grade: "MC", credits: 2, gradePoint: 0.0 },
];
const r2b = calculateSemesterGPA(allMC);
assert("All-MC → GPA = 0", r2b.semesterGPA === 0);
assert("All-MC → totalCredits = 0", r2b.totalCredits === 0);

// --------------------------------------------------------------------------
// 4. F grade DOES count in denominator (0 GP)
// --------------------------------------------------------------------------
console.log("\n── 4. F Grade Counts in Denominator ─────────────────────");
// A+(3) + F(3) = (3×4.0 + 3×0.0) / 6 = 12/6 = 2.0
const rows3 = [
  { grade: "A+", credits: 3, gradePoint: 4.0 },
  { grade: "F",  credits: 3, gradePoint: 0.0 },
];
const r3 = calculateSemesterGPA(rows3);
assertClose("A+ + F → GPA = 2.0", r3.semesterGPA, 2.0);
assert("totalCredits = 6 (F included)", r3.totalCredits === 6);

// --------------------------------------------------------------------------
// 5. CGPA weighted average
// --------------------------------------------------------------------------
console.log("\n── 5. CGPA Calculation ───────────────────────────────────");
// Sem 1: GPA=3.6, credits=16
// Sem 2: GPA=3.2, credits=18
// Sem 3: GPA=3.8, credits=14
// CGPA = (3.6×16 + 3.2×18 + 3.8×14) / (16+18+14)
//      = (57.6  + 57.6   + 53.2)  / 48
//      = 168.4 / 48
//      = 3.50833...
const semGPAs = [
  { semesterGPA: 3.6, totalCredits: 16 },
  { semesterGPA: 3.2, totalCredits: 18 },
  { semesterGPA: 3.8, totalCredits: 14 },
];
const { cgpa, totalCredits: cgpaCredits } = calculateCGPA(semGPAs);
assertClose("CGPA = 3.5083", cgpa, 168.4 / 48);
assert("CGPA totalCredits = 48", cgpaCredits === 48);

// CGPA with a zero-credit semester (should be skipped)
console.log("\n── 5b. CGPA skips zero-credit semesters ─────────────────");
const semGPAs2 = [
  { semesterGPA: 3.6, totalCredits: 16 },
  { semesterGPA: 0.0, totalCredits: 0  },  // all-MC semester
  { semesterGPA: 3.2, totalCredits: 18 },
];
// CGPA = (3.6×16 + 3.2×18) / (16+18) = (57.6 + 57.6) / 34 = 115.2 / 34 = 3.38823...
const { cgpa: cgpa2 } = calculateCGPA(semGPAs2);
assertClose("CGPA skips 0-credit semester", cgpa2, 115.2 / 34);

// --------------------------------------------------------------------------
// 6. Edge cases
// --------------------------------------------------------------------------
console.log("\n── 6. Edge Cases ─────────────────────────────────────────");
assert("Empty rows → GPA = 0", calculateSemesterGPA([]).semesterGPA === 0);
assert("Empty rows → credits = 0", calculateSemesterGPA([]).totalCredits === 0);
assert("Empty semesters → CGPA = 0", calculateCGPA([]).cgpa === 0);

// --------------------------------------------------------------------------
// 7. Schema compile check
// --------------------------------------------------------------------------
console.log("\n── 7. Mongoose Model Compile Check ──────────────────────");
try {
  require("../models/AcademicYear");
  assert("AcademicYear model loads", true);
} catch (e) { assert("AcademicYear model loads", false, e.message); }

try {
  require("../models/Semester");
  assert("Semester model loads", true);
} catch (e) { assert("Semester model loads", false, e.message); }

try {
  require("../models/GpaSubject");
  assert("GpaSubject model loads", true);
} catch (e) { assert("GpaSubject model loads", false, e.message); }

try {
  require("../models/ResultUpload");
  assert("ResultUpload model loads", true);
} catch (e) { assert("ResultUpload model loads", false, e.message); }

try {
  require("../models/StudentResult");
  assert("StudentResult model loads", true);
} catch (e) { assert("StudentResult model loads", false, e.message); }

try {
  require("../models/StudentSemesterGPA");
  assert("StudentSemesterGPA model loads", true);
} catch (e) { assert("StudentSemesterGPA model loads", false, e.message); }

try {
  require("../models/StudentCGPA");
  assert("StudentCGPA model loads", true);
} catch (e) { assert("StudentCGPA model loads", false, e.message); }

// Verify legacy models still load
try {
  require("../models/StudentGrade");
  assert("Legacy StudentGrade model still loads (untouched)", true);
} catch (e) { assert("Legacy StudentGrade model still loads (untouched)", false, e.message); }

try {
  require("../models/Subject");
  assert("Legacy Subject model still loads (untouched)", true);
} catch (e) { assert("Legacy Subject model still loads (untouched)", false, e.message); }

// --------------------------------------------------------------------------
// Summary
// --------------------------------------------------------------------------
console.log("\n═══════════════════════════════════════════════════════");
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("═══════════════════════════════════════════════════════\n");

if (failed > 0) process.exit(1);
