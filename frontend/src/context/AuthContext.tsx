"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import type {
  DepartmentProfile,
  Semester,
  StudentProfile,
  User,
} from "@/lib/types";
import { defaultSemesters } from "@/lib/semesters";

const API_BASE = "http://localhost:5000/api";

const SEMESTERS_KEY = "ims.semesters";
const PROFILE_KEY = "ims.profile";
const DEPT_PROFILE_KEY = "ims.deptProfile";

interface AuthContextValue {
  user: User | null;
  ready: boolean;
  semesters: Semester[];
  profile: StudentProfile | null;
  deptProfile: DepartmentProfile | null;
  login: (user: User, token: string) => Promise<void>;
  logout: () => void;
  setSemesters: (semesters: Semester[]) => Promise<void>;
  setProfile: (profile: StudentProfile) => Promise<void>;
  setDeptProfile: (profile: DepartmentProfile) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Pure helpers — no React state needed
// ---------------------------------------------------------------------------
function getToken(role: "student" | "department"): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(`ims.${role}.token`);
}

function authHeaders(role: "student" | "department"): HeadersInit {
  const t = getToken(role);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function fetchProfileForUser(
  userRole: "student" | "department"
): Promise<{ profile: StudentProfile | null; deptProfile: DepartmentProfile | null }> {
  const res = await fetch(`${API_BASE}/profile/me`, { headers: authHeaders(userRole) });
  if (!res.ok) return { profile: null, deptProfile: null };
  const data = await res.json();
  if (userRole === "student") return { profile: data.profile ?? null, deptProfile: null };
  if (userRole === "department") return { profile: null, deptProfile: data.profile ?? null };
  return { profile: null, deptProfile: null };
}

async function fetchSemesters(): Promise<Semester[]> {
  try {
    const res = await fetch(`${API_BASE}/gpa/me`, { headers: authHeaders("student") });
    if (!res.ok) return defaultSemesters();
    const data = await res.json();
    return data.semesters?.length ? data.semesters : defaultSemesters();
  } catch {
    return defaultSemesters();
  }
}

// ---------------------------------------------------------------------------
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const roleContext = pathname?.startsWith("/department") ? "department" : "student";

  const [studentUser, setStudentUser] = useState<User | null>(null);
  const [deptUser, setDeptUser] = useState<User | null>(null);

  const [semesters, setSemestersState] = useState<Semester[]>([]);
  const [profile, setProfileState] = useState<StudentProfile | null>(null);
  const [deptProfile, setDeptProfileState] = useState<DepartmentProfile | null>(null);
  const [ready, setReady] = useState(false);

  // Expose the active user based on the route
  const user = roleContext === "department" ? deptUser : studentUser;

  // -------------------------------------------------------------------------
  // Hydrate on mount: load from sessionStorage first, then refresh from server
  // -------------------------------------------------------------------------
  useEffect(() => {
    async function hydrate() {
      try {
        // Hydrate Student
        const studentToken = sessionStorage.getItem("ims.student.token");
        const rawStudentUser = sessionStorage.getItem("ims.student.user");
        if (studentToken && rawStudentUser) {
          const parsedStudent: User = JSON.parse(rawStudentUser);
          setStudentUser(parsedStudent);

          const rawProfile = sessionStorage.getItem(PROFILE_KEY);
          const rawSemesters = sessionStorage.getItem(SEMESTERS_KEY);
          if (rawProfile) setProfileState(JSON.parse(rawProfile));
          setSemestersState(rawSemesters ? JSON.parse(rawSemesters) : defaultSemesters());

          // Refresh in background
          fetchProfileForUser("student").then(({ profile: freshProfile }) => {
            if (freshProfile) {
              setProfileState(freshProfile);
              sessionStorage.setItem(PROFILE_KEY, JSON.stringify(freshProfile));
            }
          }).catch(console.error);

          fetchSemesters().then((freshSemesters) => {
            setSemestersState(freshSemesters);
            sessionStorage.setItem(SEMESTERS_KEY, JSON.stringify(freshSemesters));
          }).catch(console.error);
        } else {
          setSemestersState(defaultSemesters());
        }

        // Hydrate Department
        const deptToken = sessionStorage.getItem("ims.department.token");
        const rawDeptUser = sessionStorage.getItem("ims.department.user");
        if (deptToken && rawDeptUser) {
          const parsedDept: User = JSON.parse(rawDeptUser);
          setDeptUser(parsedDept);

          const rawDept = sessionStorage.getItem(DEPT_PROFILE_KEY);
          if (rawDept) setDeptProfileState(JSON.parse(rawDept));

          // Refresh in background
          fetchProfileForUser("department").then(({ deptProfile: freshDept }) => {
            if (freshDept) {
              setDeptProfileState(freshDept);
              sessionStorage.setItem(DEPT_PROFILE_KEY, JSON.stringify(freshDept));
            }
          }).catch(console.error);
        }

        setReady(true);
      } catch (err) {
        console.error("Hydration error:", err);
        setSemestersState(defaultSemesters());
        setReady(true);
      }
    }

    hydrate();
  }, []);

  // -------------------------------------------------------------------------
  // login: store credentials, fetch profile, THEN mark ready
  // -------------------------------------------------------------------------
  const login = async (next: User, token: string) => {
    const isStudent = next.role === "student";
    const tokenKey = `ims.${next.role}.token`;
    const userKey = `ims.${next.role}.user`;

    // 1. Persist session to sessionStorage
    sessionStorage.setItem(tokenKey, token);
    sessionStorage.setItem(userKey, JSON.stringify(next));

    // 2. Fetch profile and semesters (token is now in sessionStorage, so authHeaders() works)
    const { profile: freshProfile, deptProfile: freshDept } =
      await fetchProfileForUser(next.role);

    let freshSemesters: Semester[] = defaultSemesters();
    if (isStudent) {
      freshSemesters = await fetchSemesters();
    }

    // 3. Commit all state at once
    if (isStudent) {
      setStudentUser(next);
      setProfileState(freshProfile);
      setSemestersState(freshSemesters);
      if (freshProfile) sessionStorage.setItem(PROFILE_KEY, JSON.stringify(freshProfile));
      sessionStorage.setItem(SEMESTERS_KEY, JSON.stringify(freshSemesters));
    } else {
      setDeptUser(next);
      setDeptProfileState(freshDept);
      if (freshDept) sessionStorage.setItem(DEPT_PROFILE_KEY, JSON.stringify(freshDept));
    }

    // 4. Now mark ready
    setReady(true);
  };

  // -------------------------------------------------------------------------
  // refreshProfile — usable from any page component
  // -------------------------------------------------------------------------
  const refreshProfile = async () => {
    // Only refresh the active context
    const role = roleContext;
    const token = getToken(role);
    const rawUser = sessionStorage.getItem(`ims.${role}.user`);
    if (!token || !rawUser) return;
    const parsedUser: User = JSON.parse(rawUser);

    const { profile: freshProfile, deptProfile: freshDept } =
      await fetchProfileForUser(parsedUser.role as "student" | "department");

    if (parsedUser.role === "student" && freshProfile) {
      setProfileState(freshProfile);
      sessionStorage.setItem(PROFILE_KEY, JSON.stringify(freshProfile));
    } else if (parsedUser.role === "department" && freshDept) {
      setDeptProfileState(freshDept);
      sessionStorage.setItem(DEPT_PROFILE_KEY, JSON.stringify(freshDept));
    }
  };

  // -------------------------------------------------------------------------
  // logout
  // -------------------------------------------------------------------------
  const logout = () => {
    const role = roleContext;
    
    if (role === "student") {
      setStudentUser(null);
      setProfileState(null);
      setSemestersState(defaultSemesters());
      sessionStorage.removeItem("ims.student.token");
      sessionStorage.removeItem("ims.student.user");
      sessionStorage.removeItem(PROFILE_KEY);
      sessionStorage.removeItem(SEMESTERS_KEY);
    } else {
      setDeptUser(null);
      setDeptProfileState(null);
      sessionStorage.removeItem("ims.department.token");
      sessionStorage.removeItem("ims.department.user");
      sessionStorage.removeItem(DEPT_PROFILE_KEY);
    }
  };

  // -------------------------------------------------------------------------
  // setSemesters / setProfile / setDeptProfile
  // -------------------------------------------------------------------------
  const setSemesters = async (next: Semester[]) => {
    setSemestersState(next);
    sessionStorage.setItem(SEMESTERS_KEY, JSON.stringify(next));
    try {
      await fetch(`${API_BASE}/gpa/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders("student") },
        body: JSON.stringify({ semesters: next }),
      });
    } catch (err) {
      console.error("Failed to save semesters:", err);
    }
  };

  const setProfile = async (next: StudentProfile) => {
    setProfileState(next);
    sessionStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    try {
      await fetch(`${API_BASE}/profile/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders("student") },
        body: JSON.stringify(next),
      });
    } catch (err) {
      console.error("Failed to save profile:", err);
    }
  };

  const setDeptProfile = async (next: DepartmentProfile) => {
    setDeptProfileState(next);
    sessionStorage.setItem(DEPT_PROFILE_KEY, JSON.stringify(next));
    try {
      await fetch(`${API_BASE}/profile/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders("department") },
        body: JSON.stringify(next),
      });
    } catch (err) {
      console.error("Failed to save department profile:", err);
    }
  };

  const value = useMemo(
    () => ({
      user,
      ready,
      semesters,
      profile,
      deptProfile,
      login,
      logout,
      setSemesters,
      setProfile,
      setDeptProfile,
      refreshProfile,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, ready, semesters, profile, deptProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
