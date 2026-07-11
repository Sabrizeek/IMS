"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Lock, Unlock, Plus, Pencil, Trash2, Upload, Download, BookOpen, AlertCircle, CheckCircle, Archive, RefreshCw, X, Settings, Eye } from "lucide-react";
import { DepartmentNav } from "@/components/layout/DepartmentNav";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";

const API = "http://localhost:5000/api";

// ─── Types ──────────────────────────────────────────────────────────────────
interface AcademicYear { _id: string; year: string; isLocked: boolean; }
interface Semester { _id: string; academicYearId: string; semesterNumber: number; label: string; isLocked: boolean; }
interface GpaSubject { _id: string; semesterId: string; subjectCode: string; subjectName: string; credits: number; subjectType: "Core" | "Optional"; }
interface UploadRecord { _id: string; version: number; fileName: string; recordCount: number; isActive: boolean; isPublished: boolean; uploadedAt: string; downloadUrl: string; }
interface ValidationError { row: number | null; message: string; }

// ─── Helper ─────────────────────────────────────────────────────────────────
function deptToken() { return sessionStorage.getItem("ims.department.token") ?? ""; }
function authHeaders() { return { Authorization: `Bearer ${deptToken()}`, "Content-Type": "application/json" }; }

export default function GpaManagementPage() {
  useAuthGuard("department", "/department/auth");
  const { user, ready } = useAuth();

  // ─── Data ───────────────────────────────────────────────────────────────────
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<GpaSubject[]>([]);
  const [uploadHistory, setUploadHistory] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Selections ─────────────────────────────────────────────────────────────
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedSemId, setSelectedSemId] = useState<string>("");

  const selectedYear = useMemo(() => years.find(y => y._id === selectedYearId), [years, selectedYearId]);
  const selectedSemester = useMemo(() => semesters.find(s => s._id === selectedSemId), [semesters, selectedSemId]);

  // ─── Modals ─────────────────────────────────────────────────────────────────
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [isSemModalOpen, setIsSemModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewData, setViewData] = useState<{ rows: any[], subjects: string[] } | null>(null);
  const [loadingView, setLoadingView] = useState(false);

  // ─── Form State ─────────────────────────────────────────────────────────────
  const [newYear, setNewYear] = useState("");
  const [editYearId, setEditYearId] = useState<string | null>(null);
  const [editYearVal, setEditYearVal] = useState("");

  const [newSem, setNewSem] = useState({ number: "", label: "" });
  const [editSemId, setEditSemId] = useState<string | null>(null);
  const [editSemVal, setEditSemVal] = useState("");

  const [newSubject, setNewSubject] = useState({ code: "", name: "", credits: "", type: "Core" as "Core" | "Optional" });
  const [editSubjectId, setEditSubjectId] = useState<string | null>(null);
  const [editSubjectData, setEditSubjectData] = useState({ name: "", credits: "", type: "Core" as "Core" | "Optional" });

  // ─── Upload State ───────────────────────────────────────────────────────────
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<ValidationError[] | null>(null);
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // ─── Fetchers ───────────────────────────────────────────────────────────────
  const fetchYears = useCallback(async () => {
    const res = await fetch(`${API}/academic-years`, { headers: authHeaders() });
    const data = await res.json();
    setYears(data.academicYears ?? []);
  }, []);

  const fetchSemesters = useCallback(async (yearId: string) => {
    if (!yearId) { setSemesters([]); return; }
    const res = await fetch(`${API}/semesters?academicYearId=${yearId}`, { headers: authHeaders() });
    const data = await res.json();
    setSemesters(data.semesters ?? []);
  }, []);

  const fetchSubjects = useCallback(async (semId: string) => {
    if (!semId) { setSubjects([]); return; }
    const res = await fetch(`${API}/gpa-subjects?semesterId=${semId}`, { headers: authHeaders() });
    const data = await res.json();
    setSubjects(data.subjects ?? []);
  }, []);

  const fetchHistory = useCallback(async (semId: string) => {
    if (!semId) { setUploadHistory([]); return; }
    const res = await fetch(`${API}/results/history?semesterId=${semId}`, { headers: authHeaders() });
    const data = await res.json();
    setUploadHistory(data.history ?? []);
  }, []);

  // ─── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (ready && user?.role === "department") {
      fetchYears().finally(() => setLoading(false));
    }
  }, [ready, user, fetchYears]);

  useEffect(() => {
    if (selectedYearId) {
      fetchSemesters(selectedYearId);
    } else {
      setSemesters([]);
      setSelectedSemId("");
    }
  }, [selectedYearId, fetchSemesters]);

  useEffect(() => {
    if (selectedSemId) {
      fetchSubjects(selectedSemId);
      fetchHistory(selectedSemId);
      setUploadFile(null);
      setUploadError(null);
      setUploadWarnings([]);
    } else {
      setSubjects([]);
      setUploadHistory([]);
    }
  }, [selectedSemId, fetchSubjects, fetchHistory]);

  // ─── Toast helper ───────────────────────────────────────────────────────────
  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  // ─── Academic Year CRUD ─────────────────────────────────────────────────────
  async function createYear() {
    if (!newYear.trim()) { showToast("Please enter a year", false); return; }
    if (!/^\d{4}\/\d{4}$/.test(newYear.trim())) { showToast("Invalid format. Use YYYY/YYYY (e.g., 2024/2025)", false); return; }
    const res = await fetch(`${API}/academic-years`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify({ year: newYear.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.message, false); return; }
    setNewYear("");
    await fetchYears();
    showToast("Academic year created");
  }

  async function updateYear(id: string) {
    if (!editYearVal.trim()) { showToast("Year cannot be empty", false); return; }
    if (!/^\d{4}\/\d{4}$/.test(editYearVal.trim())) { showToast("Invalid format. Use YYYY/YYYY (e.g., 2024/2025)", false); return; }
    const res = await fetch(`${API}/academic-years/${id}`, {
      method: "PUT", headers: authHeaders(), body: JSON.stringify({ year: editYearVal.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.message, false); return; }
    setEditYearId(null);
    await fetchYears();
    showToast("Academic year updated");
  }

  async function deleteYear(id: string) {
    if (!confirm("Delete this academic year?")) return;
    const res = await fetch(`${API}/academic-years/${id}`, { method: "DELETE", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) { showToast(data.message, false); return; }
    if (selectedYearId === id) { setSelectedYearId(""); }
    await fetchYears();
    showToast("Academic year deleted");
  }

  // ─── Semester CRUD ──────────────────────────────────────────────────────────
  async function createSemester() {
    if (!selectedYearId) { showToast("Select a year first", false); return; }
    if (!newSem.number) { showToast("Semester number is required", false); return; }
    if (!newSem.label.trim() || newSem.label.trim().length < 3) { showToast("Semester label must be at least 3 characters", false); return; }
    const res = await fetch(`${API}/semesters`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ academicYearId: selectedYearId, semesterNumber: Number(newSem.number), label: newSem.label.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.message, false); return; }
    setNewSem({ number: "", label: "" });
    await fetchSemesters(selectedYearId);
    showToast("Semester created");
  }

  async function updateSemester(id: string) {
    if (!editSemVal.trim() || editSemVal.trim().length < 3) { showToast("Semester label must be at least 3 characters", false); return; }
    const res = await fetch(`${API}/semesters/${id}`, {
      method: "PUT", headers: authHeaders(), body: JSON.stringify({ label: editSemVal.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.message, false); return; }
    setEditSemId(null);
    if (selectedYearId) await fetchSemesters(selectedYearId);
    showToast("Semester updated");
  }

  async function deleteSemester(id: string) {
    if (!confirm("Delete this semester? This will also remove all subjects.")) return;
    const res = await fetch(`${API}/semesters/${id}`, { method: "DELETE", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) { showToast(data.message, false); return; }
    if (selectedSemId === id) setSelectedSemId("");
    if (selectedYearId) await fetchSemesters(selectedYearId);
    showToast("Semester deleted");
  }

  // ─── Subject CRUD ───────────────────────────────────────────────────────────
  async function createSubject() {
    if (!selectedSemester || !newSubject.code.trim() || !newSubject.name.trim() || !newSubject.credits) {
      showToast("Please fill all subject fields", false);
      return;
    }
    const res = await fetch(`${API}/gpa-subjects`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({
        semesterId: selectedSemester._id,
        subjectCode: newSubject.code.trim(),
        subjectName: newSubject.name.trim(),
        credits: Number(newSubject.credits),
        subjectType: newSubject.type,
      }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.message, false); return; }
    setNewSubject({ code: "", name: "", credits: "", type: "Core" });
    await fetchSubjects(selectedSemester._id);
    showToast("Subject added");
  }

  async function updateSubject(id: string) {
    const res = await fetch(`${API}/gpa-subjects/${id}`, {
      method: "PUT", headers: authHeaders(),
      body: JSON.stringify({ subjectName: editSubjectData.name.trim(), credits: Number(editSubjectData.credits), subjectType: editSubjectData.type }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.message, false); return; }
    setEditSubjectId(null);
    if (selectedSemester) await fetchSubjects(selectedSemester._id);
    showToast("Subject updated");
  }

  async function deleteSubject(id: string) {
    if (!confirm("Delete this subject?")) return;
    const res = await fetch(`${API}/gpa-subjects/${id}`, { method: "DELETE", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) { showToast(data.message, false); return; }
    if (selectedSemester) await fetchSubjects(selectedSemester._id);
    showToast("Subject deleted");
  }

  // ─── Template download ──────────────────────────────────────────────────────
  async function downloadTemplate() {
    if (!selectedSemester) return;
    const res = await fetch(`${API}/results/template?semesterId=${selectedSemester._id}`, {
      headers: { Authorization: `Bearer ${deptToken()}` },
    });
    if (!res.ok) { const d = await res.json(); showToast(d.message, false); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `results_template_sem${selectedSemester.semesterNumber}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Upload ─────────────────────────────────────────────────────────────────
  async function handleUpload() {
    if (!uploadFile || !selectedSemester) return;
    setUploading(true);
    setUploadError(null);
    setUploadWarnings([]);
    const fd = new FormData();
    fd.append("file", uploadFile);
    fd.append("semesterId", selectedSemester._id);
    try {
      const res = await fetch(`${API}/results/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${deptToken()}` },
        // Do NOT manually set Content-Type here; browser will auto-set multipart boundary
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) {
          setUploadError(data.errors);
          showToast("Upload failed — see error report", false);
        } else if (data.message) {
          showToast(data.message, false);
        } else {
          showToast("Upload failed due to unknown error.", false);
        }
        if (data.warnings) {
          setUploadWarnings(data.warnings.map((w: { message: string }) => w.message));
        }
        return;
      }
      setUploadFile(null);
      if (data.warnings) setUploadWarnings(data.warnings.map((w: { message: string }) => w.message));
      await fetchHistory(selectedSemester._id);
      showToast("Upload successful — ready to publish");
    } catch (error: any) {
      showToast(error.message || "Network error occurred", false);
    } finally {
      setUploading(false);
    }
  }

  // ─── Download error report as CSV ───────────────────────────────────────────
  function downloadErrorReport() {
    if (!uploadError) return;
    const rows = [["Row", "Error Message"], ...uploadError.map(e => [String(e.row ?? "N/A"), e.message])];
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "upload_error_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Publish ────────────────────────────────────────────────────────────────
  async function handlePublish(uploadId: string) {
    if (!confirm("Publish these results? This will lock the semester and calculate student GPAs.")) return;
    setPublishing(true);
    const res = await fetch(`${API}/results/publish/${uploadId}`, { method: "POST", headers: authHeaders() });
    const data = await res.json();
    setPublishing(false);
    if (!res.ok) { showToast(data.message, false); return; }
    showToast("Results published successfully");
    if (selectedSemester) {
      await fetchHistory(selectedSemester._id);
      await fetchSemesters(selectedYearId);
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(uploadId: string) {
    if (!confirm("Delete these results? The semester will be unlocked and semester GPAs removed.")) return;
    setDeleting(true);
    const res = await fetch(`${API}/results/delete/${uploadId}`, { method: "DELETE", headers: authHeaders() });
    const data = await res.json();
    setDeleting(false);
    if (!res.ok) { showToast(data.message, false); return; }
    showToast("Results deleted successfully");
    if (selectedSemester) {
      await fetchHistory(selectedSemester._id);
      await fetchSemesters(selectedYearId);
      await fetchYears();
    }
  }

  async function fetchUploadData(uploadId: string) {
    setLoadingView(true);
    try {
      const res = await fetch(`${API}/results/upload/${uploadId}/data`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) { showToast(data.message, false); return; }
      setViewData(data);
      setIsViewModalOpen(true);
    } catch (err: any) {
      showToast(err.message || "Failed to fetch data", false);
    } finally {
      setLoadingView(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (!ready || user?.role !== "department") return <main className="flex-1 bg-sky text-navy-deep min-h-screen">Loading…</main>;

  const activeUpload = uploadHistory[0]; // the most recent one

  return (
    <>
      <DepartmentNav />
      <main className="flex-1 bg-sky min-h-screen">
        <div className="mx-auto max-w-7xl px-6 py-10 relative">
          
          {/* TOAST */}
          {toast && (
            <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[60] rounded-full px-6 py-3 font-semibold text-white shadow-xl transition flex items-center gap-3 animate-in slide-in-from-top-4 ${toast.ok ? "bg-emerald-600" : "bg-rose-600"}`}>
              {toast.ok ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              {toast.msg}
            </div>
          )}

          {/* HEADER */}
          <div className="mb-8 rounded-[32px] bg-white/90 p-8 shadow-xs">
            <p className="text-xs font-bold uppercase tracking-widest text-navy-deep/60 mb-2">Department</p>
            <h1 className="text-3xl font-extrabold text-navy-deep">GPA Management</h1>
            <p className="mt-2 text-sm text-navy-deep/60">Manage academic years, semesters, subjects, and publish student results.</p>
          </div>

          {/* TOP CONTROLS: Dropdowns & Manage Buttons */}
          <div className="mb-8 flex flex-wrap gap-4 rounded-2xl bg-white/60 p-6 shadow-xs border border-white">
            {/* Year Control */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Academic Year</label>
              <div className="flex gap-2">
                <select
                  value={selectedYearId}
                  onChange={e => { setSelectedYearId(e.target.value); setSelectedSemId(""); }}
                  className="w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#0b1b33] font-semibold outline-none focus:border-[#1d4473] focus:ring-1 focus:ring-[#1d4473]"
                >
                  <option value="">-- Select Academic Year --</option>
                  {years.map(y => (
                    <option key={y._id} value={y._id}>{y.year} {y.isLocked ? " (Locked)" : ""}</option>
                  ))}
                </select>
                <button
                  onClick={() => setIsYearModalOpen(true)}
                  className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 transition"
                >
                  <Settings className="h-4 w-4" /> Manage
                </button>
              </div>
            </div>

            {/* Semester Control */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Semester</label>
              <div className="flex gap-2">
                <select
                  value={selectedSemId}
                  onChange={e => setSelectedSemId(e.target.value)}
                  disabled={!selectedYearId}
                  className="w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#0b1b33] font-semibold outline-none focus:border-[#1d4473] focus:ring-1 focus:ring-[#1d4473] disabled:opacity-50 disabled:bg-slate-50"
                >
                  <option value="">-- Select Semester --</option>
                  {semesters.map(s => (
                    <option key={s._id} value={s._id}>{s.label || `Semester ${s.semesterNumber}`} {s.isLocked ? " (Locked)" : ""}</option>
                  ))}
                </select>
                <button
                  onClick={() => setIsSemModalOpen(true)}
                  disabled={!selectedYearId}
                  className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Settings className="h-4 w-4" /> Manage
                </button>
              </div>
            </div>
          </div>

          {/* MAIN WORKSPACE */}
          {!selectedSemester ? (
            <div className="flex h-64 items-center justify-center rounded-[32px] bg-white/60 shadow-xs border border-white border-dashed">
              <div className="text-center text-slate-400">
                <BookOpen className="mx-auto mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm font-medium">Select an Academic Year and Semester from the dropdowns above to manage subjects and results.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
              
              {/* LEFT: Subjects */}
              <div className="space-y-6">
                {/* Semester Header Badge */}
                <div className="rounded-[32px] bg-[#1d4473] px-8 py-5 text-white flex items-center gap-4 shadow-xs">
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-white/60">{selectedYear?.year ?? ""}</p>
                    <h2 className="mt-1 text-xl font-bold">{selectedSemester.label || `Semester ${selectedSemester.semesterNumber}`}</h2>
                  </div>
                  {selectedSemester.isLocked
                    ? <div className="flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-amber-300 text-xs font-bold border border-amber-400/30"><Lock className="h-3.5 w-3.5" /> Locked</div>
                    : <div className="flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1 text-emerald-300 text-xs font-bold border border-emerald-400/30"><Unlock className="h-3.5 w-3.5" /> Unlocked</div>
                  }
                </div>

                {/* Subjects Panel */}
                <div className="rounded-[32px] bg-white/90 p-6 shadow-xs relative overflow-hidden">
                  {selectedSemester.isLocked && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                      <div className="bg-white px-6 py-3 rounded-2xl shadow-lg border border-amber-200 flex items-center gap-3 text-amber-600 font-bold">
                        <Lock className="h-5 w-5" />
                        Subjects are locked because results are published.
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-[#0b1b33]">Subject Repository ({subjects.length})</h3>
                  </div>

                  {/* Add subject form */}
                  <div className="mb-4 grid grid-cols-[1fr_2fr_80px_100px_auto] gap-2 items-end">
                    <input className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#1d4473]" placeholder="Code (e.g. CS301)" value={newSubject.code} onChange={e => setNewSubject(s => ({ ...s, code: e.target.value }))} />
                    <input className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#1d4473]" placeholder="Subject Name (e.g. Database Systems)" value={newSubject.name} onChange={e => setNewSubject(s => ({ ...s, name: e.target.value }))} />
                    <input className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-center outline-none focus:border-[#1d4473]" type="number" min={1} placeholder="Credits" value={newSubject.credits} onChange={e => setNewSubject(s => ({ ...s, credits: e.target.value }))} />
                    <select className="rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:border-[#1d4473]" value={newSubject.type} onChange={e => setNewSubject(s => ({ ...s, type: e.target.value as "Core" | "Optional" }))}>
                      <option value="Core">Core</option>
                      <option value="Optional">Optional</option>
                    </select>
                    <button onClick={createSubject} className="rounded-lg bg-[#1d4473] px-3 py-2 text-white text-xs hover:bg-[#163a60] transition flex items-center justify-center gap-1"><Plus className="h-3.5 w-3.5" /> Add</button>
                  </div>

                  {/* Subject Table */}
                  {subjects.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-xl mt-4">No subjects added to this semester yet.</p>
                  ) : (
                    <div className="max-h-[600px] overflow-auto rounded-xl border border-slate-100">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                          <tr>
                            <th className="px-3 py-2.5 text-left font-bold">Code</th>
                            <th className="px-3 py-2.5 text-left font-bold">Subject Name</th>
                            <th className="px-3 py-2.5 text-center font-bold">Credits</th>
                            <th className="px-3 py-2.5 text-center font-bold">Type</th>
                            <th className="px-3 py-2.5 text-right font-bold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {subjects.map(sub => (
                            <tr key={sub._id} className="hover:bg-slate-50/50 transition">
                              {editSubjectId === sub._id ? (
                                <>
                                  <td className="px-3 py-2 font-mono font-bold text-[#1d4473]">{sub.subjectCode}</td>
                                  <td className="px-3 py-2"><input className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-[#1d4473]" value={editSubjectData.name} onChange={e => setEditSubjectData(d => ({ ...d, name: e.target.value }))} /></td>
                                  <td className="px-3 py-2"><input className="w-16 mx-auto block rounded border border-slate-300 px-2 py-1.5 text-xs text-center outline-none focus:border-[#1d4473]" type="number" value={editSubjectData.credits} onChange={e => setEditSubjectData(d => ({ ...d, credits: e.target.value }))} /></td>
                                  <td className="px-3 py-2">
                                    <select className="mx-auto block rounded border border-slate-300 px-1 py-1.5 text-xs outline-none focus:border-[#1d4473]" value={editSubjectData.type} onChange={e => setEditSubjectData(d => ({ ...d, type: e.target.value as "Core" | "Optional" }))}>
                                      <option value="Core">Core</option>
                                      <option value="Optional">Optional</option>
                                    </select>
                                  </td>
                                  <td className="px-3 py-2 text-right space-x-3">
                                    <button onClick={() => updateSubject(sub._id)} className="text-emerald-600 font-bold hover:underline">Save</button>
                                    <button onClick={() => setEditSubjectId(null)} className="text-slate-400 hover:underline">Cancel</button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-3 py-2.5 font-mono font-bold text-[#1d4473]">{sub.subjectCode}</td>
                                  <td className="px-3 py-2.5 text-slate-700 font-medium">{sub.subjectName}</td>
                                  <td className="px-3 py-2.5 text-center text-slate-600">{sub.credits}</td>
                                  <td className="px-3 py-2.5 text-center">
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${sub.subjectType === "Core" ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"}`}>{sub.subjectType}</span>
                                  </td>
                                  <td className="px-3 py-2.5 text-right space-x-1.5">
                                    <button onClick={() => { setEditSubjectId(sub._id); setEditSubjectData({ name: sub.subjectName, credits: String(sub.credits), type: sub.subjectType }); }} className="rounded p-1 text-slate-400 hover:text-[#1d4473] transition"><Pencil className="h-3.5 w-3.5" /></button>
                                    <button onClick={() => deleteSubject(sub._id)} className="rounded p-1 text-slate-400 hover:text-rose-500 transition"><Trash2 className="h-3.5 w-3.5" /></button>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: Uploads */}
              <div className="space-y-6">
                <div className="rounded-[32px] bg-white/90 p-6 shadow-xs">
                  <h3 className="font-bold text-[#0b1b33] mb-4">Upload Results</h3>
                  
                  {/* Download Template */}
                  <button
                    onClick={downloadTemplate}
                    disabled={subjects.length === 0}
                    className="w-full mb-4 flex items-center justify-center gap-2 rounded-xl bg-sky-50 px-4 py-3 text-sm font-bold text-sky-700 hover:bg-sky-100 border border-sky-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Download className="h-4 w-4" /> Download Result Template
                  </button>

                  <div className="h-px bg-slate-100 w-full mb-4" />

                  {/* File Drop Zone */}
                  <div
                    className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-10 transition cursor-pointer ${uploadFile ? "border-emerald-400 bg-emerald-50" : "border-slate-300 bg-slate-50 hover:border-[#1d4473]/50 hover:bg-sky-50"}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); }}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setUploadFile(f); setUploadError(null); setUploadWarnings([]); } }}
                  >
                    <Upload className={`h-8 w-8 ${uploadFile ? "text-emerald-500" : "text-slate-400"}`} />
                    {uploadFile ? (
                      <p className="text-sm font-semibold text-emerald-700">{uploadFile.name}</p>
                    ) : (
                      <p className="text-sm text-slate-500">Drop .xlsx file here or <span className="font-semibold text-[#1d4473] underline">click to browse</span></p>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) { setUploadFile(f); setUploadError(null); setUploadWarnings([]); } }}
                    />
                  </div>

                  {/* Error Panel */}
                  {uploadError && (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
                      <div className="flex items-start gap-3 text-rose-700">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-bold">Validation Failed ({uploadError.length} errors)</p>
                          <p className="mt-1 text-xs opacity-90 text-balance">The file was completely rejected. No records were saved. Please download the error report, fix the issues, and try again.</p>
                          <button onClick={downloadErrorReport} className="mt-3 flex items-center gap-1.5 rounded-lg bg-rose-200/50 px-3 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-200 transition">
                            <Download className="h-3 w-3" /> Download Error Report
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Warning Panel */}
                  {uploadWarnings.length > 0 && !uploadError && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-start gap-3 text-amber-800">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                          <p className="text-sm font-bold">Upload succeeded with {uploadWarnings.length} warnings</p>
                          <ul className="mt-2 space-y-1 text-xs opacity-90 max-h-32 overflow-y-auto pr-2">
                            {uploadWarnings.map((w, i) => <li key={i} className="list-inside list-disc">{w}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Upload Action Button */}
                  {uploadFile && (
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="mt-4 w-full rounded-xl bg-[#1d4473] py-3 text-sm font-bold text-white hover:bg-[#163a60] transition disabled:opacity-50"
                    >
                      {uploading ? "Uploading & Validating..." : "Upload & Validate"}
                    </button>
                  )}
                </div>

                {/* State Machine Status */}
                {activeUpload && !uploadError && (
                  <div className="rounded-[32px] bg-white/90 p-6 shadow-xs">
                    <h3 className="font-bold text-[#0b1b33] mb-4">Status & Publish</h3>
                    <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Current Upload</p>
                      <p className="text-sm font-medium text-navy-deep break-all">{activeUpload.fileName}</p>
                      <p className="text-xs text-slate-500 mt-1">Version {activeUpload.version} • {activeUpload.recordCount} records</p>
                      
                      <div className="mt-3 flex items-center gap-2">
                        {activeUpload.isPublished ? (
                          <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200"><CheckCircle className="h-3.5 w-3.5" /> Published live</span>
                        ) : (
                          <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200"><Archive className="h-3.5 w-3.5" /> Draft — not published</span>
                        )}
                      </div>
                    </div>

                    <div className="mb-4 flex items-center gap-2">
                      <button onClick={() => fetchUploadData(activeUpload._id)} disabled={loadingView} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-sky-50 px-2 py-3 text-sm font-bold text-sky-600 hover:bg-sky-100 transition disabled:opacity-50 border border-sky-100">
                        <Eye className="h-4 w-4 shrink-0" /> {loadingView ? "Loading..." : "View Data"}
                      </button>
                      <a href={activeUpload.downloadUrl} download className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-2 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 transition border border-slate-200">
                        <Download className="h-4 w-4 shrink-0" /> Original File
                      </a>
                    </div>

                    {!activeUpload.isPublished ? (
                      <button onClick={() => handlePublish(activeUpload._id)} disabled={publishing} className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50">
                        <CheckCircle className="h-4 w-4" /> {publishing ? "Publishing..." : "Publish Results"}
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <button onClick={() => handleDelete(activeUpload._id)} disabled={deleting} className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-100 transition disabled:opacity-50">
                          <Trash2 className="h-4 w-4" /> {deleting ? "Deleting..." : "Delete Results"}
                        </button>
                        <p className="text-[10px] text-center text-slate-400 px-4">Deleting unlocks the semester and recalculates all affected student CGPAs.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* ─── MODALS ───────────────────────────────────────────────────────────── */}
      
      {/* Manage Years Modal */}
      {isYearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[32px] bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between bg-slate-50 px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-navy-deep">Manage Academic Years</h2>
              <button onClick={() => setIsYearModalOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              {/* Add form */}
              <div className="flex gap-2 mb-6">
                <input
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-[#1d4473]"
                  placeholder="e.g. 2024/2025"
                  value={newYear}
                  onChange={e => setNewYear(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && createYear()}
                />
                <button onClick={createYear} className="rounded-xl bg-[#1d4473] px-4 py-2 text-white font-bold hover:bg-[#163a60] transition">Add</button>
              </div>

              {/* List */}
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {years.length === 0 && <p className="text-center text-sm text-slate-400 py-4">No academic years added.</p>}
                {years.map(year => (
                  <div key={year._id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    {editYearId === year._id ? (
                      <div className="flex flex-1 items-center gap-2">
                        <input className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none" value={editYearVal} onChange={e => setEditYearVal(e.target.value)} />
                        <button onClick={() => updateYear(year._id)} className="text-xs text-emerald-600 font-bold hover:underline">Save</button>
                        <button onClick={() => setEditYearId(null)} className="text-xs text-slate-400 hover:underline">Cancel</button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-navy-deep">{year.year}</span>
                          {year.isLocked && <span title="Locked (Results Published)"><Lock className="h-3 w-3 text-amber-500" /></span>}
                        </div>
                        {!year.isLocked && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => { setEditYearId(year._id); setEditYearVal(year.year); }} className="text-slate-400 hover:text-navy-deep transition"><Pencil className="h-4 w-4" /></button>
                            <button onClick={() => deleteYear(year._id)} className="text-slate-400 hover:text-rose-500 transition"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Semesters Modal */}
      {isSemModalOpen && selectedYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-[32px] bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between bg-slate-50 px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-navy-deep">Manage Semesters</h2>
                <p className="text-xs text-slate-500 font-semibold">{selectedYear.year}</p>
              </div>
              <button onClick={() => setIsSemModalOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              {/* Add form */}
              <div className="flex gap-2 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <input
                  className="w-16 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none text-center focus:border-[#1d4473]"
                  placeholder="#"
                  type="number"
                  min={1}
                  value={newSem.number}
                  onChange={e => setNewSem(s => ({ ...s, number: e.target.value }))}
                />
                <input
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1d4473]"
                  placeholder="Label (e.g. Semester 1)"
                  value={newSem.label}
                  onChange={e => setNewSem(s => ({ ...s, label: e.target.value }))}
                />
                <button onClick={createSemester} className="rounded-lg bg-[#1d4473] px-4 py-2 text-white font-bold hover:bg-[#163a60] transition">Add</button>
              </div>

              {/* List */}
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {semesters.length === 0 && <p className="text-center text-sm text-slate-400 py-4">No semesters added for this year.</p>}
                {semesters.map(sem => (
                  <div key={sem._id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-xs">
                    {editSemId === sem._id ? (
                      <div className="flex flex-1 items-center gap-2">
                        <span className="font-black text-slate-400 w-6 text-center">{sem.semesterNumber}</span>
                        <input className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none" value={editSemVal} onChange={e => setEditSemVal(e.target.value)} />
                        <button onClick={() => updateSemester(sem._id)} className="text-xs text-emerald-600 font-bold hover:underline">Save</button>
                        <button onClick={() => setEditSemId(null)} className="text-xs text-slate-400 hover:underline">Cancel</button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 font-black text-xs">
                            {sem.semesterNumber}
                          </div>
                          <span className="font-bold text-navy-deep">{sem.label || `Semester ${sem.semesterNumber}`}</span>
                          {sem.isLocked && <span title="Locked (Results Published)"><Lock className="h-3 w-3 text-amber-500" /></span>}
                        </div>
                        {!sem.isLocked && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => { setEditSemId(sem._id); setEditSemVal(sem.label); }} className="text-slate-400 hover:text-navy-deep transition"><Pencil className="h-4 w-4" /></button>
                            <button onClick={() => deleteSemester(sem._id)} className="text-slate-400 hover:text-rose-500 transition"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Results Modal */}
      {isViewModalOpen && viewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-5xl max-h-[90vh] rounded-[32px] bg-white shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between bg-slate-50 px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-navy-deep">Uploaded Results Data</h2>
                <p className="text-xs text-slate-500 font-semibold">{viewData.rows.length} students</p>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-auto">
              <div className="max-h-[600px] overflow-auto rounded-xl border border-slate-100 relative">
                <table className="w-full text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider sticky top-0 z-20 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold sticky left-0 bg-slate-50 z-10 shadow-[1px_0_0_0_#f1f5f9]">Reg No</th>
                      <th className="px-4 py-3 text-left font-bold">Name</th>
                      {viewData.subjects.map(sub => (
                        <th key={sub} className="px-4 py-3 text-center font-bold">{sub}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {viewData.rows.map(row => (
                      <tr key={row.registrationNo} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3 font-mono font-bold text-[#1d4473] sticky left-0 bg-white shadow-[1px_0_0_0_#f1f5f9] group-hover:bg-slate-50">{row.registrationNo}</td>
                        <td className="px-4 py-3 text-slate-700 font-medium">{row.studentName || "-"}</td>
                        {viewData.subjects.map(sub => (
                          <td key={sub} className="px-4 py-3 text-center font-semibold text-slate-600">
                            {row.grades[sub] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
