/**
 * gpaCalculator.js
 * Core GPA/CGPA calculation utility for the GPA Management Module.
 *
 * Rules:
 * - MC grade: EXCLUDED from both numerator and denominator (as if never attempted).
 * - Grades E, E*, F: count as 0.0 grade points but ARE included in credit denominator.
 * - Semester GPA uses only records where isLatestAttempt = true for that semester.
 * - CGPA uses weighted average of per-semester GPAs.
 */

/** @type {Record<string, number>} Grade → grade point mapping (4.0 scale) */
const GRADE_POINT_TABLE = {
  "A+": 4.0,
  "A":  4.0,
  "A-": 3.7,
  "B+": 3.3,
  "B":  3.0,
  "B-": 2.7,
  "C+": 2.3,
  "C":  2.0,
  "C-": 1.7,
  "D+": 1.3,
  "D":  1.0,
  "E":  0.0,
  "E*": 0.0,
  "F":  0.0,
  "MC": 0.0,    // Excluded from calculations entirely — see MC_GRADE constant
};

const MC_GRADE = "MC";

/**
 * Get the grade point for a grade string.
 * Returns null for unknown grades.
 * @param {string} grade
 * @returns {number|null}
 */
function getGradePoint(grade) {
  if (grade === undefined || grade === null) return null;
  const key = grade.toString().trim().toUpperCase();
  return key in GRADE_POINT_TABLE ? GRADE_POINT_TABLE[key] : null;
}

/**
 * Calculate semester GPA from an array of result rows.
 *
 * MC rule: any row with grade === 'MC' is skipped entirely (credits and points).
 * All other grades (including E, E*, F) contribute credits to the denominator.
 *
 * @param {Array<{ grade: string, credits: number, gradePoint: number }>} rows
 *   Each row must have grade, credits, and gradePoint pre-populated.
 *   Only rows where isLatestAttempt === true should be passed in.
 * @returns {{ semesterGPA: number, totalCredits: number }}
 */
function calculateSemesterGPA(rows) {
  let weightedSum = 0;
  let totalCredits = 0;

  for (const row of rows) {
    if (!row || row.grade === undefined) continue;

    const grade = row.grade.toString().trim().toUpperCase();

    // MC RULE: Skip completely — no credit weight, no grade point contribution
    if (grade === MC_GRADE) continue;

    const credits = Number(row.credits) || 0;
    const gp = Number(row.gradePoint);

    if (credits <= 0 || isNaN(gp)) continue;

    weightedSum += credits * gp;
    totalCredits += credits;
  }

  const semesterGPA = totalCredits > 0
    ? Math.round((weightedSum / totalCredits) * 10000) / 10000
    : 0;

  return { semesterGPA, totalCredits };
}

/**
 * Calculate CGPA from an array of per-semester GPA summaries.
 *
 * Formula: Σ(semesterGPA × totalCredits) / Σ(totalCredits)
 *
 * @param {Array<{ semesterGPA: number, totalCredits: number }>} semesterGPAs
 *   Each entry is a StudentSemesterGPA record (published semesters only).
 * @returns {{ cgpa: number, totalCredits: number }}
 */
function calculateCGPA(semesterGPAs) {
  let weightedSum = 0;
  let totalCredits = 0;

  for (const sem of semesterGPAs) {
    const credits = Number(sem.totalCredits) || 0;
    const gpa = Number(sem.semesterGPA) || 0;

    if (credits <= 0) continue;

    weightedSum += gpa * credits;
    totalCredits += credits;
  }

  const cgpa = totalCredits > 0
    ? Math.round((weightedSum / totalCredits) * 10000) / 10000
    : 0;

  return { cgpa, totalCredits };
}

/**
 * Resolve the grade point for a given grade string.
 * Exported so the upload controller can use it when building StudentResult docs.
 *
 * @param {string} grade
 * @returns {number}  Returns 0 for MC/E/E-star/F/unknown.
 */
function resolveGradePoint(grade) {
  const gp = getGradePoint(grade);
  return gp !== null ? gp : 0;
}

module.exports = {
  GRADE_POINT_TABLE,
  MC_GRADE,
  getGradePoint,
  resolveGradePoint,
  calculateSemesterGPA,
  calculateCGPA,
};
