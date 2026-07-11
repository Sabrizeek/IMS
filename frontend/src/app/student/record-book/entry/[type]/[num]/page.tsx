"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Info, UploadCloud, FileText, CheckCircle, ArrowLeft, Send, Save, Clock } from "lucide-react";
import { StudentNav } from "@/components/layout/StudentNav";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export default function RecordBookEntryPage({ params: paramsPromise }: { params: Promise<{ type: string; num: string }> }) {
  const { user, ready } = useAuth();
  useAuthGuard("student", "/student/login");
  const router = useRouter();

  const params = use(paramsPromise);
  const isWeekly = params.type === "weekly";
  const num = parseInt(params.num, 10);

  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<any>(null);
  const [periodDetails, setPeriodDetails] = useState<{ start: Date; end: Date } | null>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!ready || user?.role !== "student") return;

    const loadData = async () => {
      try {
        const token = sessionStorage.getItem("ims.student.token");
        if (!token) return;

        // Fetch internship for start date
        const internRes = await fetch("http://localhost:5000/api/internships/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const internData = await internRes.json();
        const startDateStr = internData.application?.internshipStartDate;
        
        if (!startDateStr) {
          router.push("/student/record-book");
          return;
        }

        const baseDate = new Date(startDateStr);
        const start = new Date(baseDate);
        const end = new Date(baseDate);

        if (isWeekly) {
          start.setDate(baseDate.getDate() + (num - 1) * 7);
          end.setDate(start.getDate() + 6);
        } else {
          start.setDate(baseDate.getDate() + (num - 1) * 28);
          end.setDate(start.getDate() + 27);
        }
        setPeriodDetails({ start, end });

        // Fetch records
        const endpoint = isWeekly ? "weekly-records" : "monthly-records";
        const res = await fetch(`http://localhost:5000/api/${endpoint}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const match = data.records.find((r: any) => 
            isWeekly ? r.weekNumber === num : r.monthNumber === num
          );
          if (match) setRecord(match);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [ready, user, isWeekly, num, router]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== "application/pdf") {
        showToast("Please select a valid PDF file.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type !== "application/pdf") {
        showToast("Please drop a valid PDF file.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      showToast("Please select a file to submit.");
      return;
    }
    
    setIsUploading(true);
    const token = sessionStorage.getItem("ims.student.token");
    const formData = new FormData();
    formData.append("file", selectedFile);
    
    if (isWeekly) {
      formData.append("weekNumber", num.toString());
      formData.append("weekStart", periodDetails!.start.toISOString().split("T")[0]);
      formData.append("weekEnd", periodDetails!.end.toISOString().split("T")[0]);
    } else {
      formData.append("monthNumber", num.toString());
      formData.append("monthStart", periodDetails!.start.toISOString().split("T")[0]);
      formData.append("monthEnd", periodDetails!.end.toISOString().split("T")[0]);
    }

    const endpoint = isWeekly ? "weekly-records" : "monthly-records";
    
    try {
      let res;
      if (record && record._id) {
        res = await fetch(`http://localhost:5000/api/${endpoint}/${record._id}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      } else {
        res = await fetch(`http://localhost:5000/api/${endpoint}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      }

      if (res.ok) {
        showToast("Log submitted successfully!");
        const data = await res.json();
        setRecord(data.record);
        setSelectedFile(null);
      } else {
        const errorData = await res.json();
        showToast(errorData.message || "Failed to submit log.");
      }
    } catch (err) {
      console.error(err);
      showToast("An error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!ready || loading) {
    return <div className="min-h-screen bg-[#9bc6d9] flex items-center justify-center font-bold text-navy-deep">Loading...</div>;
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const startMonthName = periodDetails && !isNaN(periodDetails.start.getMonth()) 
    ? monthNames[periodDetails.start.getMonth()] || "" 
    : "";

  let deadlineDate: Date | null = null;
  let countdownText = "";
  let isPastDeadline = false;

  if (periodDetails) {
    deadlineDate = new Date(periodDetails.end);
    deadlineDate.setDate(deadlineDate.getDate() + (isWeekly ? 3 : 5));
    deadlineDate.setHours(23, 59, 59, 999);

    const diffMs = deadlineDate.getTime() - now.getTime();
    if (diffMs < 0) {
      isPastDeadline = true;
      countdownText = "Deadline passed";
    } else {
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
      if (days > 0) {
        countdownText = `${days} day${days > 1 ? 's' : ''} ${hours} hr${hours !== 1 ? 's' : ''} left`;
      } else {
        const mins = Math.floor((diffMs / (1000 * 60)) % 60);
        countdownText = `${hours} hr${hours !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''} left`;
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#9bc6d9] font-sans">
      <StudentNav />
      
      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-slate-800 px-6 py-3 text-sm font-bold text-white shadow-xl transition-all">
          {toastMessage}
        </div>
      )}

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 flex flex-col">
        {/* Top Header Area */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button onClick={() => router.push("/student/record-book")} className="flex items-center gap-2 text-sm font-bold text-[#1e3a5f] hover:text-[#0f2038] mb-2 transition">
              <ArrowLeft className="w-4 h-4" /> Back to Record Book
            </button>
            <h1 className="text-2xl md:text-3xl font-black text-[#1e3a5f] tracking-tight">
              {isWeekly ? "Weekly" : "Monthly"} Internship Log <span className="opacity-70">/ {isWeekly ? "Week" : "Month"} {num.toString().padStart(2, '0')}</span>
            </h1>
            <p className="mt-1 text-sm font-semibold text-[#3b6287]">Record your progress, challenges, and reflections for the academic {isWeekly ? "week" : "month"}.</p>
          </div>
          <div className="flex gap-3">

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedFile || isUploading}
              className="flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#152b47] transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> {isUploading ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Left Sidebar */}
          <div className="w-full lg:w-[320px] shrink-0 space-y-6">
            
            {/* Toggle */}
            <div className="flex bg-[#d7e8f0] rounded-xl p-1 shadow-sm">
              <button
                onClick={() => !isWeekly && router.push(`/student/record-book/entry/weekly/${num}`)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-black transition ${isWeekly ? 'bg-[#1e3a5f] text-white shadow-sm' : 'text-[#3b6287] hover:bg-white/50'}`}
              >
                Weekly Log
              </button>
              <button
                onClick={() => isWeekly && router.push(`/student/record-book/entry/monthly/${num}`)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-black transition ${!isWeekly ? 'bg-[#1e3a5f] text-white shadow-sm' : 'text-[#3b6287] hover:bg-white/50'}`}
              >
                Monthly Log
              </button>
            </div>

            {/* Log Context Card */}
            <div className="bg-[#d7e8f0] rounded-2xl p-6 shadow-sm border border-white/40">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-[#1e3a5f] flex items-center justify-center text-white">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="font-black text-[#1e3a5f] text-lg">Log Context</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#567a96] mb-1.5 block">{isWeekly ? "WEEK" : "MONTH"}</label>
                  <div className="bg-[#c2dde8] border border-[#a4c8d9] rounded-lg px-4 py-2.5 text-sm font-bold text-[#1e3a5f]">
                    {startMonthName ? startMonthName.toUpperCase() : "MONTH"} ({isWeekly ? "Week" : "Month"} {num})
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#567a96] mb-1.5 block">REPORTING PERIOD</label>
                  <div className="bg-[#c2dde8] border border-[#a4c8d9] rounded-lg px-4 py-2.5 text-sm font-bold text-[#1e3a5f] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#567a96]" />
                    {periodDetails?.start.toLocaleDateString()} - {periodDetails?.end.toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#567a96] mb-1.5 block">START DATE</label>
                  <div className="bg-[#c2dde8] border border-[#a4c8d9] rounded-lg px-4 py-2.5 text-sm font-bold text-[#1e3a5f] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#567a96]" />
                    {periodDetails?.start.toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#567a96] mb-1.5 block">END DATE</label>
                  <div className="bg-[#c2dde8] border border-[#a4c8d9] rounded-lg px-4 py-2.5 text-sm font-bold text-[#1e3a5f] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#567a96]" />
                    {periodDetails?.end.toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#567a96] mb-1.5 flex justify-between items-center">
                    <span>DEADLINE</span>
                    {countdownText && (
                      <span className={`px-2 py-0.5 rounded text-[9px] ${isPastDeadline ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                        {countdownText}
                      </span>
                    )}
                  </label>
                  <div className={`border rounded-lg px-4 py-2.5 text-sm font-bold flex items-center gap-2 ${isPastDeadline ? 'bg-red-50 border-red-200 text-red-700' : 'bg-[#c2dde8] border-[#a4c8d9] text-[#1e3a5f]'}`}>
                    <Clock className={`w-4 h-4 ${isPastDeadline ? 'text-red-500' : 'text-[#567a96]'}`} />
                    {deadlineDate?.toLocaleDateString()} (11:59 PM)
                  </div>
                </div>
              </div>
            </div>

            {/* Template Download Card */}
            <div className="bg-[#d7e8f0] rounded-2xl p-6 shadow-sm border border-white/40">
              <h3 className="font-black text-[#1e3a5f] text-sm mb-3 uppercase tracking-wider">
                {isWeekly ? "Weekly" : "Monthly"} Template
              </h3>
              <a
                href={`http://localhost:5000/templates/${isWeekly ? 'Weekly_Log_Template.docx' : 'Monthly_Progress_Report.docx'}`}
                download
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-[#1e3a5f] hover:bg-[#152b47] text-white text-sm font-bold shadow-sm transition"
              >
                <FileText className="w-4 h-4" />
                Download .docx
              </a>
              <p className="mt-3 text-[11px] font-semibold text-[#567a96] text-center leading-relaxed">
                Download the official template, fill it out, sign it, save as PDF, and upload it here.
              </p>
            </div>

            {/* Pro-Tip Card */}
            <div className="bg-[#1e3a5f] rounded-2xl p-6 shadow-sm text-white">
              <div className="flex items-center gap-3 mb-3">
                <Info className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-lg">Pro-Tip</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                Focus on quantifiable achievements. Instead of "Worked on bugs," try "Resolved 5 critical security vulnerabilities in the authentication module."
              </p>
            </div>
            
          </div>

          {/* Right Main Area */}
          <div className="flex-1 min-h-[500px] w-full flex flex-col">
            {record ? (
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-10 flex flex-col items-center justify-center border border-white/50 shadow-sm flex-1 text-center">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Log Successfully Submitted</h2>
                <p className="text-slate-500 font-medium mb-8 max-w-sm">Your log has been securely saved to the database. You can view or replace the file below.</p>
                
                <div className="flex flex-col gap-4 w-full max-w-xs">
                  <a 
                    href={`http://localhost:5000/uploads/${record.filePath.split(/[\\/]/).pop()}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-[#d7e8f0] text-[#1e3a5f] font-bold py-3 px-6 rounded-xl hover:bg-[#c2dde8] transition"
                  >
                    <FileText className="w-5 h-5" /> View Uploaded PDF
                  </a>
                  
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="application/pdf" 
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex items-center justify-center gap-2 border-2 border-dashed border-[#1e3a5f]/30 text-[#1e3a5f] font-bold py-3 px-6 rounded-xl hover:bg-[#1e3a5f]/5 transition">
                      <UploadCloud className="w-5 h-5" /> Replace File
                    </div>
                  </div>
                  {selectedFile && (
                    <div className="text-sm font-bold text-teal-600 mt-2 bg-teal-50 py-2 px-3 rounded-lg flex items-center justify-between">
                      <span className="truncate">{selectedFile.name}</span>
                      <button onClick={() => setSelectedFile(null)} className="text-red-500 hover:text-red-700 ml-2">✕</button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div 
                className="bg-white/80 backdrop-blur-sm rounded-3xl p-10 flex flex-col items-center justify-center border-2 border-dashed border-[#1e3a5f]/20 hover:border-[#1e3a5f]/50 shadow-sm flex-1 text-center transition-colors relative"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  accept="application/pdf" 
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                
                <div className="w-24 h-24 bg-[#d7e8f0] rounded-full flex items-center justify-center text-[#1e3a5f] mb-6 shadow-sm">
                  <UploadCloud className="w-12 h-12" />
                </div>
                
                {selectedFile ? (
                  <>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">File Selected</h2>
                    <p className="text-slate-600 font-bold mb-6 truncate max-w-md bg-slate-100 py-2 px-4 rounded-lg">{selectedFile.name}</p>
                    <p className="text-sm font-bold text-amber-600 bg-amber-50 py-2 px-4 rounded-lg z-20 relative">
                      Click the "Submit" button at the top right to upload.
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-black text-[#1e3a5f] mb-3">Upload your PDF Log</h2>
                    <p className="text-slate-500 font-medium mb-1">Drag and drop your signed PDF file here</p>
                    <p className="text-slate-400 text-sm font-medium mb-8">or click anywhere to browse your files</p>
                    <div className="bg-[#1e3a5f] text-white font-bold py-3 px-8 rounded-xl shadow-sm z-20 pointer-events-none">
                      Select File
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
