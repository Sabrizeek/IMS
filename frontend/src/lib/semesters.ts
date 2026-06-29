import type { Semester, SubjectRow } from "./types";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

export function newRow(): SubjectRow {
  return { id: crypto.randomUUID(), code: "", credit: "", grade: "" };
}

export function newSemester(index: number): Semester {
  return {
    id: crypto.randomUUID(),
    name: `Semester ${ROMAN[index] ?? index + 1}`,
    rows: [newRow(), newRow(), newRow()],
  };
}

/** Default structure shown on first visit: five empty semesters. */
export function defaultSemesters(): Semester[] {
  return Array.from({ length: 5 }, (_, i) => newSemester(i));
}
