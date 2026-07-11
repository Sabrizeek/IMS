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
  duration?: string;
  rejectionReason: string;
}

interface LogRecordData {
  _id?: string;
  weekNumber?: number;
  monthNumber?: number;
  weekStart?: string;
  weekEnd?: string;
  monthStart?: string;
  monthEnd?: string;
  isLateSubmission?: boolean;
  status?: "Pending" | "Submitted" | "Missing";
  submittedAt?: string;
}

export default function DepartmentApprovalsPage() {
  const { user, ready } = useAuth();
  useAuthGuard("department", "/department/auth");
  const router = useRouter();

  const [placements, setPlacements] = useState<PlacementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRequest, setActiveRequest] = useState<PlacementRequest | null>(null);
  const [isRecordBookOpen, setIsRecordBookOpen] = useState(false);
  const [studentWeeks, setStudentWeeks] = useState<LogRecordData[]>([]);
  const [studentMonths, setStudentMonths] = useState<LogRecordData[]>([]);
  const [recordBookTab, setRecordBookTab] = useState<"weekly" | "monthly">("weekly");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [searchQuery, setSearchQuery] = useState("");
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
    let list = placements;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.student?.toLowerCase().includes(q) ||
          p.id?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q) ||
          p.company?.toLowerCase().includes(q)
      );
    }

    return list.filter((p) => {
      if (activeTab === "all") return true;
      if (activeTab === "pending") return p.status === "Pending Review";
      if (activeTab === "approved") return p.status === "Approved";
      if (activeTab === "rejected") return p.status === "Rejected";
      return true;
    });
  }, [placements, activeTab, searchQuery]);

  const handleDownloadPlacements = () => {
    const headers = ["Student Name", "Registration No", "Company", "Job Position", "Start Date", "Status"];
    let csv = headers.join(",") + "\n";
    filteredPlacements.forEach((p) => {
      csv += `"${p.student || ''}","${p.id || ''}","${p.company || ''}","${p.role || ''}","${p.internshipStartDate || ''}","${p.status || ''}"\n`;
    });
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "internship_approvals.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openReview = (request: PlacementRequest) => {
    router.push(`/department/approvals/${request._id}`);
  };

  const closeOverlay = () => {
    setIsRecordBookOpen(false);
    setActiveRequest(null);
  };

  const openRecordBook = async (request: PlacementRequest) => {
    setActiveRequest(request);
    setActionMessage(null);
    setRecordBookTab("weekly");

    try {
      const token = sessionStorage.getItem("ims.department.token");
      const wRes = await fetch(`http://localhost:5000/api/weekly-records/student/${request.studentUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const mRes = await fetch(`http://localhost:5000/api/monthly-records/student/${request.studentUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (wRes.ok && mRes.ok) {
        const wData = await wRes.json();
        const mData = await mRes.json();
        setStudentWeeks(wData.records || []);
        setStudentMonths(mData.records || []);
        setIsRecordBookOpen(true);
      } else {
        alert("Failed to access student's record book.");
      }
    } catch {
      alert("Unable to connect to backend server.");
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

  const parseBaseDate = () => {
    if (!activeRequest || !activeRequest.internshipStartDate) return new Date();
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
    return baseDate;
  };

  const getStatusDisplay = (record: any, endStr: string, graceDays: number) => {
    if (!record || record.status === "Pending") {
      const end = new Date(endStr);
      const deadline = new Date(end);
      deadline.setDate(deadline.getDate() + graceDays);
      deadline.setHours(23,59,59,999);
      
      const now = new Date();
      if (now < new Date(endStr)) return "Upcoming";
      if (now <= deadline) return "Pending";
      return "Missing";
    }
    if (record.status === "Submitted") {
      return record.isLateSubmission ? "Submitted (Late)" : "Submitted";
    }
    return record.status;
  };

  const fullWeeksList = useMemo(() => {
    const baseDate = parseBaseDate();
    const list = [];
    for (let i = 1; i <= 24; i++) {
      const start = new Date(baseDate);
      start.setDate(baseDate.getDate() + (i - 1) * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);

      const match = studentWeeks.find((w) => w.weekNumber === i);
      const endStr = end.toISOString().split("T")[0];
      
      list.push({
        num: i,
        period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
        status: getStatusDisplay(match, endStr, 3),
        record: match,
      });
    }
    return list;
  }, [activeRequest, studentWeeks]);

  const fullMonthsList = useMemo(() => {
    const baseDate = parseBaseDate();
    const list = [];
    for (let i = 1; i <= 6; i++) {
      const start = new Date(baseDate);
      start.setDate(baseDate.getDate() + (i - 1) * 28);
      const end = new Date(start);
      end.setDate(start.getDate() + 27);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);

      const match = studentMonths.find((w) => w.monthNumber === i);
      const endStr = end.toISOString().split("T")[0];
      
      list.push({
        num: i,
        period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
        status: getStatusDisplay(match, endStr, 5),
        record: match,
      });
    }
    return list;
  }, [activeRequest, studentMonths]);

  const completedWeeksCount = useMemo(() => studentWeeks.filter(w => w.status === "Submitted").length, [studentWeeks]);
  const completedMonthsCount = useMemo(() => studentMonths.filter(w => w.status === "Submitted").length, [studentMonths]);

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

          <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex flex-nowrap items-center gap-1.5 rounded-[20px] bg-slate-100/80 p-1.5 border border-slate-200 shadow-inner overflow-x-auto">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all duration-200 ${
                    activeTab === "all"
                      ? "bg-navy-deep text-white shadow-md"
                      : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                  }`}
                >
                  All ({placements.length})
                </button>
                <button
                  onClick={() => setActiveTab("pending")}
                  className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all duration-200 ${
                    activeTab === "pending"
                      ? "bg-navy-deep text-white shadow-md"
                      : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                  }`}
                >
                  Pending Review ({placements.filter(p => p.status === "Pending Review").length})
                </button>
                <button
                  onClick={() => setActiveTab("approved")}
                  className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all duration-200 ${
                    activeTab === "approved"
                      ? "bg-navy-deep text-white shadow-md"
                      : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                  }`}
                >
                  Approved ({placements.filter(p => p.status === "Approved").length})
                </button>
                <button
                  onClick={() => setActiveTab("rejected")}
                  className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all duration-200 ${
                    activeTab === "rejected"
                      ? "bg-navy-deep text-white shadow-md"
                      : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                  }`}
                >
                  Rejected ({placements.filter(p => p.status === "Rejected").length})
                </button>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-slate-400">🔍</span>
                </div>
                <input
                  type="text"
                  placeholder="Search name, ID, company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:border-navy-deep focus:bg-white focus:outline-none focus:ring-1 focus:ring-navy-deep transition"
                />
              </div>
              <button
                onClick={handleDownloadPlacements}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 hover:text-navy-deep shadow-sm ml-auto sm:ml-2 whitespace-nowrap"
              >
                Download CSV
              </button>
            </div>
            <div className="max-h-[600px] overflow-auto rounded-xl border border-slate-200 mt-4">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-4">Student & ID</th>
                    <th className="px-6 py-4">Company</th>
                    <th className="px-6 py-4">Job Position</th>
                    <th className="px-6 py-4">Duration</th>
                    <th className="px-6 py-4">Date Submitted</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredPlacements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-500 italic">No placement requests in this filter criteria.</td>
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
                        <td className="px-6 py-4 font-medium text-slate-700">{row.duration || "N/A"}</td>
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
                  
                  {/* Left Side: Logs Table */}
                  <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    {/* Tabs */}
                    <div className="flex border-b border-slate-200 bg-slate-50">
                      <button
                        onClick={() => setRecordBookTab("weekly")}
                        className={`flex-1 py-4 text-xs uppercase tracking-widest font-bold transition ${recordBookTab === "weekly" ? "border-b-2 border-navy-deep text-navy-deep bg-white" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        Weekly Logs
                      </button>
                      <button
                        onClick={() => setRecordBookTab("monthly")}
                        className={`flex-1 py-4 text-xs uppercase tracking-widest font-bold transition ${recordBookTab === "monthly" ? "border-b-2 border-navy-deep text-navy-deep bg-white" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        Monthly Reports
                      </button>
                    </div>

                    <div className="max-h-[500px] overflow-auto">
                      <table className="min-w-full text-left text-xs">
                        <thead className="bg-[#78a5c9]/20 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                          <tr>
                            <th className="px-5 py-3">Period #</th>
                            <th className="px-5 py-3">Date Range</th>
                            <th className="px-5 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(recordBookTab === "weekly" ? fullWeeksList : fullMonthsList).map((row) => (
                            <tr key={row.num} className="hover:bg-slate-50/50 transition">
                              <td className="px-5 py-4 font-bold text-slate-900">
                                {recordBookTab === "weekly" ? "Week" : "Month"} {row.num}
                              </td>
                              <td className="px-5 py-4 text-slate-600 font-medium">{row.period}</td>
                              <td className="px-5 py-4">
                                {row.status.includes("Late") ? (
                                  <span className="inline-block rounded bg-orange-100 text-orange-800 font-bold px-2 py-0.5 text-[9px] uppercase">
                                    {row.status}
                                  </span>
                                ) : row.status.includes("Submitted") ? (
                                  <span className="inline-block rounded bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 text-[9px] uppercase">
                                    {row.status}
                                  </span>
                                ) : row.status === "Pending" ? (
                                  <span className="inline-block rounded bg-amber-100 text-amber-800 font-bold px-2 py-0.5 text-[9px] uppercase">
                                    PENDING
                                  </span>
                                ) : row.status === "Missing" ? (
                                  <span className="inline-block rounded bg-red-100 text-red-800 font-bold px-2 py-0.5 text-[9px] uppercase">
                                    MISSING
                                  </span>
                                ) : (
                                  <span className="inline-block rounded bg-slate-200 text-slate-600 font-bold px-2 py-0.5 text-[9px] uppercase">
                                    UPCOMING
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Side: Milestone Tracker */}
                  <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-800 mb-4 tracking-wide uppercase">Milestone Tracker</h4>
                    
                    <div className="mb-6">
                      <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase">Weekly Progress</p>
                      <div className="grid grid-cols-6 gap-2.5">
                        {fullWeeksList.map((w) => {
                          let bgClass = "bg-slate-100 text-slate-400";
                          if (w.status.includes("Submitted")) bgClass = "bg-emerald-500 text-white shadow-sm";
                          else if (w.status === "Missing") bgClass = "bg-red-500 text-white shadow-sm";
                          else if (w.status === "Pending") bgClass = "bg-amber-400 text-white shadow-sm";

                          return (
                            <div
                              key={w.num}
                              title={`Week ${w.num}: ${w.status}`}
                              className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black transition-all ${bgClass}`}
                            >
                              {w.num}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase">Monthly Progress</p>
                      <div className="grid grid-cols-6 gap-2.5">
                        {fullMonthsList.map((m) => {
                          let bgClass = "bg-slate-100 text-slate-400";
                          if (m.status.includes("Submitted")) bgClass = "bg-emerald-500 text-white shadow-sm";
                          else if (m.status === "Missing") bgClass = "bg-red-500 text-white shadow-sm";
                          else if (m.status === "Pending") bgClass = "bg-amber-400 text-white shadow-sm";

                          return (
                            <div
                              key={m.num}
                              title={`Month ${m.num}: ${m.status}`}
                              className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black transition-all ${bgClass}`}
                            >
                              {m.num}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Summary Stats Panel */}
                  <div className="rounded-2xl bg-[#f8fafc] p-5 border border-slate-200 shadow-sm mt-4">
                    <h4 className="text-xs font-bold text-slate-800 mb-4 tracking-wide uppercase">Progress Summary</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Weekly</p>
                        <p className="text-2xl font-black text-[#1e3a5f] mt-1">{completedWeeksCount} <span className="text-sm font-semibold text-slate-400">/ 24</span></p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Monthly</p>
                        <p className="text-2xl font-black text-sky-600 mt-1">{completedMonthsCount} <span className="text-sm font-semibold text-slate-400">/ 6</span></p>
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