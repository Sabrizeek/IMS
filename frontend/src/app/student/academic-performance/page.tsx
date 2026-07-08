"use client";

import { useEffect, useState } from "react";
import { StudentNav } from "@/components/layout/StudentNav";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { BookOpen, Award, TrendingUp, AlertCircle } from "lucide-react";

// ─── Types from backend /api/results/my-performance ──────────────────────────
interface SubjectResult {
  subjectCode: string;
  credits: number;
  grade: string;
  gradePoint: number;
}

interface SemesterPerformance {
  semesterId: string;
  semesterNumber: number;
  label: string;
  academicYear: string;
  semesterGPA: number;
  totalCredits: number;
  subjects: SubjectResult[];
}

interface AcademicPerformance {
  registrationNo: string;
  cgpa: number | null;
  semesters: SemesterPerformance[];
}

// ─── Grade badge colours ──────────────────────────────────────────────────────
function gradeBadgeClass(grade: string) {
  if (grade === "MC") return "bg-purple-100 text-purple-700 ring-1 ring-purple-200";
  const gp = gradePointOf(grade);
  if (gp >= 3.7) return "bg-emerald-100 text-emerald-800";
  if (gp >= 3.0) return "bg-sky-100 text-sky-800";
  if (gp >= 2.0) return "bg-amber-100 text-amber-800";
  if (gp >= 1.0) return "bg-orange-100 text-orange-800";
  return "bg-rose-100 text-rose-800";
}

function gradePointOf(grade: string): number {
  const MAP: Record<string, number> = {
    "A+": 4.0, "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7,
    "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, "D": 1.0,
    "E": 0, "E*": 0, "F": 0, "MC": 0,
  };
  return MAP[grade] ?? 0;
}

function classify(gpa: number): string {
  if (gpa >= 3.7) return "First Class";
  if (gpa >= 3.3) return "Second Class (Upper)";
  if (gpa >= 3.0) return "Second Class (Lower)";
  if (gpa >= 2.0) return "General Pass";
  return "Below Pass";
}

function classifyColor(gpa: number): string {
  if (gpa >= 3.7) return "text-emerald-600";
  if (gpa >= 3.3) return "text-sky-600";
  if (gpa >= 3.0) return "text-blue-600";
  if (gpa >= 2.0) return "text-amber-600";
  return "text-rose-600";
}

export default function AcademicPerformancePage() {
  useAuthGuard("student", "/student/login");
  const { user, ready } = useAuth();

  const [data, setData] = useState<AcademicPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSem, setOpenSem] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || user?.role !== "student") return;
    const token = sessionStorage.getItem("ims.student.token");
    fetch("http://localhost:5000/api/results/my-performance", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to load academic performance");
        return res.json();
      })
      .then((payload: AcademicPerformance) => {
        setData(payload);
        // Auto-open the most recent semester
        if (payload.semesters.length > 0) {
          setOpenSem(payload.semesters[payload.semesters.length - 1].semesterId);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [ready, user]);

  if (!ready || user?.role !== "student") {
    return <main className="flex flex-1 min-h-screen items-center justify-center bg-sky text-navy-deep">Loading…</main>;
  }

  return (
    <>
      <StudentNav />
      <main className="flex-1 bg-sky min-h-screen">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-navy-deep/60">Academic Record</p>
            <h1 className="mt-1 text-3xl font-extrabold text-navy-deep">Academic Performance</h1>
            <p className="mt-1 text-sm text-navy-deep/60">Your published semester results and cumulative GPA.</p>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex h-48 items-center justify-center rounded-2xl bg-white/80">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-navy-deep/30 border-t-navy-deep" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* No results yet */}
          {!loading && !error && data && data.semesters.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-white/80 py-20 text-center shadow-xs">
              <BookOpen className="h-14 w-14 text-navy-deep/20" />
              <h2 className="text-xl font-bold text-navy-deep/60">Results have not been published yet.</h2>
              <p className="max-w-xs text-sm text-navy-deep/40">
                Your academic results will appear here once your department publishes them. Please check back later.
              </p>
            </div>
          )}

          {/* Results */}
          {!loading && !error && data && data.semesters.length > 0 && (
            <div className="space-y-6">
              {/* CGPA Summary Card */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-navy-deep px-6 py-5 text-white sm:col-span-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-white/60">Cumulative GPA</p>
                  <p className="mt-2 text-5xl font-black">
                    {data.cgpa !== null ? data.cgpa.toFixed(2) : "—"}
                    <span className="ml-1 text-xl font-normal text-white/60">/4.0</span>
                  </p>
                  {data.cgpa !== null && (
                    <p className={`mt-2 text-sm font-semibold ${classifyColor(data.cgpa)} brightness-150`}>
                      {classify(data.cgpa)}
                    </p>
                  )}
                </div>
                <div className="rounded-2xl bg-white/80 px-6 py-5 shadow-xs">
                  <p className="text-xs font-bold uppercase tracking-wider text-navy-deep/60">Semesters Completed</p>
                  <p className="mt-2 text-5xl font-black text-navy-deep">{data.semesters.length}</p>
                </div>
                <div className="rounded-2xl bg-white/80 px-6 py-5 shadow-xs">
                  <p className="text-xs font-bold uppercase tracking-wider text-navy-deep/60">Total Credits</p>
                  <p className="mt-2 text-5xl font-black text-navy-deep">
                    {data.semesters.reduce((s, sem) => s + sem.totalCredits, 0)}
                  </p>
                </div>
              </div>

              {/* Semester Accordions — strictly chronological by semesterNumber */}
              {[...data.semesters]
                .sort((a, b) => a.semesterNumber - b.semesterNumber)
                .map(sem => (
                  <div key={sem.semesterId} className="overflow-hidden rounded-2xl bg-white/80 shadow-xs">
                    {/* Accordion Header */}
                    <button
                      className="flex w-full items-center gap-4 px-6 py-4 text-left hover:bg-slate-50/60 transition"
                      onClick={() => setOpenSem(o => o === sem.semesterId ? null : sem.semesterId)}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-deep text-white text-sm font-black">
                        {sem.semesterNumber}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-navy-deep text-sm">{sem.label || `Semester ${sem.semesterNumber}`}</p>
                        <p className="text-xs text-slate-400">{sem.academicYear}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-navy-deep">{sem.semesterGPA.toFixed(2)}</p>
                        <p className={`text-xs font-semibold ${classifyColor(sem.semesterGPA)}`}>{classify(sem.semesterGPA)}</p>
                      </div>
                      <TrendingUp className={`h-4 w-4 shrink-0 transition-transform ${openSem === sem.semesterId ? "rotate-180 text-navy-deep" : "text-slate-300"}`} />
                    </button>

                    {/* Accordion Body — Subject results */}
                    {openSem === sem.semesterId && (
                      <div className="border-t border-slate-100 px-6 pb-5 pt-4">
                        {/* MC Note if applicable */}
                        {sem.subjects.some(s => s.grade === "MC") && (
                          <div className="mb-3 flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-xs text-purple-700">
                            <Award className="h-3.5 w-3.5 shrink-0" />
                            <span><strong>MC (Medical Certificate)</strong> subjects are shown but excluded from GPA calculation.</span>
                          </div>
                        )}

                        <table className="w-full text-sm">
                          <thead className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400">
                            <tr>
                              <th className="pb-2 text-left">Subject Code</th>
                              <th className="pb-2 text-center">Credits</th>
                              <th className="pb-2 text-center">Grade</th>
                              <th className="pb-2 text-center">Grade Points</th>
                              <th className="pb-2 text-right">GPA Impact</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {sem.subjects.map(sub => (
                              <tr key={sub.subjectCode}>
                                <td className="py-2.5 font-mono font-bold text-navy-deep">{sub.subjectCode}</td>
                                <td className="py-2.5 text-center text-slate-600">{sub.credits}</td>
                                <td className="py-2.5 text-center">
                                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-black ${gradeBadgeClass(sub.grade)}`}>
                                    {sub.grade}
                                  </span>
                                </td>
                                <td className="py-2.5 text-center text-slate-600">{sub.gradePoint.toFixed(1)}</td>
                                <td className="py-2.5 text-right">
                                  {sub.grade === "MC" ? (
                                    <span className="text-xs text-purple-500 font-medium italic">Excluded (MC)</span>
                                  ) : (
                                    <span className="text-xs text-slate-500">{(sub.credits * sub.gradePoint).toFixed(1)} pts</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t-2 border-slate-200">
                            <tr>
                              <td colSpan={2} className="pt-3 text-xs font-bold uppercase text-slate-400">Semester Total</td>
                              <td />
                              <td />
                              <td className="pt-3 text-right font-black text-navy-deep">
                                GPA: {sem.semesterGPA.toFixed(2)} <span className="text-slate-400 font-normal text-xs">({sem.totalCredits} cr)</span>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
