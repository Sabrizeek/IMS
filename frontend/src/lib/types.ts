export type Role = "student" | "department";

export interface StudentUser {
  role: "student";
  firstName: string;
  lastName: string;
  studentId: string;
  email: string;
}

export interface DepartmentUser {
  role: "department";
  email: string;
}

export type User = StudentUser | DepartmentUser;

export type Grade =
  | "A+"
  | "A"
  | "A-"
  | "B+"
  | "B"
  | "B-"
  | "C+"
  | "C"
  | "C-"
  | "D"
  | "E";

/** One subject row inside a semester. Grade "" = not yet graded. */
export interface SubjectRow {
  id: string;
  code: string;
  /** Kept as string for controlled inputs; coerced to number when calculating. */
  credit: string;
  grade: Grade | "";
}

/** A semester groups subject rows (matches the GPA Calculator accordions). */
export interface Semester {
  id: string;
  name: string;
  rows: SubjectRow[];
}

export const SPECIALIZATIONS = [
  "Computer Science",
  "Software Engineering",
  "Information Systems",
  "Data Science",
  "Cybersecurity",
  "Computer Engineering",
] as const;

export type Specialization = (typeof SPECIALIZATIONS)[number];

/** Editable department/administrator profile. */
export interface DepartmentProfile {
  fullName: string;
  universityId: string;
  designation: string;
  academicTitle: string;
  contactNumber: string;
  email: string;
  /** Data-URL of the uploaded headshot. */
  photo?: string;
}

/** Editable student profile (Academic Identity + Management Hub). */
export interface StudentProfile {
  name: string;
  studentId: string;
  email: string;
  specialization: Specialization | "";
  /** Locked once the student confirms it (cannot change afterwards). */
  specializationConfirmed: boolean;
  /** Data-URL of the uploaded headshot. */
  photo?: string;
  linkedin?: string;
  github?: string;
  projects?: Array<{
    id?: string;
    _id?: string;
    projectTitle: string;
    projectDescription: string;
    technologies: string[];
  }>;
  cvFileName?: string;
  cvMimeType?: string;
  cvDataUrl?: string;
  certificationsFileName?: string;
  certificationsMimeType?: string;
  certificationsDataUrl?: string;
  additionalItemsFileName?: string;
  additionalItemsMimeType?: string;
  additionalItemsDataUrl?: string;
}

export interface PortfolioData {
  projectTitle: string;
  projectDescription: string;
  technologies: string[];
  cvFileName: string;
  cvMimeType: string;
  cvDataUrl: string;
  savedAt: string;
}
