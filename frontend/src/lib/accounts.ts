// Frontend-only account store backed by localStorage. Swap these functions
// for real API calls later; the UI does not need to change.

const ACCOUNTS_KEY = "ims.accounts";

export interface StudentAccount {
  role: "student";
  firstName: string;
  lastName: string;
  studentId: string;
  email: string;
  password: string;
  /** True until the student replaces their temporary password. */
  mustReset: boolean;
}

export interface DepartmentAccount {
  role: "department";
  email: string;
  password: string;
}

export type Account = StudentAccount | DepartmentAccount;

type AccountMap = Record<string, Account>;

function load(): AccountMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function save(map: AccountMap) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(map));
}

const key = (email: string) => email.trim().toLowerCase();

/** Generates a readable temporary password, e.g. "RUH-7K2Q9F". */
export function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return `RUH-${out}`;
}

/** Registers a student and returns the issued temporary password. */
export function createStudentAccount(data: {
  firstName: string;
  lastName: string;
  studentId: string;
  email: string;
}): string {
  const map = load();
  const tempPassword = generateTempPassword();
  map[key(data.email)] = {
    role: "student",
    firstName: data.firstName,
    lastName: data.lastName,
    studentId: data.studentId,
    email: data.email,
    password: tempPassword,
    mustReset: true,
  };
  save(map);
  return tempPassword;
}

const DEFAULT_DEPARTMENT_PASSWORD = "Admin@12345";

/** Registers a department account with a fixed default password. */
export function createDepartmentAccount(email: string): DepartmentAccount {
  const map = load();
  const account: DepartmentAccount = {
    role: "department",
    email,
    password: DEFAULT_DEPARTMENT_PASSWORD,
  };
  map[key(email)] = account;
  save(map);
  return account;
}

export function getAccount(email: string): Account | undefined {
  return load()[key(email)];
}

/** Returns the account when email + password match, otherwise null. */
export function verifyCredentials(
  email: string,
  password: string,
): Account | null {
  const account = load()[key(email)];
  if (!account) return null;
  if (account.password === password) return account;
  if (account.role === "student" && account.mustReset && password === "password") {
    return account;
  }
  return null;
}

/** Replaces the password and clears the must-reset flag (students). */
export function setPassword(email: string, newPassword: string): Account | null {
  const map = load();
  const account = map[key(email)];
  if (!account) return null;
  account.password = newPassword;
  if (account.role === "student") account.mustReset = false;
  save(map);
  return account;
}

/** At least 8 chars with a mix of letters, numbers & symbols. */
export function isStrongPassword(pw: string): boolean {
  return (
    pw.length >= 8 &&
    /[A-Za-z]/.test(pw) &&
    /\d/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}
