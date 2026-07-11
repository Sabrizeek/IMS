"use client";

import { useEffect, useState, useMemo } from "react";
import { Download, CheckCircle, Clock, AlertCircle, ChevronRight } from "lucide-react";
import { StudentNav } from "@/components/layout/StudentNav";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useRouter } from "next/navigation";

interface LogRecord {
  _id?: string;
  periodNumber: number;
  periodStart: string;
  periodEnd: string;
  filePath: string;
  originalFilename: string;
  isLateSubmission: boolean;
  status: "Pending" | "Submitted" | "Missing";
  submittedAt?: string;
}

export default function RecordBookPage() {
  const { user, ready } = useAuth();
  useAuthGuard("student", "/student/login");
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"weekly" | "monthly">("weekly");
  const [internshipApproved, setInternshipApproved] = useState(false);
  const [internshipStartDate, setInternshipStartDate] = useState<string | null>(null);
  
  const [weeklyRecords, setWeeklyRecords] = useState<LogRecord[]>([]);
  const [monthlyRecords, setMonthlyRecords] = useState<LogRecord[]>([]);
  
  const [loading, setLoading] = useState(true);
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

          // Fetch weekly
          const wRes = await fetch("http://localhost:5000/api/weekly-records/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (wRes.ok) {
            const wData = await wRes.json();
            setWeeklyRecords(wData.records.map((r: any) => ({
              ...r, periodNumber: r.weekNumber, periodStart: r.weekStart, periodEnd: r.weekEnd
            })));
          }

          // Fetch monthly
          const mRes = await fetch("http://localhost:5000/api/monthly-records/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (mRes.ok) {
            const mData = await mRes.json();
            setMonthlyRecords(mData.records.map((r: any) => ({
              ...r, periodNumber: r.monthNumber, periodStart: r.monthStart, periodEnd: r.monthEnd
            })));
          }
        } else {
          setInternshipApproved(false);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ready && user?.role === "student") {
      checkInternshipAndLoadRecords();
    }
  }, [ready, user]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const getStatusBadge = (record?: LogRecord, expectedEndStr?: string, graceDays = 3) => {
    if (!record || record.status === "Pending") {
      const end = new Date(expectedEndStr || "");
      const deadline = new Date(end);
      deadline.setDate(deadline.getDate() + graceDays);
      deadline.setHours(23,59,59,999);
      
      const now = new Date();
      if (now < new Date(expectedEndStr || "")) {
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500"><Clock className="w-3 h-3" /> Upcoming</span>;
      } else if (now <= deadline) {
        const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 3600 * 24));
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-600"><AlertCircle className="w-3 h-3" /> Due in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>;
      } else {
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600"><AlertCircle className="w-3 h-3" /> Missing (Overdue)</span>;
      }
    }

    if (record.status === "Submitted") {
      return record.isLateSubmission 
        ? <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-600"><CheckCircle className="w-3 h-3" /> Submitted (Late)</span>
        : <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600"><CheckCircle className="w-3 h-3" /> Submitted (On Time)</span>;
    }

    return null;
  };

  const handleDownload = async (e: React.MouseEvent, url: string, filename: string) => {
    e.preventDefault();
    try {
      showToast("Downloading...");
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
      showToast("Download failed. Please try again.");
    }
  };

  const weeksList = useMemo(() => {
    if (!internshipStartDate) return [];
    const baseDate = new Date(internshipStartDate);
    const list = [];
    
    const submittedWeeks = weeklyRecords.filter(r => r.status === "Submitted").map(r => r.periodNumber);

    for (let i = 1; i <= 24; i++) {
      const start = new Date(baseDate);
      start.setDate(baseDate.getDate() + (i - 1) * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);

      const record = weeklyRecords.find((r) => r.periodNumber === i);
      const isPast = new Date() > end;
      const isFuture = new Date() < start;
      const deadline = new Date(end);
      deadline.setDate(deadline.getDate() + 3);
      const isPastDeadline = new Date() > deadline;

      let isLocked = false;
      let lockReason = "";
      if (isFuture) {
        isLocked = true;
        lockReason = `Available starting ${start.toLocaleDateString()}`;
      } else if (i > 1 && !submittedWeeks.includes(i - 1)) {
        isLocked = true;
        lockReason = `Must submit Week ${i - 1} first`;
      } else if (isPastDeadline && (!record || record.status !== "Submitted")) {
        isLocked = true;
        lockReason = "Deadline has passed";
      }

      // Filter logic: show the next pending week, or any submitted weeks, or week 1.
      const shouldShow = i === 1 || submittedWeeks.includes(i) || (!submittedWeeks.includes(i) && (i === 1 || submittedWeeks.includes(i - 1)));

      if (shouldShow) {
        list.push({
          num: i,
          startStr: start.toISOString().split("T")[0],
          endStr: end.toISOString().split("T")[0],
          record,
          isLocked,
          lockReason,
          isPastDeadline
        });
      }
    }
    return list;
  }, [internshipStartDate, weeklyRecords]);

  const monthsList = useMemo(() => {
    if (!internshipStartDate) return [];
    const baseDate = new Date(internshipStartDate);
    const list = [];
    
    const submittedMonths = monthlyRecords.filter(r => r.status === "Submitted").map(r => r.periodNumber);

    for (let i = 1; i <= 6; i++) {
      const start = new Date(baseDate);
      start.setDate(baseDate.getDate() + (i - 1) * 28);
      const end = new Date(start);
      end.setDate(start.getDate() + 27);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);

      const record = monthlyRecords.find((r) => r.periodNumber === i);
      const isFuture = new Date() < start;
      const deadline = new Date(end);
      deadline.setDate(deadline.getDate() + 5);
      const isPastDeadline = new Date() > deadline;

      let isLocked = false;
      let lockReason = "";
      if (isFuture) {
        isLocked = true;
        lockReason = `Available starting ${start.toLocaleDateString()}`;
      } else if (i > 1 && !submittedMonths.includes(i - 1)) {
        isLocked = true;
        lockReason = `Must submit Month ${i - 1} first`;
      } else if (isPastDeadline && (!record || record.status !== "Submitted")) {
        isLocked = true;
        lockReason = "Deadline has passed";
      }

      const shouldShow = i === 1 || submittedMonths.includes(i) || (!submittedMonths.includes(i) && (i === 1 || submittedMonths.includes(i - 1)));

      if (shouldShow) {
        list.push({
          num: i,
          startStr: start.toISOString().split("T")[0],
          endStr: end.toISOString().split("T")[0],
          record,
          isLocked,
          lockReason,
          isPastDeadline
        });
      }
    }
    return list;
  }, [internshipStartDate, monthlyRecords]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-deep border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans">
      <StudentNav />
      
      <main className="flex-grow mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-3xl font-black text-[#1e3a5f] tracking-tight">Record Book</h1>
            <a href="http://localhost:5000/templates/Novation_Report_Template.docx" download className="flex items-center gap-2 rounded-lg bg-[#c2dde8] text-[#1e3a5f] px-4 py-2 text-xs font-bold hover:bg-[#a4c8d9] transition shadow-sm border border-[#a4c8d9]">
              <Download className="h-4 w-4" /> Download Novation Report Template (.docx)
            </a>
          </div>
          {toastMessage && (
            <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg text-sm font-bold shadow-sm animate-pulse">
              {toastMessage}
            </div>
          )}
        </div>

        {!internshipApproved ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
            <h3 className="text-xl font-bold text-amber-800">Internship Not Approved</h3>
            <p className="mt-2 text-sm text-amber-700">Your record book will be unlocked once the department approves your internship request.</p>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50">
              <button
                onClick={() => setActiveTab("weekly")}
                className={`flex-1 py-4 text-sm font-bold transition ${activeTab === "weekly" ? "border-b-2 border-navy-deep text-navy-deep bg-white" : "text-slate-500 hover:text-slate-700"}`}
              >
                Weekly Logs
              </button>
              <button
                onClick={() => setActiveTab("monthly")}
                className={`flex-1 py-4 text-sm font-bold transition ${activeTab === "monthly" ? "border-b-2 border-navy-deep text-navy-deep bg-white" : "text-slate-500 hover:text-slate-700"}`}
              >
                Monthly Reports
              </button>
            </div>

            <div className="p-8">
              {activeTab === "weekly" ? (
                <div>

                  
                  <div className="space-y-4">
                    {weeksList.map((item) => (
                      <div key={item.num} className={`flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border ${item.isLocked ? 'border-slate-200 bg-slate-50 opacity-70' : 'border-slate-200 bg-white shadow-sm'} transition`}>
                        <div>
                          <div className="flex items-center gap-3">
                            <h4 className="text-lg font-black text-slate-800">Week {item.num.toString().padStart(2, '0')}</h4>
                            {getStatusBadge(item.record, item.endStr, 3)}
                          </div>
                          <p className="text-xs font-bold text-slate-500 mt-1">{item.startStr} — {item.endStr}</p>
                          {item.isLocked && <p className="text-xs italic text-red-500 mt-1">{item.lockReason}</p>}
                        </div>
                        
                        <div className="mt-4 md:mt-0 flex gap-2">
                          {item.record?.status === "Submitted" && (
                            <button 
                              onClick={(e) => handleDownload(e, `http://localhost:5000/uploads/${item.record!.filePath.split(/[\\/]/).pop()}`, item.record!.originalFilename || `Week_${item.num}_Log.pdf`)}
                              className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm bg-[#e8f4f8] text-[#3b6287] hover:bg-[#d7e8f0]"
                            >
                              <Download className="h-4 w-4" /> Download PDF
                            </button>
                          )}
                          <button
                            onClick={() => router.push(`/student/record-book/entry/weekly/${item.num}`)}
                            disabled={item.isLocked}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm ${item.isLocked ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[#1e3a5f] text-white hover:bg-navy-deep'}`}
                          >
                            Open Entry <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>


                  <div className="space-y-4">
                    {monthsList.map((item) => (
                      <div key={item.num} className={`flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border ${item.isLocked ? 'border-slate-200 bg-slate-50 opacity-70' : 'border-slate-200 bg-white shadow-sm'} transition`}>
                        <div>
                          <div className="flex items-center gap-3">
                            <h4 className="text-lg font-black text-slate-800">Month {item.num.toString().padStart(2, '0')}</h4>
                            {getStatusBadge(item.record, item.endStr, 5)}
                          </div>
                          <p className="text-xs font-bold text-slate-500 mt-1">{item.startStr} — {item.endStr}</p>
                          {item.isLocked && <p className="text-xs italic text-red-500 mt-1">{item.lockReason}</p>}
                        </div>
                        
                        <div className="mt-4 md:mt-0 flex gap-2">
                          {item.record?.status === "Submitted" && (
                            <button 
                              onClick={(e) => handleDownload(e, `http://localhost:5000/uploads/${item.record!.filePath.split(/[\\/]/).pop()}`, item.record!.originalFilename || `Month_${item.num}_Log.pdf`)}
                              className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm bg-[#e8f4f8] text-[#3b6287] hover:bg-[#d7e8f0]"
                            >
                              <Download className="h-4 w-4" /> Download PDF
                            </button>
                          )}
                          <button
                            onClick={() => router.push(`/student/record-book/entry/monthly/${item.num}`)}
                            disabled={item.isLocked}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm ${item.isLocked ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[#1e3a5f] text-white hover:bg-navy-deep'}`}
                          >
                            Open Entry <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
