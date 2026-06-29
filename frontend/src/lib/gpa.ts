import type { Grade, Semester, SubjectRow } from "./types";

/**
 * Grade → grade-point mapping (Sri Lankan university 4.0 scale,
 * matching the University of Ruhuna convention).
 */
export const GRADE_POINTS: Record<Grade, number> = {
  "A+": 4.0,
  A: 4.0,
  "A-": 3.7,
  "B+": 3.3,
  B: 3.0,
  "B-": 2.7,
  "C+": 2.3,
  C: 2.0,
  "C-": 1.7,
  D: 1.0,
  E: 0.0,
};

export const GRADES = Object.keys(GRADE_POINTS) as Grade[];

/** A row counts toward the GPA only once it has a credit value and a grade. */
export function isGraded(
  row: SubjectRow,
): row is SubjectRow & { grade: Grade } {
  return row.grade !== "" && Number(row.credit) > 0;
}

function allGradedRows(semesters: Semester[]): Array<SubjectRow & { grade: Grade }> {
  return semesters.flatMap((s) => s.rows.filter(isGraded));
}

/** Weighted cumulative GPA across every graded row (Σ credit·point / Σ credit). */
export function calculateGpa(semesters: Semester[]): number {
  const rows = allGradedRows(semesters);
  const credits = rows.reduce((sum, r) => sum + Number(r.credit), 0);
  if (credits === 0) return 0;
  const weighted = rows.reduce(
    (sum, r) => sum + Number(r.credit) * GRADE_POINTS[r.grade],
    0,
  );
  return weighted / credits;
}

/** Total credits earned (graded rows only). */
export function totalCredits(semesters: Semester[]): number {
  return allGradedRows(semesters).reduce((sum, r) => sum + Number(r.credit), 0);
}

/** GPA for a single semester. */
export function semesterGpa(semester: Semester): number {
  return calculateGpa([semester]);
}

/** A friendly classification for the computed GPA. */
export function classify(gpa: number): string {
  if (gpa >= 3.7) return "First Class";
  if (gpa >= 3.3) return "Second Class (Upper)";
  if (gpa >= 3.0) return "Second Class (Lower)";
  if (gpa >= 2.0) return "General Pass";
  return "Below Pass";
}
