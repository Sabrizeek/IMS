"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DepartmentNav } from "@/components/layout/DepartmentNav";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";

const specializations = [
  "Computer Science",
  "Software Engineering",
  "Information Systems",
  "Data Science",
  "Cybersecurity",
  "Computer Engineering",
];

const internshipStatusOptions = ["Selected", "Pending", "Not Selected"];
const gpaOptions = ["Higher to Lower", "Lower to Higher"];

interface StudentData {
  id: string;
  name: string;
  studentId: string;
  email: string;
  specialization: string;
  specializationConfirmed: boolean;
  gpa: number;
  totalCredits: number;
  internshipStatus: string;
  linkedin: string;
  github: string;
  projects: Array<{
    id: string;
    projectTitle: string;
    projectDescription: string;
    technologies: string[];
  }>;
  photo: string;
  cvFileName?: string;
  cvMimeType?: string;
  cvDataUrl?: string;
  certificationsFileName?: string;
  certificationsMimeType?: string;
  certificationsDataUrl?: string;
  additionalItemsFileName?: string;
  additionalItemsMimeType?: string;
  additionalItemsDataUrl?: string;
}

export default function DepartmentStudentDetailsPage() {
  const { user, ready } = useAuth();
  useAuthGuard("department", "/department/auth");
  
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpecialization, setSelectedSpecialization] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedGpaOrder, setSelectedGpaOrder] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStudent, setActiveStudent] = useState<StudentData | null>(null);
  const [detailMode, setDetailMode] = useState<"cv" | "certifications" | "additional" | "profile" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = async () => {
    try {
      const token = sessionStorage.getItem("ims.department.token");
      if (!token) return;
      const res = await fetch("http://localhost:5000/api/students", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } catch {
      setError("Failed to load students registry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ready && user?.role === "department") {
      fetchStudents();
    }
  }, [ready, user]);

  const filteredStudents = useMemo(() => {
    let list = [...students];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (student) =>
          student.name?.toLowerCase().includes(q) ||
          student.studentId?.toLowerCase().includes(q) ||
          student.email?.toLowerCase().includes(q)
      );
    }

    if (selectedSpecialization) {
      list = list.filter((student) => student.specialization === selectedSpecialization);
    }

    if (selectedStatus) {
      list = list.filter((student) => student.internshipStatus === selectedStatus);
    }

    if (selectedGpaOrder) {
      list.sort((a, b) =>
        selectedGpaOrder === "Higher to Lower" ? b.gpa - a.gpa : a.gpa - b.gpa,
      );
    }

    return list;
  }, [students, selectedSpecialization, selectedStatus, selectedGpaOrder, searchQuery]);

  const openDetail = async (student: StudentData, mode: "cv" | "certifications" | "additional" | "profile") => {
    try {
      const token = sessionStorage.getItem("ims.department.token");
      // Fetch full details of student (including CV, projects, etc.)
      const res = await fetch(`http://localhost:5000/api/students/${student.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Construct the full object
        const fullStudent: StudentData = {
          ...student,
          projects: data.profile?.projects || [],
          cvFileName: data.profile?.cvFileName || "",
          cvMimeType: data.profile?.cvMimeType || "",
          cvDataUrl: data.profile?.cvDataUrl || "",
          certificationsFileName: data.profile?.certificationsFileName || "",
          certificationsMimeType: data.profile?.certificationsMimeType || "",
          certificationsDataUrl: data.profile?.certificationsDataUrl || "",
          additionalItemsFileName: data.profile?.additionalItemsFileName || "",
          additionalItemsMimeType: data.profile?.additionalItemsMimeType || "",
          additionalItemsDataUrl: data.profile?.additionalItemsDataUrl || "",
          linkedin: data.profile?.linkedin || "",
          github: data.profile?.github || "",
          photo: data.profile?.photo || "",
        };
        setActiveStudent(fullStudent);
        setDetailMode(mode);
      } else {
        setActiveStudent(student);
        setDetailMode(mode);
      }
    } catch {
      setActiveStudent(student);
      setDetailMode(mode);
    }
  };

  const closeDetail = () => {
    setActiveStudent(null);
    setDetailMode(null);
  };

  const handleDownloadCvFile = () => {
    if (!activeStudent || !activeStudent.cvDataUrl) return;
    const link = document.createElement("a");
    link.href = activeStudent.cvDataUrl;
    link.download = activeStudent.cvFileName || "student_cv.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadCertifications = () => {
    if (!activeStudent || !activeStudent.certificationsDataUrl) return;
    const link = document.createElement("a");
    link.href = activeStudent.certificationsDataUrl;
    link.download = activeStudent.certificationsFileName || "certifications.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAdditional = () => {
    if (!activeStudent || !activeStudent.additionalItemsDataUrl) return;
    const link = document.createElement("a");
    link.href = activeStudent.additionalItemsDataUrl;
    link.download = activeStudent.additionalItemsFileName || "additional_items.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!ready || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#d9effc] text-[#0b1b33]">
        Loading…
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#d9effc] flex flex-col font-sans antialiased">
      <DepartmentNav />

      <main className="mx-auto w-full max-w-[1400px] px-6 py-8 flex-grow">
        
        {/* BACK ACTION CONTROLLER STRIP */}
        {detailMode && (
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={closeDetail}
              className="rounded-xl bg-[#0f2a4a] text-white px-5 py-2 text-xs font-bold shadow-xs hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
            >
              ← Back to Student List
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* CONDITION 1: DEFAULT STATE -> SHOW MAIN TABLE */}
        {!detailMode && (
          <div className="rounded-[32px] bg-white/90 p-10 shadow-xs">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-[#0f2a4a]/70 font-bold">
                  Student Details
                </p>
                <h1 className="mt-2 text-4xl font-extrabold text-[#0f2a4a]">Student Details</h1>
                <p className="mt-3 max-w-3xl text-sm text-slate-500 leading-relaxed">
                  Manage and monitor student internship progress across departments. Academic Excellence Portal.
                </p>
              </div>
              <div className="rounded-2xl bg-[#1e344e] px-7 py-5 text-white shadow-xs text-right min-w-[260px]">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-300 font-bold">Total Registered Students</p>
                <p className="mt-2 text-4xl font-black">{students.length}</p>
              </div>
            </div>

            {/* Filter Hub */}
            <div className="mt-8 flex flex-col lg:flex-row gap-5 lg:items-end lg:justify-between">
              <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-[240px_240px_240px]">
                <label className="block">
                <span className="text-xs font-bold text-[#0f2a4a] uppercase tracking-wider">Specialization</span>
                <select
                  value={selectedSpecialization}
                  onChange={(event) => setSelectedSpecialization(event.target.value)}
                  className="mt-2 w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700 outline-none transition appearance-none pr-10"
                  style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
                >
                  <option value="">All Specializations</option>
                  {specializations.map((spec) => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold text-[#0f2a4a] uppercase tracking-wider">Internship Status</span>
                <select
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value)}
                  className="mt-2 w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700 outline-none transition appearance-none pr-10"
                  style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
                >
                  <option value="">All Internship Status</option>
                  {internshipStatusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold text-[#0f2a4a] uppercase tracking-wider">GPA</span>
                <select
                  value={selectedGpaOrder}
                  onChange={(event) => setSelectedGpaOrder(event.target.value)}
                  className="mt-2 w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700 outline-none transition appearance-none pr-10"
                  style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
                >
                  <option value="">All GPA</option>
                  <option value="Higher to Lower">Highest to Lowest</option>
                  <option value="Lower to Higher">Lowest to Highest</option>
                </select>
              </label>
              </div>

              <div className="w-full lg:w-[240px]">
                <label className="block">
                  <span className="text-xs font-bold text-[#0f2a4a] uppercase tracking-wider">Search</span>
                  <div className="relative mt-2">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-slate-400 text-sm">🔍</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Name, ID, Email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:border-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-navy transition"
                    />
                  </div>
                </label>
              </div>
            </div>

            {/* Students Table */}
            <div className="mt-10 overflow-hidden rounded-3xl border border-slate-100 bg-slate-50/50">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-[#e4eff6] text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4.5">No</th>
                    <th className="px-6 py-4.5">Student Details</th>
                    <th className="px-6 py-4.5">GPA</th>
                    <th className="px-6 py-4.5">Specialization</th>
                    <th className="px-6 py-4.5">Internship Status</th>
                    <th className="px-6 py-4.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">No students registered in this criteria.</td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, index) => (
                      <tr key={student.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-6 py-5 font-bold text-[#0f2a4a]">{(index + 1).toString().padStart(2, "0")}</td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 border border-slate-300">
                              {student.photo ? (
                                <img src={student.photo} alt={student.name} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-lg">👤</span>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-[#0f2a4a] text-sm">{student.name}</p>
                              <p className="text-slate-400 mt-0.5">ID: {student.studentId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 font-bold text-[#0f2a4a] text-sm">{student.gpa.toFixed(2)}</td>
                        <td className="px-6 py-5">
                          <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 font-bold text-sky-800">
                            {student.specialization || "Unconfirmed"}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex rounded-full px-3 py-1 font-bold ${
                            student.internshipStatus === "Selected"
                              ? "bg-emerald-100 text-emerald-700"
                              : student.internshipStatus === "Pending"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-rose-100 text-rose-700"
                          }`}>
                            {student.internshipStatus}
                          </span>
                        </td>
                        <td className="px-6 py-5 space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openDetail(student, "cv")}
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
                          >
                            View CV
                          </button>
                          <button
                            type="button"
                            onClick={() => openDetail(student, "profile")}
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
                          >
                            View Profile →
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONDITION 2: VIEW DOCUMENT MODE -> SPLIT SCREEN LAYOUT */}
        {(detailMode === "cv" || detailMode === "certifications" || detailMode === "additional") && activeStudent && (
          <div className="grid gap-6 md:grid-cols-[320px_1fr] items-start animate-fadeIn">
            {/* Left Hand Sidebar */}
            <div className="rounded-2xl bg-white p-6 border border-slate-100 shadow-2xs flex flex-col items-center text-center">
              <div className="relative h-24 w-24 rounded-full overflow-hidden border border-slate-200 shadow-inner bg-slate-100 flex items-center justify-center">
                {activeStudent.photo ? (
                  <img
                    src={activeStudent.photo}
                    alt={activeStudent.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl">👤</span>
                )}
              </div>
              <h2 className="mt-4 text-base font-bold text-[#0f2a4a]">{activeStudent.name}</h2>
              <p className="text-xs text-slate-400">Student ID: {activeStudent.studentId}</p>
              
              <div className="w-full border-t border-slate-100 my-4"></div>

              <div className="w-full text-left space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">GPA</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-sky-600">{activeStudent.gpa.toFixed(2)}</span>
                </div>
              </div>

              <div className="w-full text-left space-y-2 mt-5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Social Profiles</p>
                {activeStudent.linkedin ? (
                  <a href={activeStudent.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-sky-600 transition">
                    🔗 <span className="underline">LinkedIn Profile</span>
                  </a>
                ) : (
                  <p className="text-xs text-slate-400 italic">No LinkedIn link</p>
                )}
                {activeStudent.github ? (
                  <a href={activeStudent.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-sky-600 transition">
                    🔗 <span className="underline">GitHub Profile</span>
                  </a>
                ) : (
                  <p className="text-xs text-slate-400 italic">No GitHub link</p>
                )}
              </div>

              <div className="w-full text-left space-y-1 mt-5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Specialization</p>
                <p className="text-xs font-bold text-slate-800">{activeStudent.specialization || "Unconfirmed"}</p>
              </div>

              <div className="w-full border-t border-slate-100 my-4"></div>
              
              <div className="w-full flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => openDetail(activeStudent, "profile")}
                  className="w-full rounded-xl bg-slate-100 text-slate-700 px-4 py-2.5 text-xs font-bold shadow-xs hover:bg-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  ← Back to Profile
                </button>
              </div>
            </div>

            {/* Right Hand PDF Mock Frame Box */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col h-[700px]">
              {/* Document Header Controls Toolbar */}
              <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <div className="font-bold flex items-center gap-2 text-slate-700">
                  <span className="text-base">📄</span>
                  <span className="uppercase tracking-wider">Document Viewer</span>
                </div>
                <div className="flex items-center gap-4">
                  {detailMode === "cv" && (
                    <button
                      type="button"
                      onClick={handleDownloadCvFile}
                      className="p-1 text-sky-600 hover:text-sky-800 transition bg-transparent border-none outline-none cursor-pointer flex items-center gap-1 font-bold text-xs"
                    >
                      ⬇️ Download CV File
                    </button>
                  )}
                  {detailMode === "certifications" && (
                    <button
                      type="button"
                      onClick={handleDownloadCertifications}
                      className="p-1 text-sky-600 hover:text-sky-800 transition bg-transparent border-none outline-none cursor-pointer flex items-center gap-1 font-bold text-xs"
                    >
                      ⬇️ Download Certifications
                    </button>
                  )}
                  {detailMode === "additional" && (
                    <button
                      type="button"
                      onClick={handleDownloadAdditional}
                      className="p-1 text-sky-600 hover:text-sky-800 transition bg-transparent border-none outline-none cursor-pointer flex items-center gap-1 font-bold text-xs"
                    >
                      ⬇️ Download Additional Items
                    </button>
                  )}
                </div>
              </div>

              {/* Document Switcher Tabs */}
              <div className="bg-slate-50 px-5 py-2 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => openDetail(activeStudent, "cv")}
                  disabled={!activeStudent.cvDataUrl}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${detailMode === "cv" ? "bg-sky-600 text-white shadow-sm" : activeStudent.cvDataUrl ? "text-slate-600 hover:bg-slate-200" : "text-slate-300 cursor-not-allowed"}`}
                >
                  CV / Resume
                </button>
                <button
                  type="button"
                  onClick={() => openDetail(activeStudent, "certifications")}
                  disabled={!activeStudent.certificationsDataUrl}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${detailMode === "certifications" ? "bg-sky-600 text-white shadow-sm" : activeStudent.certificationsDataUrl ? "text-slate-600 hover:bg-slate-200" : "text-slate-300 cursor-not-allowed"}`}
                >
                  Certifications
                </button>
                <button
                  type="button"
                  onClick={() => openDetail(activeStudent, "additional")}
                  disabled={!activeStudent.additionalItemsDataUrl}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${detailMode === "additional" ? "bg-sky-600 text-white shadow-sm" : activeStudent.additionalItemsDataUrl ? "text-slate-600 hover:bg-slate-200" : "text-slate-300 cursor-not-allowed"}`}
                >
                  Additional Items
                </button>
              </div>

              {/* Internal Sheet */}
              <div className="flex-1 relative bg-slate-50">
                {detailMode === "cv" ? (
                  activeStudent.cvDataUrl ? (
                    <iframe src={activeStudent.cvDataUrl} className="absolute inset-0 w-full h-full border-0" title={`${activeStudent.name} CV`} />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 italic p-10 text-center">This student has not yet uploaded a CV resume file.</div>
                  )
                ) : detailMode === "certifications" ? (
                  activeStudent.certificationsDataUrl ? (
                    <iframe src={activeStudent.certificationsDataUrl} className="absolute inset-0 w-full h-full border-0" title={`${activeStudent.name} Certifications`} />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 italic p-10 text-center">This student has not yet uploaded certifications.</div>
                  )
                ) : detailMode === "additional" ? (
                  activeStudent.additionalItemsDataUrl ? (
                    <iframe src={activeStudent.additionalItemsDataUrl} className="absolute inset-0 w-full h-full border-0" title={`${activeStudent.name} Additional Items`} />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 italic p-10 text-center">This student has not yet uploaded additional items.</div>
                  )
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* CONDITION 3: VIEW PROFILE MODE */}
        {detailMode === "profile" && activeStudent && (
          <div className="space-y-6 animate-fadeIn">
            <div className="rounded-2xl bg-[#1e3d5f] p-6 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-sm">
              <div className="flex items-center gap-5">
                <div className="h-20 w-20 rounded-md overflow-hidden bg-slate-300 shadow-inner flex items-center justify-center text-3xl">
                  {activeStudent.photo ? (
                    <img src={activeStudent.photo} alt={activeStudent.name} className="h-full w-full object-cover" />
                  ) : (
                    "👤"
                  )}
                </div>
                <div className="space-y-0.5">
                  <h2 className="text-xl font-bold tracking-wide">{activeStudent.name}</h2>
                  <p className="text-xs text-slate-300">{activeStudent.email}</p>
                  <p className="text-xs text-slate-300">Student ID: {activeStudent.studentId}</p>
                  <p className="text-xs text-slate-300">Specialization: {activeStudent.specialization || "Unconfirmed"}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="border border-slate-500/40 rounded-xl px-5 py-3 bg-slate-900/20 text-center min-w-[130px]">
                  <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">CURRENT GPA</p>
                  <p className="text-base font-black text-white mt-1">{activeStudent.gpa.toFixed(2)}</p>
                </div>
                <div className="border border-slate-500/40 rounded-xl px-5 py-3 bg-slate-900/20 text-center min-w-[130px]">
                  <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">INTERNSHIP</p>
                  <p className="text-xs font-black tracking-wider text-emerald-400 mt-1.5 uppercase">
                    {activeStudent.internshipStatus}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-[#f4fafd] p-8 border border-slate-200 shadow-2xs space-y-8 min-h-[300px]">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[#1e3d5f] font-bold text-xs uppercase tracking-wider">
                  <span>🎓</span> Academic Overview
                </div>
                <div className="pl-6 space-y-1">
                  <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">CREDITS EARNED</p>
                  <div className="w-36 border-b border-slate-300"></div>
                  <p className="text-xs font-black text-slate-800 pt-1">{activeStudent.totalCredits} Credits Completed</p>
                </div>
              </div>

              {activeStudent.projects && activeStudent.projects.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#1e3d5f] font-bold text-xs uppercase tracking-wider">
                    <span>📁</span> Projects Portfolio
                  </div>
                  <div className="pl-6 grid gap-4 md:grid-cols-2">
                    {activeStudent.projects.map((proj, idx) => (
                      <div key={proj.id || idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <h4 className="font-bold text-slate-900 text-sm">#{idx + 1} {proj.projectTitle}</h4>
                        <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-3">{proj.projectDescription}</p>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {proj.technologies?.map((tech) => (
                            <span key={tech} className="rounded bg-sky-50 px-2 py-0.5 text-[9px] font-bold text-sky-700 border border-sky-100">{tech}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#1e3d5f] font-bold text-xs uppercase tracking-wider">
                  <span>📄</span> ATTACHED DOCUMENTS
                </div>
                <div className="pl-6 grid gap-4 sm:grid-cols-3">
                  {activeStudent.cvDataUrl && (
                    <button
                      type="button"
                      onClick={() => openDetail(activeStudent, "cv")}
                      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-sky-300 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer text-[#1e3d5f]"
                    >
                      <span className="text-3xl">📄</span>
                      <span className="text-xs font-bold uppercase tracking-wider mt-2">CV / Resume</span>
                    </button>
                  )}
                  {activeStudent.certificationsDataUrl && (
                    <button
                      type="button"
                      onClick={() => openDetail(activeStudent, "certifications")}
                      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-sky-300 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer text-[#1e3d5f]"
                    >
                      <span className="text-3xl">📜</span>
                      <span className="text-xs font-bold uppercase tracking-wider mt-2">Certifications</span>
                    </button>
                  )}
                  {activeStudent.additionalItemsDataUrl && (
                    <button
                      type="button"
                      onClick={() => openDetail(activeStudent, "additional")}
                      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-sky-300 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer text-[#1e3d5f]"
                    >
                      <span className="text-3xl">📎</span>
                      <span className="text-xs font-bold uppercase tracking-wider mt-2">Additional Items</span>
                    </button>
                  )}
                  {!activeStudent.cvDataUrl && !activeStudent.certificationsDataUrl && !activeStudent.additionalItemsDataUrl && (
                    <p className="text-xs text-slate-400 italic">No documents attached.</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#1e3d5f] font-bold text-xs uppercase tracking-wider">
                  <span>🏆</span> ONLINE PRESENCE
                </div>
                <div className="pl-6 flex flex-col sm:flex-row gap-2">
                  {activeStudent.linkedin ? (
                    <a
                      href={activeStudent.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded bg-[#c5def3] border border-sky-200 px-4 py-2 text-xs font-bold text-[#1e3d5f] hover:bg-[#b5d3ed] transition"
                    >
                      <span>👔</span> LinkedIn Profile
                    </a>
                  ) : null}
                  {activeStudent.github ? (
                    <a
                      href={activeStudent.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded bg-[#c5def3] border border-sky-200 px-4 py-2 text-xs font-bold text-[#1e3d5f] hover:bg-[#b5d3ed] transition"
                    >
                      <span>🐙</span> GitHub Profile
                    </a>
                  ) : null}
                  {!activeStudent.linkedin && !activeStudent.github ? (
                    <p className="text-xs text-slate-400 italic">No social links added yet.</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
