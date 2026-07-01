"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DepartmentNav } from "@/components/layout/DepartmentNav";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";

interface PlacementRequest {
  _id: string;
  student: string;
  id: string; // studentId
  email: string;
  studentUserId: string;
  photo?: string;
  company: string;
  role: string;
  date: string;
  status: "Approved" | "Rejected" | "Pending Review";
  offerFileName: string;
  offerMimeType: string;
  offerDataUrl: string;
  internshipStartDate: string;
  rejectionReason: string;
}

interface WeeklyRecordData {
  _id: string;
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

export default function DepartmentApprovalsPage() {
  const { user, ready } = useAuth();
  useAuthGuard("department", "/department/auth");
  const router = useRouter();

  const [placements, setPlacements] = useState<PlacementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRequest, setActiveRequest] = useState<PlacementRequest | null>(null);
  const [isRecordBookOpen, setIsRecordBookOpen] = useState(false);
  const [studentWeeks, setStudentWeeks] = useState<WeeklyRecordData[]>([]);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [error, setError] = useState<string | null>(null);


  const fetchPlacements = async () => {
    try {
      const token = sessionStorage.getItem("ims.department.token");
      if (!token) return;
      const res = await fetch("http://localhost:5000/api/internships", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPlacements(data.applications || []);
      }
    } catch {
      setError("Failed to fetch placement requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ready && user?.role === "department") {
      fetchPlacements();
    }
  }, [ready, user]);

  const filteredPlacements = useMemo(() => {
    return placements.filter((p) => {
      if (activeTab === "all") return true;
      if (activeTab === "pending") return p.status === "Pending Review";
      if (activeTab === "approved") return p.status === "Approved";
      if (activeTab === "rejected") return p.status === "Rejected";
      return true;
    });
  }, [placements, activeTab]);

  const openReview = (request: PlacementRequest) => {
    router.push(`/department/approvals/${request._id}`);
  };

  const openRecordBook = async (request: PlacementRequest) => {
    setActiveRequest(request);
    setActionMessage(null);

    // Fetch real weekly records of the student
    try {
      const token = sessionStorage.getItem("ims.department.token");
      const res = await fetch(`http://localhost:5000/api/weekly-records/student/${request.studentUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStudentWeeks(data.records || []);
        setIsRecordBookOpen(true);
      } else {
        alert("Failed to access student's record book.");
      }
    } catch {
      alert("Unable to connect to backend server.");
    }
  };

  const closeOverlay = () => {
    setIsRecordBookOpen(false);
    setActiveRequest(null);
    setExpandedWeek(null);
  };

  // Locked week Unlock & Approve by Department
  const handleUnlockAndApprove = async (weekRecordId: string, weekNum: number) => {
    try {
      const token = sessionStorage.getItem("ims.department.token");
      const res = await fetch(`http://localhost:5000/api/weekly-records/${weekRecordId}/unlock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "approve" }),
      });
      if (res.ok) {
        setActionMessage(`Week ${weekNum} has been unlocked successfully.`);
        // Reload records
        if (activeRequest) {
          const recordsRes = await fetch(`http://localhost:5000/api/weekly-records/student/${activeRequest.studentUserId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (recordsRes.ok) {
            const recordsData = await recordsRes.json();
            setStudentWeeks(recordsData.records || []);
          }
        }
      } else {
        alert("Failed to unlock week.");
      }
    } catch {
      alert("Unable to process unlock request.");
    }
  };

  const handleDownloadOfferLetter = () => {
    if (!activeRequest || !activeRequest.offerDataUrl) return;
    const link = document.createElement("a");
    link.href = activeRequest.offerDataUrl;
    link.download = activeRequest.offerFileName || "offer_letter.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Construct complete 24 weeks list for milestone tracker
  const fullWeeksList = useMemo(() => {
    if (!activeRequest || !activeRequest.internshipStartDate) return [];
    
    // We parse start date
    // Note: dates are formatted as DD/MM/YYYY in table mapping, let's parse it safely
    let baseDate;
    try {
      const parts = activeRequest.internshipStartDate.split("/");
      if (parts.length === 3) {
        baseDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        baseDate = new Date(activeRequest.internshipStartDate);
      }
    } catch {
      baseDate = new Date();
    }
    if (isNaN(baseDate.getTime())) baseDate = new Date();

    const list = [];
    for (let i = 1; i <= 24; i++) {
      const start = new Date(baseDate);
      start.setDate(baseDate.getDate() + (i - 1) * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      const match = studentWeeks.find((w) => w.weekNumber === i);
      const isPast = new Date() > end;

      list.push({
        weekNumber: i,
        period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
        status: match?.status || (isPast ? "LOCKED" : "LOCKED"), // show LOCKED if not started
        realStatus: match?.status || "",
        unlockRequested: match?.unlockRequested || false,
        isLocked: match ? match.isLocked : isPast,
        activities: match?.activities || "",
        challengesEncountered: match?.challengesEncountered || "",
        reflections: match?.reflections || "",
        skillsGained: match?.skillsGained || [],
        _id: match?._id,
      });
    }
    return list;
  }, [activeRequest, studentWeeks]);

  const completedWeeksCount = useMemo(() => {
    return studentWeeks.filter(w => w.status === "Submitted").length;
  }, [studentWeeks]);

  if (!ready || loading) {
    return (
      <div className="min-h-screen bg-[#dceef7] flex items-center justify-center text-[#1a446c] font-bold">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#dceef7] flex flex-col font-sans text-slate-800">
      <DepartmentNav />
      
      <main className="flex-grow mx-auto w-full max-w-7xl px-6 py-10">
        <div className="rounded-[32px] bg-white/90 p-8 shadow-sm border border-white">
          
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[#1a446c] font-bold">Approvals</p>
              <h1 className="mt-2 text-3xl font-black text-slate-900">Internship Requests</h1>
              <p className="mt-3 max-w-2xl text-xs text-slate-600 leading-relaxed">
                Centralized management for student internship placements. Review pending records, verify company details, and track approval workflows.
              </p>
            </div>
            <div className="inline-flex flex-nowrap items-center gap-1.5 rounded-[20px] bg-slate-100/80 p-1.5 border border-slate-200 shadow-inner overflow-x-auto">
              <button
                onClick={() => setActiveTab("all")}
                className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all duration-200 ${
                  activeTab === "all"
                    ? "bg-[#1a446c] text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                }`}
              >
                All ({placements.length})
              </button>
              <button
                onClick={() => setActiveTab("pending")}
                className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all duration-200 ${
                  activeTab === "pending"
                    ? "bg-[#1a446c] text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                }`}
              >
                Pending Review ({placements.filter(p => p.status === "Pending Review").length})
              </button>
              <button
                onClick={() => setActiveTab("approved")}
                className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all duration-200 ${
                  activeTab === "approved"
                    ? "bg-[#1a446c] text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                }`}
              >
                Approved ({placements.filter(p => p.status === "Approved").length})
              </button>
              <button
                onClick={() => setActiveTab("rejected")}
                className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all duration-200 ${
                  activeTab === "rejected"
                    ? "bg-[#1a446c] text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                }`}
              >
                Rejected ({placements.filter(p => p.status === "Rejected").length})
              </button>
            </div>
          </div>

          {actionMessage && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-xs text-emerald-800 shadow-sm">
              {actionMessage}
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3.5 text-xs text-rose-800 shadow-sm">
              {error}
            </div>
          )}

          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Student & ID</th>
                    <th className="px-6 py-4">Company</th>
                    <th className="px-6 py-4">Job Position</th>
                    <th className="px-6 py-4">Date Submitted</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredPlacements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">No placement requests in this filter criteria.</td>
                    </tr>
                  ) : (
                    filteredPlacements.map((row) => (
                      <tr key={row._id} className="hover:bg-slate-50/80 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 border border-slate-300">
                              {row.photo ? (
                                <img src={row.photo} alt={row.student} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-sm">👤</span>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{row.student}</p>
                              <p className="text-[11px] font-medium text-slate-500 mt-0.5">{row.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-700">{row.company}</td>
                        <td className="px-6 py-4 font-medium text-slate-700">{row.role}</td>
                        <td className="px-6 py-4 text-slate-500">{row.date}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-bold ${
                            row.status === "Approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : row.status === "Pending Review"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                          {row.status === "Pending Review" && (
                            <button
                              type="button"
                              onClick={() => openReview(row)}
                              className="rounded-lg bg-[#1a446c] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#133352] cursor-pointer"
                            >
                              Review
                            </button>
                          )}
                          {row.status === "Approved" && (
                            <button
                              type="button"
                              onClick={() => openRecordBook(row)}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
                            >
                              Record Book →
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* OVERLAY DYNAMIC MODAL LAYER */}
      {isRecordBookOpen && activeRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-6xl rounded-[28px] bg-[#dceef7] p-6 shadow-2xl border border-white flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between border-b border-slate-300/60 pb-4 mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#1a446c] font-black">IMS Portal</p>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  Internship Weekly Record Book
                </h2>
              </div>
              <button
                type="button"
                onClick={closeOverlay}
                className="rounded-lg bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 shadow-sm cursor-pointer"
              >
                Close View
              </button>
            </div>

            {/* RECORD BOOK INTERFACE */}
            {isRecordBookOpen && (
              <div className="flex-grow overflow-y-auto pr-1 space-y-6">
                
                {/* Student Profile Header Banner */}
                <div className="rounded-2xl bg-[#1e3a5f] p-5 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 border-2 border-white/20">
                      {activeRequest.photo ? (
                        <img src={activeRequest.photo} alt={activeRequest.student} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xl">👤</span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold">{activeRequest.student}</h3>
                      <p className="text-xs text-slate-300">Student ID: {activeRequest.id}</p>
                      <p className="text-xs text-slate-300">Email: {activeRequest.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="border border-slate-500/50 rounded-xl px-4 py-2.5 bg-slate-800/30 text-center min-w-[100px]">
                      <p className="text-[9px] text-slate-300 uppercase font-bold">Completion</p>
                      <p className="text-lg font-black text-sky-400 mt-0.5">
                        {Math.round((completedWeeksCount / 24) * 100)}% <span className="text-xs font-normal text-white">{completedWeeksCount}/24 Weeks</span>
                      </p>
                    </div>
                    <div className="border border-slate-500/50 rounded-xl px-4 py-2.5 bg-slate-800/30 text-center min-w-[100px]">
                      <p className="text-[9px] text-slate-300 uppercase font-bold">Start Date</p>
                      <p className="text-base font-black text-white mt-1">{activeRequest.internshipStartDate}</p>
                    </div>
                  </div>
                </div>

                {/* Split Content: Table & Milestone Tracker */}
                <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] items-start">
                  
                  {/* Left Side: Weekly Records Table */}
                  <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-xs">
                        <thead className="bg-[#78a5c9]/20 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-5 py-3">Week</th>
                            <th className="px-5 py-3">Period</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3">Activities</th>
                            <th className="px-5 py-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {fullWeeksList.map((row) => (
                            <React.Fragment key={row.weekNumber}>
                              <tr className="hover:bg-slate-50/50 transition">
                                <td className="px-5 py-4 font-bold text-slate-900">Week {row.weekNumber}</td>
                                <td className="px-5 py-4 text-slate-600 font-medium">{row.period}</td>
                                <td className="px-5 py-4">
                                  {row.realStatus === "Submitted" ? (
                                    <span className="inline-block rounded bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 text-[9px]">SUBMITTED</span>
                                  ) : row.realStatus === "Draft" || row.realStatus === "Edited" ? (
                                    <span className="inline-block rounded bg-sky-100 text-sky-800 font-bold px-2 py-0.5 text-[9px]">{row.realStatus.toUpperCase()}</span>
                                  ) : (
                                    <span className="inline-block rounded bg-slate-200 text-slate-600 font-bold px-2 py-0.5 text-[9px] flex items-center gap-1 w-max">
                                      🔒 LOCKED
                                    </span>
                                  )}
                                  {row.unlockRequested && (
                                    <span className="ml-1.5 inline-block rounded bg-amber-100 text-amber-800 font-bold px-2 py-0.5 text-[9px]">UNLOCK REQUESTED</span>
                                  )}
                                </td>
                                <td className="px-5 py-4 text-slate-500 truncate max-w-[150px]" title={row.activities}>
                                  {row.activities || "—"}
                                </td>
                                <td className="px-5 py-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    {row._id && (row.realStatus === "Submitted" || row.realStatus === "Draft" || row.realStatus === "Edited") && (
                                      <button
                                        type="button"
                                        onClick={() => setExpandedWeek(expandedWeek === row.weekNumber ? null : row.weekNumber)}
                                        className="rounded bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold px-2.5 py-1 text-[10px] transition shadow-sm cursor-pointer"
                                      >
                                        {expandedWeek === row.weekNumber ? "Hide Details" : "View Details"}
                                      </button>
                                    )}
                                    {row.unlockRequested && row._id ? (
                                      <button
                                        type="button"
                                        onClick={() => handleUnlockAndApprove(row._id!, row.weekNumber)}
                                        className="rounded bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1 text-[10px] transition shadow-sm cursor-pointer"
                                      >
                                        Unlock week
                                      </button>
                                    ) : (
                                      !row._id && <span className="text-slate-400 text-[11px]">—</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              {/* Expanded Row Content */}
                              {expandedWeek === row.weekNumber && row._id && (
                                <tr>
                                  <td colSpan={5} className="px-5 py-4 bg-slate-50 border-t border-slate-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                      <div>
                                        <h5 className="font-bold text-[#1e3a5f] text-xs uppercase mb-2">Tasks Completed</h5>
                                        <p className="text-slate-700 whitespace-pre-wrap">{row.activities || "None provided."}</p>
                                      </div>
                                      <div>
                                        <h5 className="font-bold text-[#1e3a5f] text-xs uppercase mb-2">Challenges Encountered</h5>
                                        <p className="text-slate-700 whitespace-pre-wrap">{row.challengesEncountered || "None provided."}</p>
                                      </div>
                                      <div>
                                        <h5 className="font-bold text-[#1e3a5f] text-xs uppercase mb-2">Reflections</h5>
                                        <p className="text-slate-700 whitespace-pre-wrap">{row.reflections || "None provided."}</p>
                                      </div>
                                      <div>
                                        <h5 className="font-bold text-[#1e3a5f] text-xs uppercase mb-2">Skills Gained</h5>
                                        <div className="flex flex-wrap gap-2">
                                          {row.skillsGained && row.skillsGained.length > 0 ? (
                                            row.skillsGained.map((skill, idx) => (
                                              <span key={idx} className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-1 rounded-full">
                                                {skill}
                                              </span>
                                            ))
                                          ) : (
                                            <p className="text-slate-500 italic">No skills added.</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Side: Milestone Tracker */}
                  <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-800 mb-4 tracking-wide">Milestone Tracker</h4>
                    
                    <div className="grid grid-cols-6 gap-2.5">
                      {fullWeeksList.map((w) => {
                        let bgClass = "bg-slate-100 text-slate-400";
                        if (w.realStatus === "Submitted") bgClass = "bg-[#1e3a5f] text-white";
                        else if (w.realStatus === "Draft" || w.realStatus === "Edited") bgClass = "bg-sky-500 text-white font-black";

                        return (
                          <div
                            key={w.weekNumber}
                            className={`h-9 rounded-md flex items-center justify-center text-xs font-bold shadow-sm border border-black/5 ${bgClass}`}
                            title={`Week ${w.weekNumber}`}
                          >
                            {w.weekNumber}
                          </div>
                        );
                      })}
                    </div>

                    {/* Legend Indicators */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-700 px-1">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-[#1e3a5f]"></span>
                        <span>Submitted</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-sky-500"></span>
                        <span>Draft/Edited</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-slate-100"></span>
                        <span>Not Started</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Stats Panel (FR-D22) */}
                  <div className="rounded-2xl bg-[#f8fafc] p-5 border border-slate-200 shadow-sm mt-4">
                    <h4 className="text-xs font-bold text-slate-800 mb-4 tracking-wide">Weekly Progress Summary</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Completed</p>
                        <p className="text-2xl font-black text-[#1e3a5f] mt-1">{completedWeeksCount} <span className="text-sm font-semibold text-slate-400">/ 24</span></p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pending Drafts</p>
                        <p className="text-2xl font-black text-sky-600 mt-1">{studentWeeks.filter(w => w.status === "Draft" || w.status === "Edited").length}</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs col-span-2 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Active Week</p>
                          <p className="text-lg font-bold text-slate-700 mt-0.5">
                            {fullWeeksList.find(w => new Date() >= new Date(w.period.split(" - ")[0]) && new Date() <= new Date(w.period.split(" - ")[1]))?.weekNumber || "Outside Period"}
                          </p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-lg">
                          📅
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}