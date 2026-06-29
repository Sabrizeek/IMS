"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Unlock,
  AlertTriangle,
  Save,
  Send,
  Download,
  FileText,
  CheckCircle,
  HelpCircle,
  ArrowLeft,
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
}

function RecordBookEntryContent() {
  const { user, ready } = useAuth();
  useAuthGuard("student", "/student/login");
  const router = useRouter();
  const searchParams = useSearchParams();

  const weekParam = searchParams.get("week");
  const defaultWeek = weekParam ? parseInt(weekParam, 10) : 1;

  const [internshipApproved, setInternshipApproved] = useState(false);
  const [internshipStartDate, setInternshipStartDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<WeeklyRecordData[]>([]);
  const [activeWeekNum, setActiveWeekNum] = useState<number>(defaultWeek);
  const [activitiesInput, setActivitiesInput] = useState("");
  const [challengesInput, setChallengesInput] = useState("");
  const [reflectionsInput, setReflectionsInput] = useState("");
  const [skillsInput, setSkillsInput] = useState<string[]>([]);
  const [newSkillText, setNewSkillText] = useState("");
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  const [globalSkills, setGlobalSkills] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState("");

  // Sync activeWeekNum with week query parameter if it changes
  useEffect(() => {
    if (weekParam) {
      const w = parseInt(weekParam, 10);
      if (!isNaN(w) && w >= 1 && w <= 24) {
        setActiveWeekNum(w);
      }
    }
  }, [weekParam]);

  // 1. Fetch internship details, global skills & check if approved
  const checkInternshipAndLoadRecords = async () => {
    try {
      const token = sessionStorage.getItem("ims.student.token");
      if (!token) return;

      // Fetch internship
      const internRes = await fetch("http://localhost:5000/api/internships/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (internRes.ok) {
        const internData = await internRes.json();
        if (internData.application && internData.application.approved) {
          setInternshipApproved(true);
          setInternshipStartDate(internData.application.internshipStartDate);

          // Fetch weekly records and global skills in parallel
          const [recordsRes, skillsRes] = await Promise.all([
            fetch("http://localhost:5000/api/weekly-records/me", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch("http://localhost:5000/api/skills", {
              headers: { Authorization: `Bearer ${token}` },
            })
          ]);
          
          if (recordsRes.ok) {
            const recordsData = await recordsRes.json();
            setRecords(recordsData.records || []);
          }
          if (skillsRes.ok) {
            const skillsData = await skillsRes.json();
            const defaultSkills = [
              "Communication", "Teamwork", "Problem Solving", "Time Management", 
              "Programming", "Documentation", "Leadership", "Research", 
              "Presentation", "Critical Thinking"
            ];
            const fetchedSkills = skillsData.skills || [];
            setGlobalSkills(Array.from(new Set([...defaultSkills, ...fetchedSkills])).sort());
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

  // 2. Generate 24 weeks list dynamically based on start date
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
        challengesEncountered: match?.challengesEncountered || "",
        reflections: match?.reflections || "",
        skillsGained: match?.skillsGained || [],
        status: match?.status || "Draft",
        unlockRequested: match?.unlockRequested || false,
        isLocked: match ? match.isLocked : (!canEdit || isPast),
        canEdit,
        isFuture,
        _id: match?._id,
      });
    }
    return list;
  }, [internshipStartDate, records]);

  // 3. Keep active week data synchronized in the input fields
  const activeWeekData = useMemo(() => {
    return weeksList.find((w) => w.weekNumber === activeWeekNum) || null;
  }, [weeksList, activeWeekNum]);

  useEffect(() => {
    if (activeWeekData) {
      setActivitiesInput(activeWeekData.activities);
      setChallengesInput(activeWeekData.challengesEncountered);
      setReflectionsInput(activeWeekData.reflections);
      setSkillsInput(activeWeekData.skillsGained);
      setStartDateInput(activeWeekData.weekStart.split("T")[0]);
      setEndDateInput(activeWeekData.weekEnd.split("T")[0]);
      setNewSkillText("");
    }
  }, [activeWeekNum, activeWeekData]);

  // 4. Save record (Draft/Edited or Submitted)
  const handleSave = async (submitStatus: "Draft" | "Submitted") => {
    if (!activeWeekData) return;
    setError(null);

    const errors: Record<string, string> = {};

    // Client-side validation for submission
    if (submitStatus === "Submitted") {
      if (!activitiesInput || activitiesInput.trim().length < 200) {
        errors.activities = "Tasks Completed must be at least 200 characters to submit.";
      }
      if (!challengesInput || !challengesInput.trim()) {
        errors.challenges = "Challenges Encountered is required to submit.";
      }
      if (!reflectionsInput || !reflectionsInput.trim()) {
        errors.reflections = "Reflections & Learning Outcomes is required to submit.";
      }
      if (skillsInput.length === 0) {
        errors.skills = "At least one skill must be added to submit.";
      }
    }

    if (!startDateInput) {
      errors.startDate = "Start Date is required.";
    }
    if (!endDateInput) {
      errors.endDate = "End Date is required.";
    }

    if (startDateInput && endDateInput) {
      const inputStart = new Date(startDateInput);
      const inputEnd = new Date(endDateInput);
      inputStart.setHours(0,0,0,0);
      inputEnd.setHours(0,0,0,0);

      if (inputStart > inputEnd) {
        errors.endDate = "End Date cannot be earlier than Start Date.";
      }

      // Calculate expected date boundaries on the client side
      if (internshipStartDate) {
        const baseDate = new Date(internshipStartDate);
        const expectedStart = new Date(baseDate);
        expectedStart.setDate(baseDate.getDate() + (activeWeekNum - 1) * 7);
        const expectedEnd = new Date(expectedStart);
        expectedEnd.setDate(expectedStart.getDate() + 6);

        expectedStart.setHours(0,0,0,0);
        expectedEnd.setHours(23,59,59,999);

        if (inputStart < expectedStart || inputStart > expectedEnd) {
          errors.startDate = `Start Date must belong to Week ${activeWeekNum} (${expectedStart.toLocaleDateString()} - ${expectedEnd.toLocaleDateString()}).`;
        }
        if (inputEnd < expectedStart || inputEnd > expectedEnd) {
          errors.endDate = `End Date must belong to Week ${activeWeekNum} (${expectedStart.toLocaleDateString()} - ${expectedEnd.toLocaleDateString()}).`;
        }

        // Check if future week
        if (new Date() < expectedStart) {
          errors.week = `Week ${activeWeekNum} is in the future and not yet available.`;
        }
      }

      // Overlapping dates check on client side
      const hasOverlap = records.some(r => {
        if (r.weekNumber === activeWeekNum) return false;
        const rStart = new Date(r.weekStart);
        const rEnd = new Date(r.weekEnd);
        return rStart <= inputEnd && rEnd >= inputStart;
      });
      if (hasOverlap) {
        errors.startDate = "The selected date range overlaps with another week's record.";
        errors.endDate = "The selected date range overlaps with another week's record.";
      }
    }

    // Progression check (cannot skip weeks)
    if (activeWeekNum > 1) {
      const prevRecord = records.find(r => r.weekNumber === activeWeekNum - 1);
      if (!prevRecord || prevRecord.status !== "Submitted") {
        errors.week = `Week ${activeWeekNum - 1} must be submitted before starting or saving Week ${activeWeekNum}.`;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("Please fix the validation errors below.");
      return;
    }

    setFieldErrors({});

    const isNew = !activeWeekData._id;
    const url = isNew
      ? "http://localhost:5000/api/weekly-records"
      : `http://localhost:5000/api/weekly-records/${activeWeekData._id}`;
    const method = isNew ? "POST" : "PUT";

    try {
      const token = sessionStorage.getItem("ims.student.token");
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          weekNumber: activeWeekNum,
          weekStart: startDateInput,
          weekEnd: endDateInput,
          activities: activitiesInput,
          challengesEncountered: challengesInput,
          reflections: reflectionsInput,
          skillsGained: skillsInput,
          status: submitStatus === "Submitted" ? "Submitted" : isNew ? "Draft" : "Edited",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to save record.");
        return;
      }

      setToastMessage(submitStatus === "Submitted" ? "Weekly record submitted successfully!" : "Draft saved successfully.");
      
      // Redirect to Summary page after brief delay to show toast
      window.setTimeout(() => {
        setToastMessage("");
        router.push("/student/record-book");
      }, 1500);
      
    } catch {
      setError("Unable to connect to backend server.");
    }
  };

  // 5. Request Unlock
  const handleRequestUnlock = async () => {
    if (!activeWeekData || !activeWeekData._id) return;
    setError(null);

    try {
      const token = sessionStorage.getItem("ims.student.token");
      const res = await fetch(`http://localhost:5000/api/weekly-records/${activeWeekData._id}/request-unlock`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setToastMessage("Unlock request sent to department.");
        window.setTimeout(() => {
          setToastMessage("");
          router.push("/student/record-book");
        }, 1500);
      } else {
        const data = await res.json();
        setError(data.message || "Failed to send unlock request.");
      }
    } catch {
      setError("Unable to connect to backend server.");
    }
  };

  // 6. Request PDF from backend
  const handleDownloadReport = async (type: "weekly" | "summary") => {
    try {
      const token = sessionStorage.getItem("ims.student.token");
      if (!token) return;

      const weekIds = [];
      if (type === "weekly") {
        if (activeWeekData?._id) weekIds.push(activeWeekData._id);
      } else {
        const sortedSaved = records.filter(r => r.weekNumber <= activeWeekNum).sort((a, b) => b.weekNumber - a.weekNumber);
        for (let i = 0; i < Math.min(3, sortedSaved.length); i++) {
          if (sortedSaved[i]._id) weekIds.push(sortedSaved[i]._id);
        }
      }

      if (weekIds.length === 0) {
        setError("No saved records available to generate a report.");
        return;
      }

      setToastMessage("Generating PDF...");
      const res = await fetch("http://localhost:5000/api/weekly-records/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type, weekIds }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.message || "Failed to generate report.");
        return;
      }

      const blob = await res.blob();
      const filename = type === "weekly"
        ? `Weekly_Report_Week_${activeWeekNum}.pdf`
        : `Three_Week_Summary_Weeks_${Math.max(1, activeWeekNum - 2)}-${activeWeekNum}.pdf`;

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setToastMessage(`Report downloaded: ${filename}`);
      window.setTimeout(() => setToastMessage(""), 3000);
    } catch (err) {
      setError("Unable to connect to backend server for PDF generation.");
    }
  };

  if (!ready || loading) {
    return (
      <main className="flex flex-1 items-center justify-center bg-sky text-navy-deep min-h-screen">
        Loading…
      </main>
    );
  }

  // Locked State View
  if (!internshipApproved) {
    return (
      <div className="flex min-h-screen flex-col bg-[#a7ccdb]">
        <StudentNav />
        <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-[1000px] shadow-2xl flex flex-col">
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
              <div className="md:w-[55%] bg-[#e3f0f5] p-10 lg:p-12 flex flex-col justify-center">
                <h1 className="text-3xl font-extrabold text-slate-800 mb-4 tracking-tight">Internship Record Book</h1>
                <p className="text-slate-600 text-sm font-medium leading-relaxed mb-8">
                  Your record book will unlock once your internship offer is submitted and approved by the department.
                </p>

                {/* Locked Card */}
                <div className="bg-white rounded-xl shadow-sm border border-white/50 p-6 relative overflow-hidden flex flex-col mb-6">
                  {/* Left accent strip */}
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

                {/* Info Box */}
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
              <button 
                disabled 
                className="flex items-center gap-2 text-white font-semibold text-sm opacity-90 cursor-not-allowed"
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

  const isEditable =
    activeWeekData &&
    activeWeekData.status !== "Submitted" &&
    !activeWeekData.isLocked;

  const isFullyLocked =
    activeWeekData?.status === "Submitted" ||
    (activeWeekData?.isLocked && !activeWeekData?.unlockRequested);

  return (
    <div className="flex min-h-screen flex-col bg-[#a7ccdb]">
      <StudentNav />

      <main className="flex-grow flex flex-col p-6 sm:p-10 max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/student/record-book")}
              className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-[#1f3a5e] rounded shadow-sm transition"
              title="Back to Record Book Summary"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#1f3a5e]">Weekly Internship Log / Week {activeWeekNum < 10 ? `0${activeWeekNum}` : activeWeekNum}</h1>
              <p className="text-sm text-slate-600 mt-1">Record your progress, challenges, and reflections for the academic week.</p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            {activeWeekData?.isLocked && !activeWeekData.unlockRequested && activeWeekData.status !== "Submitted" && activeWeekData._id && (
              <button
                type="button"
                onClick={handleRequestUnlock}
                className="inline-flex items-center gap-2 rounded bg-amber-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-amber-700"
              >
                <Unlock className="h-4 w-4" />
                Request Unlock
              </button>
            )}
            <button 
              onClick={() => handleSave("Draft")}
              disabled={isFullyLocked || activeWeekData?.unlockRequested}
              className="px-5 py-2.5 bg-white text-slate-800 text-sm font-semibold rounded shadow-sm hover:bg-slate-50 transition border border-slate-200 disabled:opacity-50"
            >
              <Save className="h-4 w-4 inline-block mr-1" />
              Save as Draft
            </button>
            <button 
              onClick={() => {
                if (window.confirm("Submit this record? You cannot edit it after submission.")) {
                  handleSave("Submitted");
                }
              }}
              disabled={isFullyLocked || activeWeekData?.unlockRequested}
              className="px-5 py-2.5 bg-[#1f3a5e] text-white text-sm font-semibold rounded shadow-sm hover:bg-[#152a46] transition flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Submit
            </button>
          </div>
        </div>

        {/* Notifications */}
        {toastMessage && (
          <div className="mb-6 rounded bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 shadow-sm">
            {toastMessage}
          </div>
        )}
        {error && (
          <div className="mb-6 rounded bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 shadow-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column - Log Context */}
          <div className="lg:w-[35%] flex flex-col gap-6">
            <div className="bg-[#dcf0f6] border border-white/50 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-[#1f3a5e] flex items-center justify-center text-white">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-[#1f3a5e]">Log Context</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase">Week</label>
                  <select 
                    value={activeWeekNum}
                    onChange={(e) => setActiveWeekNum(Number(e.target.value))}
                    className="w-full bg-[#dcf0f6] border border-[#a7ccdb] rounded px-3 py-2.5 text-sm text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#1f3a5e] cursor-pointer"
                  >
                    {weeksList.map(w => {
                      const isDisabled = !w.canEdit && w.status !== "Submitted" && w.status !== "Edited";
                      return (
                        <option key={w.weekNumber} value={w.weekNumber} disabled={isDisabled}>
                          Week {w.weekNumber < 10 ? `0${w.weekNumber}` : w.weekNumber} {w.status === "Submitted" ? "✓" : ""} {isDisabled ? "🔒" : ""}
                        </option>
                      );
                    })}
                  </select>
                  {fieldErrors.week && <p className="text-xs text-rose-600 font-semibold mt-1">{fieldErrors.week}</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Reporting Period</label>
                  <div className="space-y-3 relative">
                    {/* Vertical line connecting dates */}
                    <div className="absolute left-4 top-5 bottom-5 w-0.5 bg-[#a7ccdb]"></div>
                    
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1">Start Date</span>
                      <div className="w-full bg-[#dcf0f6] border border-[#a7ccdb] rounded px-3 py-2 text-sm text-slate-700 font-medium flex items-center gap-2">
                        <span className="text-slate-400">📅</span>
                        <input
                          type="date"
                          value={startDateInput}
                          onChange={(e) => setStartDateInput(e.target.value)}
                          disabled={isFullyLocked || activeWeekData?.unlockRequested}
                          className="bg-transparent outline-none w-full cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                        />
                      </div>
                      {fieldErrors.startDate && <p className="text-[11px] text-rose-600 font-semibold mt-1">{fieldErrors.startDate}</p>}
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1">End Date</span>
                      <div className="w-full bg-[#dcf0f6] border border-[#a7ccdb] rounded px-3 py-2 text-sm text-slate-700 font-medium flex items-center gap-2">
                        <span className="text-slate-400">📅</span>
                        <input
                          type="date"
                          value={endDateInput}
                          onChange={(e) => setEndDateInput(e.target.value)}
                          disabled={isFullyLocked || activeWeekData?.unlockRequested}
                          className="bg-transparent outline-none w-full cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                        />
                      </div>
                      {fieldErrors.endDate && <p className="text-[11px] text-rose-600 font-semibold mt-1">{fieldErrors.endDate}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pro-Tip */}
            <div className="bg-[#2c4766] rounded-xl p-6 shadow-sm text-white border-l-4 border-white/20">
              <div className="flex items-center gap-2 mb-3">
                <HelpCircle className="h-4 w-4 text-sky-300" />
                <h4 className="font-bold text-sm text-white">Pro-Tip</h4>
              </div>
              <p className="text-xs text-white/80 leading-relaxed font-medium">
                Focus on quantifiable achievements. Instead of "Worked on bugs," try "Resolved 5 critical security vulnerabilities in the authentication module."
              </p>
            </div>
          </div>

          {/* Right Column - Forms */}
          <div className="lg:w-[65%] flex flex-col gap-5">
            {/* Warning block if locked */}
            {activeWeekData?.isLocked && !activeWeekData.unlockRequested && activeWeekData.status !== "Submitted" && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-center gap-2 shadow-sm">
                <Lock className="h-4 w-4" /> Editing is currently locked for this past week. Please request an unlock.
              </div>
            )}
            
            {/* Tasks Completed */}
            <div className="bg-[#eaf4f7] border border-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-[#a7ccdb]/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-[#1f3a5e]" />
                  <h4 className="font-bold text-[#1f3a5e] text-sm">Tasks Completed</h4>
                </div>
                <span className="text-[10px] text-slate-400">Min 200 characters</span>
              </div>
              <div className="bg-white p-4">
                <div className="flex items-center gap-4 mb-3 pb-3 border-b border-slate-100 text-slate-400">
                  <button className="hover:text-slate-700 font-serif font-bold cursor-pointer">B</button>
                  <button className="hover:text-slate-700 font-serif italic cursor-pointer">I</button>
                  <button className="hover:text-slate-700 cursor-pointer">☰</button>
                  <button className="hover:text-slate-700 cursor-pointer">🔗</button>
                </div>
                <textarea 
                  value={activitiesInput}
                  onChange={(e) => setActivitiesInput(e.target.value)}
                  disabled={isFullyLocked || activeWeekData?.unlockRequested}
                  className="w-full min-h-[120px] outline-none text-sm text-slate-700 resize-y"
                  placeholder="Describe the specific projects and responsibilities you handled this week..."
                />
                {fieldErrors.activities && <p className="text-xs text-rose-600 font-semibold mt-1.5">{fieldErrors.activities}</p>}
              </div>
            </div>

            {/* Challenges Encountered */}
            <div className="bg-[#eaf4f7] border border-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-[#a7ccdb]/30 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                <h4 className="font-bold text-[#1f3a5e] text-sm">Challenges Encountered</h4>
              </div>
              <div className="bg-white p-4">
                <textarea 
                  value={challengesInput}
                  onChange={(e) => setChallengesInput(e.target.value)}
                  disabled={isFullyLocked || activeWeekData?.unlockRequested}
                  className="w-full min-h-[80px] outline-none text-sm text-slate-700 resize-y"
                  placeholder="What technical or professional obstacles did you face? How did you attempt to solve them?"
                />
                {fieldErrors.challenges && <p className="text-xs text-rose-600 font-semibold mt-1.5">{fieldErrors.challenges}</p>}
              </div>
            </div>

            {/* Reflections */}
            <div className="bg-[#eaf4f7] border border-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-[#a7ccdb]/30 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-[#1f3a5e]" />
                <h4 className="font-bold text-[#1f3a5e] text-sm">Reflections & Learning Outcomes</h4>
              </div>
              <div className="bg-white p-4">
                <textarea 
                  value={reflectionsInput}
                  onChange={(e) => setReflectionsInput(e.target.value)}
                  disabled={isFullyLocked || activeWeekData?.unlockRequested}
                  className="w-full min-h-[80px] outline-none text-sm text-slate-700 resize-y"
                  placeholder="Reflect on your personal growth this week. What new insights did you gain about the industry?"
                />
                {fieldErrors.reflections && <p className="text-xs text-rose-600 font-semibold mt-1.5">{fieldErrors.reflections}</p>}
              </div>
            </div>

            {/* Skills Gained */}
            <div className="bg-[#dcf0f6] border border-white rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[#1f3a5e] text-lg">✨</span>
                <h4 className="font-bold text-[#1f3a5e] text-sm">Skills Gained This Week</h4>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {globalSkills.map((skill, idx) => {
                  const isSelected = skillsInput.includes(skill);
                  return (
                    <button
                      key={`global-${idx}`}
                      type="button"
                      disabled={isFullyLocked || activeWeekData?.unlockRequested}
                      onClick={() => {
                        if (isSelected) {
                          setSkillsInput(skillsInput.filter(s => s !== skill));
                        } else {
                          setSkillsInput([...skillsInput, skill]);
                        }
                      }}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm border transition flex items-center gap-1 disabled:opacity-70 disabled:cursor-not-allowed ${
                        isSelected 
                          ? "bg-[#1f3a5e] text-white border-[#1f3a5e]" 
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {skill} {isSelected && "✓"}
                    </button>
                  );
                })}
                
                {skillsInput.filter(s => !globalSkills.includes(s)).map((skill, idx) => (
                  <span key={`custom-${idx}`} className="bg-[#1f3a5e] text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm border border-[#1f3a5e] flex items-center gap-1">
                    {skill} ✓
                    {!isFullyLocked && !activeWeekData?.unlockRequested && (
                      <button type="button" onClick={() => setSkillsInput(skillsInput.filter(s => s !== skill))} className="text-sky-200 hover:text-white ml-1">×</button>
                    )}
                  </span>
                ))}
                
                {!isFullyLocked && !activeWeekData?.unlockRequested && (
                  <div className="relative">
                    <input 
                      type="text" 
                      value={newSkillText}
                      onChange={(e) => setNewSkillText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newSkillText.trim()) {
                          const newSkill = newSkillText.trim();
                          if (!skillsInput.includes(newSkill)) {
                            setSkillsInput([...skillsInput, newSkill]);
                          }
                          setNewSkillText("");
                        }
                      }}
                      placeholder="+ Add custom..."
                      className="bg-white text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm border border-slate-200 outline-none focus:ring-1 focus:ring-[#1f3a5e] w-32"
                    />
                  </div>
                )}
              </div>
              {fieldErrors.skills && <p className="text-xs text-rose-600 font-semibold mt-2">{fieldErrors.skills}</p>}
            </div>
            
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function RecordBookEntryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#a7ccdb] flex items-center justify-center font-bold text-[#1f3a5e]">Loading…</div>}>
      <RecordBookEntryContent />
    </Suspense>
  );
}
