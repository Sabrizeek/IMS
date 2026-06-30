"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  Download,
  CheckCircle,
  HelpCircle,
  FileText,
  LockKeyhole,
} from "lucide-react";
import { StudentNav } from "@/components/layout/StudentNav";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";

interface WeeklyRecordData {
  _id?: string;
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  activities: string;
  challengesEncountered: string;
  reflections: string;
  skillsGained: string[];
  status: "Draft" | "Edited" | "Submitted";
  unlockRequested: boolean;
  isLocked: boolean;
  submittedAt?: string;
  updatedAt?: string;
}

export default function RecordBookSummaryPage() {
  const { user, ready } = useAuth();
  useAuthGuard("student", "/student/login");
  const router = useRouter();

  const [internshipApproved, setInternshipApproved] = useState(false);
  const [internshipStartDate, setInternshipStartDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<WeeklyRecordData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  const checkInternshipAndLoadRecords = async () => {
    try {
      const token = sessionStorage.getItem("ims.student.token");
      if (!token) return;

      const internRes = await fetch("http://localhost:5000/api/internships/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (internRes.ok) {
        const internData = await internRes.json();
        if (internData.application && internData.application.approved) {
          setInternshipApproved(true);
          setInternshipStartDate(internData.application.internshipStartDate);

          const recordsRes = await fetch("http://localhost:5000/api/weekly-records/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (recordsRes.ok) {
            const recordsData = await recordsRes.json();
            setRecords(recordsData.records || []);
          }
        } else {
          setInternshipApproved(false);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch record book details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ready) {
      if (user?.role === "student") {
        checkInternshipAndLoadRecords();
      }
    }
  }, [ready, user]);

  const weeksList = useMemo(() => {
    if (!internshipStartDate) return [];
    const baseDate = new Date(internshipStartDate);
    const list = [];
    
    const submittedWeeks = records.filter(r => r.status === "Submitted").map(r => r.weekNumber);

    for (let i = 1; i <= 24; i++) {
      const start = new Date(baseDate);
      start.setDate(baseDate.getDate() + (i - 1) * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      const startStr = start.toISOString().split("T")[0];
      const endStr = end.toISOString().split("T")[0];

      const match = records.find((r) => r.weekNumber === i);
      const isPast = new Date() > end;
      const isFuture = new Date() < start;

      const canEdit = (i === 1 || submittedWeeks.includes(i - 1)) && !isFuture;

      list.push({
        weekNumber: i,
        weekStart: startStr,
        weekEnd: endStr,
        period: `${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}`,
        activities: match?.activities || "",
        status: match?.status || "Draft",
        hasEntry: !!match && (match.activities || match.challengesEncountered || match.reflections),
        isLocked: match ? match.isLocked : (!canEdit || isPast),
        unlockRequested: match?.unlockRequested || false,
        canEdit,
        isFuture,
        skillsGained: match?.skillsGained || [],
        submittedAt: match?.submittedAt || match?.updatedAt,
        _id: match?._id,
      });
    }
    // "Only display weeks that are currently available, already submitted, or have a saved draft. Hide untouched locked/future weeks."
    const filtered = list.filter(w => w.canEdit || w.status === "Submitted" || w.hasEntry);
    // "Display entries in chronological order." -> Ascending order!
    return filtered.sort((a, b) => a.weekNumber - b.weekNumber);
  }, [internshipStartDate, records]);

  const handleDownloadFullReport = async () => {
    try {
      const token = sessionStorage.getItem("ims.student.token");
      if (!token) return;

      const weekIds = records.filter(r => r.status === "Submitted").map(r => r._id);
      if (weekIds.length === 0) {
        setError("No submitted records available to generate a report.");
        return;
      }

      setToastMessage("Generating PDF report...");
      const res = await fetch("http://localhost:5000/api/weekly-records/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: "summary", weekIds }),
      });

      if (!res.ok) {
        setError("Failed to generate report.");
        return;
      }

      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Internship_Full_Report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setToastMessage("Report downloaded successfully.");
      window.setTimeout(() => setToastMessage(""), 3000);
    } catch {
      setError("Unable to connect to backend server.");
    }
  };

  if (!ready || loading) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#a7ccdb] text-navy-deep min-h-screen">
        Loading…
      </main>
    );
  }

  // Locked State
  if (!internshipApproved) {
    return (
      <div className="flex min-h-screen flex-col bg-[#a7ccdb]">
        <StudentNav />
        <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-[1000px] shadow-2xl flex flex-col rounded-2xl overflow-hidden bg-[#e3f0f5]">
            <div className="flex flex-col md:flex-row min-h-[500px]">
              {/* Left Panel */}
              <div className="md:w-[45%] bg-[#4b77a6] p-10 flex flex-col items-center justify-center text-center text-white">
                <div className="h-24 w-24 rounded-full bg-[#2a4d74] flex items-center justify-center mb-8 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-4">Start Your Journey</h2>
                <p className="text-sm font-medium text-white/90 leading-relaxed max-w-[260px]">
                  The Internship Record Book is your central hub for tracking your professional growth and milestones.
                </p>
              </div>

              {/* Right Panel */}
              <div className="md:w-[55%] p-10 lg:p-12 flex flex-col justify-center">
                <h1 className="text-3xl font-extrabold text-slate-800 mb-4 tracking-tight">Internship Record Book</h1>
                <p className="text-slate-600 text-sm font-medium leading-relaxed mb-8">
                  Your record book will unlock once your internship offer is submitted and approved by the department.
                </p>

                {/* Locked Card */}
                <div className="bg-white rounded-xl shadow-sm border border-white/50 p-6 relative overflow-hidden flex flex-col mb-6">
                  <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-[#173354]"></div>
                  
                  <div className="flex items-center gap-4 mb-6 pl-2">
                    <div className="h-12 w-12 rounded-lg bg-[#eef1f6] flex items-center justify-center text-[#173354]">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800">Week 01</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Internship Progress Tracking</p>
                    </div>
                  </div>

                  <div className="pl-2 mb-6">
                    <span className="inline-block bg-[#334155] text-white text-[10px] font-bold tracking-wider px-3 py-1 rounded-full uppercase">
                      LOCKED
                    </span>
                  </div>

                  <div className="pl-2 border-t border-slate-100 pt-5 space-y-4">
                    <div className="h-2 w-full bg-[#eef1f6] rounded-full mb-6"></div>
                    <p className="text-xs font-medium text-slate-600 leading-relaxed">
                      This section will become available once your internship offer letter has been verified and approved by the department.
                    </p>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <CheckCircle className="h-4 w-4 text-slate-400" />
                      Waiting for departmental approval
                    </div>
                  </div>
                </div>

                <div className="bg-[#eef5f9] border border-[#d6e5ef] rounded-lg p-4 flex items-center gap-3">
                  <HelpCircle className="h-4 w-4 text-slate-500 shrink-0" />
                  <p className="text-xs font-medium text-slate-600">
                    Departmental approval typically takes 3-5 business days after submission.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Banner */}
            <div className="bg-[#1f3a5e] p-5 flex items-center justify-end rounded-b-lg mt-0.5">
              <button disabled className="flex items-center gap-2 text-white font-semibold text-sm opacity-90 cursor-not-allowed">
                <Download className="h-4 w-4" />
                Download Report
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#a7ccdb]">
      <StudentNav />
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[1100px] shadow-2xl flex flex-col rounded-2xl overflow-hidden bg-white">
          <div className="flex flex-col md:flex-row min-h-[580px]">
            {/* Left Panel */}
            <div className="md:w-[38%] bg-[#4f7fae] p-10 flex flex-col items-center justify-center text-center text-white relative">
              <div className="h-28 w-28 rounded-full bg-[#204066]/60 flex items-center justify-center mb-8 shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-4 tracking-tight">Start Your Journey</h2>
              <p className="text-xs font-medium text-white/90 leading-relaxed max-w-[280px]">
                The Internship Record Book is your central hub for tracking your professional growth and milestones.
              </p>
            </div>

            {/* Right Panel */}
            <div className="md:w-[62%] bg-[#e3f0f5] p-8 lg:p-10 flex flex-col relative">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-xl font-bold text-slate-800">Internship Record Book</h1>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-[380px]">
                    Log your weekly activities, learning outcomes, and working hours. Ensure all entries are saved before final submission.
                  </p>
                </div>
              </div>

              {/* Toast and Error Messages inside right panel */}
              {toastMessage && (
                <div className="mb-4 rounded bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700 shadow-sm transition-all duration-300">
                  {toastMessage}
                </div>
              )}
              {error && (
                <div className="mb-4 rounded bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700 shadow-sm transition-all duration-300">
                  {error}
                </div>
              )}

              {/* Weekly logs container - scrollable list */}
              <div className="flex-grow space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {weeksList.map((week) => (
                  <div
                    key={week.weekNumber}
                    className="bg-white rounded-xl shadow-sm border border-slate-200/50 p-5 relative overflow-hidden flex flex-col transition hover:border-slate-300"
                  >
                    {/* Left Accent strip (blue for submitted, gray for locked, light blue for available) */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-2 ${
                        week.status === "Submitted"
                          ? "bg-[#1f3a5e]"
                          : week.isLocked && !week.unlockRequested
                          ? "bg-slate-300"
                          : "bg-sky-400"
                      }`}
                    />

                    <div className="flex items-center justify-between mb-2 pl-2">
                      <h3 className="text-sm font-bold text-slate-800">
                        Week {week.weekNumber < 10 ? `0${week.weekNumber}` : week.weekNumber}
                      </h3>
                      
                      {week.status === "Submitted" ? (
                        <span className="bg-[#1f3a5e] text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded tracking-wide uppercase">
                          SUBMITTED
                        </span>
                      ) : week.isLocked && !week.unlockRequested ? (
                        <span className="bg-slate-200 text-slate-500 text-[9px] font-extrabold px-2.5 py-0.5 rounded tracking-wide uppercase flex items-center gap-1">
                          <LockKeyhole className="h-3 w-3 inline" /> LOCKED
                        </span>
                      ) : (
                        <button
                          onClick={() => router.push(`/student/record-book/entry?week=${week.weekNumber}`)}
                          className="text-sky-600 hover:text-[#1f3a5e] text-xs font-bold transition flex items-center gap-1"
                        >
                          Available ✎
                        </button>
                      )}
                    </div>

                    <div className="h-px bg-slate-100 my-2 pl-2" />

                    <div className="pl-2">
                      {week.status === "Submitted" ? (
                        <div className="mt-2 text-xs text-slate-700 space-y-2">
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 font-medium">
                            <span>📅 Start Date: <strong className="text-slate-700">{week.weekStart}</strong></span>
                            <span>📅 End Date: <strong className="text-slate-700">{week.weekEnd}</strong></span>
                            {week.submittedAt && (
                              <span>✓ Submitted on: <strong className="text-slate-700">{new Date(week.submittedAt).toLocaleDateString()}</strong></span>
                            )}
                          </div>
                          
                          <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg mt-2">
                            <h4 className="font-bold text-[10px] uppercase text-slate-500 mb-1">Summary of Tasks</h4>
                            <p className="text-slate-700 leading-relaxed line-clamp-3">{week.activities || "No tasks reported."}</p>
                          </div>

                          {week.skillsGained && week.skillsGained.length > 0 && (
                            <div className="mt-3">
                              <h4 className="font-bold text-[10px] uppercase text-slate-500 mb-1.5">Skills Gained</h4>
                              <div className="flex flex-wrap gap-1.5">
                                {week.skillsGained.map((skill, idx) => (
                                  <span key={idx} className="bg-slate-200 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => router.push(`/student/record-book/entry?week=${week.weekNumber}`)}
                            className="mt-3 text-sky-600 hover:text-[#1f3a5e] text-xs font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            View Details →
                          </button>
                        </div>
                      ) : week.isLocked && !week.unlockRequested ? (
                        <p className="text-xs text-slate-400 italic">
                          This log week is not yet available.
                        </p>
                      ) : (
                        <>
                          <p className="text-xs text-slate-500 italic">
                            {week.hasEntry 
                              ? "Draft entry started. Click edit to modify and submit."
                              : "No entry yet. Start logging your activities for this week."
                            }
                          </p>
                          <button
                            onClick={() => router.push(`/student/record-book/entry?week=${week.weekNumber}`)}
                            className="mt-3 text-sky-600 hover:text-[#1f3a5e] text-xs font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            {week.hasEntry ? "Continue Logging →" : "Start Logging →"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Banner */}
          <div className="bg-[#1f3a5e] p-5 flex items-center justify-end rounded-b-2xl mt-0.5">
            <button
              onClick={handleDownloadFullReport}
              className="flex items-center gap-2 text-white font-semibold text-xs opacity-95 hover:opacity-100 transition"
            >
              <Download className="h-4 w-4" />
              Download Report
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
