"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Edit3, FileText, Plus, Trash2, X } from "lucide-react";
import { StudentNav } from "@/components/layout/StudentNav";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";

interface ProjectItem {
  id?: string;
  _id?: string;
  projectTitle: string;
  projectDescription: string;
  technologies: string[];
}

const STORAGE_PREFIX = "ims.portfolio";

const TECHNOLOGIES = [
  "React",
  "Next.js",
  "JavaScript",
  "TypeScript",
  "Node.js",
  "Express",
  "MongoDB",
  "PostgreSQL",
  "MySQL",
  "Python",
  "Django",
  "Flask",
  "Java",
  "Spring",
  "C#",
  "ASP.NET",
  "Git",
  "Docker",
  "Kubernetes",
  "Figma",
  "Tailwind CSS",
  "Bootstrap",
  "GraphQL",
  "REST API",
  "AWS",
  "Linux",
];

const ALLOWED_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

function getPortfolioStorageKey(userEmail: string) {
  return `${STORAGE_PREFIX}.${userEmail}`;
}

export default function PortfolioPage() {
  const { user, ready, profile, setProfile } = useAuth();
  useAuthGuard("student", "/student/login");
  
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [selectedTech, setSelectedTech] = useState<string[]>([]);
  const [techQuery, setTechQuery] = useState("");
  
  const [cvFileName, setCvFileName] = useState("");
  const [cvMimeType, setCvMimeType] = useState("");
  const [cvDataUrl, setCvDataUrl] = useState("");

  const [certificationsFileName, setCertificationsFileName] = useState("");
  const [certificationsMimeType, setCertificationsMimeType] = useState("");
  const [certificationsDataUrl, setCertificationsDataUrl] = useState("");

  const [additionalItemsFileName, setAdditionalItemsFileName] = useState("");
  const [additionalItemsMimeType, setAdditionalItemsMimeType] = useState("");
  const [additionalItemsDataUrl, setAdditionalItemsDataUrl] = useState("");
  
  const [savedPortfolio, setSavedPortfolio] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [validationError, setValidationError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!ready || !user || user.role !== "student" || !profile) return;

    if (profile.cvDataUrl) {
      setSavedPortfolio(profile);
      setCvFileName(profile.cvFileName || "");
      setCvMimeType(profile.cvMimeType || "");
      setCvDataUrl(profile.cvDataUrl || "");
      setCertificationsFileName(profile.certificationsFileName || "");
      setCertificationsMimeType(profile.certificationsMimeType || "");
      setCertificationsDataUrl(profile.certificationsDataUrl || "");
      setAdditionalItemsFileName(profile.additionalItemsFileName || "");
      setAdditionalItemsMimeType(profile.additionalItemsMimeType || "");
      setAdditionalItemsDataUrl(profile.additionalItemsDataUrl || "");
      setProjects(profile.projects || []);
    } else {
      setSavedPortfolio(null);
      setProjects([]);
      setCvFileName("");
      setCvMimeType("");
      setCvDataUrl("");
      setCertificationsFileName("");
      setCertificationsMimeType("");
      setCertificationsDataUrl("");
      setAdditionalItemsFileName("");
      setAdditionalItemsMimeType("");
      setAdditionalItemsDataUrl("");
    }
  }, [ready, user, profile]);

  const filteredTechnologies = useMemo(() => {
    const normalized = techQuery.trim().toLowerCase();
    return TECHNOLOGIES.filter(
      (tech) =>
        tech.toLowerCase().includes(normalized) && !selectedTech.includes(tech),
    );
  }, [techQuery, selectedTech]);

  const handleFileChange = async (file: File | null, category: "cv" | "cert" | "add") => {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setValidationError("Please choose a PDF or DOCX file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setValidationError("The file must be 5MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        if (category === "cv") {
          setCvDataUrl(result);
          setCvFileName(file.name);
          setCvMimeType(file.type);
        } else if (category === "cert") {
          setCertificationsDataUrl(result);
          setCertificationsFileName(file.name);
          setCertificationsMimeType(file.type);
        } else if (category === "add") {
          setAdditionalItemsDataUrl(result);
          setAdditionalItemsFileName(file.name);
          setAdditionalItemsMimeType(file.type);
        }
        setValidationError("");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddMoreProjects = () => {
    if (!projectTitle.trim() || !projectDescription.trim()) {
      setValidationError("Please complete the current project title and description first.");
      return;
    }
    if (selectedTech.length === 0) {
      setValidationError("Please add at least one technology for the current project.");
      return;
    }

    const newProject: ProjectItem = {
      id: Date.now().toString(),
      projectTitle: projectTitle.trim(),
      projectDescription: projectDescription.trim(),
      technologies: selectedTech,
    };

    setProjects((prev) => [...prev, newProject]);
    setProjectTitle("");
    setProjectDescription("");
    setSelectedTech([]);
    setTechQuery("");
    setValidationError("");
    
    setToastMessage("Project added to list! You can add more or click save below.");
    window.setTimeout(() => setToastMessage(""), 3000);
  };

  const removeProjectFromList = (id: string) => {
    setProjects((prev) => prev.filter((p) => (p._id || p.id) !== id));
  };

  const submitPortfolio = () => {
    let finalProjects = [...projects];
    if (projectTitle.trim() || projectDescription.trim() || selectedTech.length > 0) {
      if (!projectTitle.trim() || !projectDescription.trim() || selectedTech.length === 0) {
        setValidationError("Please either complete or clear the ongoing project details before saving.");
        return;
      } else {
        finalProjects.push({
          id: Date.now().toString(),
          projectTitle: projectTitle.trim(),
          projectDescription: projectDescription.trim(),
          technologies: selectedTech,
        });
      }
    }

    if (!cvDataUrl) {
      setValidationError("Please upload your CV/Resume first.");
      return;
    }

    if (finalProjects.length === 0) {
      setValidationError("Please add at least one project before saving.");
      return;
    }

    if (!user || user.role !== "student" || !profile) return;

    const updatedProfile = {
      ...profile,
      projects: finalProjects,
      cvFileName,
      cvMimeType,
      cvDataUrl,
      certificationsFileName,
      certificationsMimeType,
      certificationsDataUrl,
      additionalItemsFileName,
      additionalItemsMimeType,
      additionalItemsDataUrl,
    };

    setProfile(updatedProfile);
    setSavedPortfolio(updatedProfile);
    setProjects(finalProjects);
    setIsEditing(false);
    setValidationError("");
    
    setProjectTitle("");
    setProjectDescription("");
    setSelectedTech([]);
    
    setToastMessage("Portfolio saved successfully.");
    window.setTimeout(() => setToastMessage(""), 3000);
  };

  const startEditing = () => {
    if (savedPortfolio) {
      setIsEditing(true);
      setProjects(savedPortfolio.projects || []);
      setProjectTitle("");
      setProjectDescription("");
      setSelectedTech([]);
    }
  };

  const resetPortfolio = () => {
    if (!user || user.role !== "student" || !profile) return;

    const updatedProfile = {
      ...profile,
      projects: [],
      cvFileName: "",
      cvMimeType: "",
      cvDataUrl: "",
      certificationsFileName: "",
      certificationsMimeType: "",
      certificationsDataUrl: "",
      additionalItemsFileName: "",
      additionalItemsMimeType: "",
      additionalItemsDataUrl: "",
    };

    setProfile(updatedProfile);
    setSavedPortfolio(null);
    setProjects([]);
    setProjectTitle("");
    setProjectDescription("");
    setSelectedTech([]);
    setTechQuery("");
    setCvFileName("");
    setCvMimeType("");
    setCvDataUrl("");
    setCertificationsFileName("");
    setCertificationsMimeType("");
    setCertificationsDataUrl("");
    setAdditionalItemsFileName("");
    setAdditionalItemsMimeType("");
    setAdditionalItemsDataUrl("");
    setIsEditing(false);
    setValidationError("");
    setToastMessage("");
  };

  const downloadCv = () => {
    if (!cvDataUrl || !cvFileName) return;
    const link = document.createElement("a");
    link.href = cvDataUrl;
    link.download = cvFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadCertifications = () => {
    if (!certificationsDataUrl || !certificationsFileName) return;
    const link = document.createElement("a");
    link.href = certificationsDataUrl;
    link.download = certificationsFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAdditionalItems = () => {
    if (!additionalItemsDataUrl || !additionalItemsFileName) return;
    const link = document.createElement("a");
    link.href = additionalItemsDataUrl;
    link.download = additionalItemsFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const addTechnology = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return;
    if (selectedTech.includes(normalized)) return;
    setSelectedTech((current) => [...current, normalized]);
    setTechQuery("");
  };

  const removeTechnology = (tech: string) => {
    setSelectedTech((current) => current.filter((item) => item !== tech));
  };

  const handleTechKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addTechnology(techQuery);
    }
  };

  if (!ready || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-sky text-navy-deep">
        Loading…
      </main>
    );
  }

  if (user.role !== "student") {
    return null;
  }

  return (
    <>
      <StudentNav />
      <main className="flex-1 bg-sky">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-navy-deep">
                Portfolio
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-navy-deep/70">
                Build your student portfolio, upload a resume, and present your core technology stack in a single consistent interface.
              </p>
            </div>
            {savedPortfolio && !isEditing ? (
              <button
                onClick={startEditing}
                className="inline-flex items-center gap-2 rounded-full bg-navy-deep px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy"
              >
                <Edit3 className="h-4 w-4" />
                Edit portfolio
              </button>
            ) : null}
          </div>

          {toastMessage ? (
            <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
              {toastMessage}
            </div>
          ) : null}

          {savedPortfolio && !isEditing ? (
            <div className="space-y-6">
              <div className="rounded-[28px] border border-navy/10 bg-white/90 p-8 shadow-sm">
                <div className="flex flex-col gap-3 rounded-3xl bg-sky-soft/80 p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-navy-deep/60">
                        Student Portfolio
                      </p>
                      <h2 className="text-2xl font-bold text-navy-deep">
                        {profile?.name || "Student"}
                      </h2>
                    </div>
                    <span className="rounded-full bg-navy-deep/10 px-4 py-2 text-sm font-medium text-navy-deep">
                      Saved on {new Date(savedPortfolio.savedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto]">
                    <div className="space-y-6">
                      {savedPortfolio.projects?.map((proj: ProjectItem, index: number) => (
                        <div key={proj._id || proj.id || index} className="border-b border-navy/5 pb-4 last:border-0">
                          <p className="text-xs font-bold uppercase tracking-wider text-navy-deep/40">Project #{index + 1}</p>
                          <div className="mt-2">
                            <p className="text-sm text-navy-deep/60">Project title</p>
                            <p className="mt-1 rounded-3xl bg-white px-4 py-3 text-base font-semibold text-navy-deep shadow-sm">
                              {proj.projectTitle}
                            </p>
                          </div>
                          <div className="mt-3">
                            <p className="text-sm text-navy-deep/60">Project description</p>
                            <p className="mt-1 whitespace-pre-line rounded-3xl bg-white px-4 py-4 text-sm leading-relaxed text-navy-deep shadow-sm">
                              {proj.projectDescription}
                            </p>
                          </div>
                          <div className="mt-3">
                            <p className="text-sm text-navy-deep/60">Project tech stack</p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {proj.technologies.map((t) => (
                                <span key={t} className="rounded-full bg-navy-deep/5 px-2.5 py-1 text-xs font-medium text-navy-deep">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4 rounded-3xl bg-sky-soft/70 p-5 shadow-sm h-fit min-w-[240px]">
                      <div className="space-y-2">
                        {cvDataUrl && (
                          <button
                            type="button"
                            onClick={downloadCv}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-navy-deep px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy"
                          >
                            <Download className="h-4 w-4" />
                            Download CV
                          </button>
                        )}
                        {certificationsDataUrl && (
                          <button
                            type="button"
                            onClick={downloadCertifications}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-navy-deep px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy"
                          >
                            <Download className="h-4 w-4" />
                            Certifications
                          </button>
                        )}
                        {additionalItemsDataUrl && (
                          <button
                            type="button"
                            onClick={downloadAdditionalItems}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-navy-deep px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy"
                          >
                            <Download className="h-4 w-4" />
                            Additional Items
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={startEditing}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-navy-deep/20 bg-white px-4 py-3 text-sm font-semibold text-navy-deep transition hover:bg-navy/5"
                        >
                          <Edit3 className="h-4 w-4" />
                          Edit details
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("Delete this portfolio and start again?")) {
                              resetPortfolio();
                            }
                          }}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete portfolio
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* grid-rows-1 grid stretch layout tracking to sync height */
            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr] items-stretch">
              
              {/* LEFT CONTAINER: FILE UPLOADS (FLEX STRETCHED TO FULL HEIGHT) */}
              <section className="rounded-[28px] border border-navy/10 bg-white/90 p-8 shadow-sm flex flex-col justify-between h-full">
                <div className="flex flex-col flex-1 space-y-6 overflow-y-auto max-h-[800px] pr-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-navy-deep/60">
                    Step 1
                  </p>
                  
                  {/* CV Upload */}
                  <div>
                    <h2 className="text-lg font-bold text-navy-deep flex items-center gap-2 mb-3">
                       <FileText className="h-4 w-4 text-navy-deep/70" /> Resume / CV
                    </h2>
                    <label className="group flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy/20 bg-sky-soft px-4 py-6 text-center transition hover:border-navy/40 hover:bg-sky/95 cursor-pointer">
                      <div className="mt-2 space-y-1">
                        <p className="text-sm font-semibold text-navy-deep">
                          {cvFileName ? "Resume ready to upload" : "Drag & Drop files here"}
                        </p>
                        <p className="text-xs text-navy-deep/70">PDF or DOCX (Max 5MB)</p>
                        {cvFileName ? (
                          <div className="mt-2 flex flex-col items-center gap-1 text-xs text-navy-deep/80 sm:flex-row sm:justify-center">
                            <span className="rounded-full bg-white/80 px-2 py-1 font-medium shadow-sm truncate max-w-[150px]">{cvFileName}</span>
                            <span className="text-navy-deep/70 underline">Replace</span>
                          </div>
                        ) : (
                          <div className="pt-2">
                            <span className="inline-block rounded-lg bg-[#1a365d] px-4 py-1.5 text-xs font-bold text-white shadow transition hover:bg-navy">Browse</span>
                          </div>
                        )}
                      </div>
                      <input type="file" accept=".pdf,.docx" className="sr-only" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null, "cv")} />
                    </label>
                  </div>

                  {/* Certifications Upload */}
                  <div>
                    <h2 className="text-lg font-bold text-navy-deep flex items-center gap-2 mb-3">
                       <FileText className="h-4 w-4 text-navy-deep/70" /> Certifications
                    </h2>
                    <label className="group flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy/20 bg-sky-soft px-4 py-6 text-center transition hover:border-navy/40 hover:bg-sky/95 cursor-pointer">
                      <div className="mt-2 space-y-1">
                        <p className="text-sm font-semibold text-navy-deep">
                          {certificationsFileName ? "Certifications ready" : "Drag & Drop files here"}
                        </p>
                        <p className="text-xs text-navy-deep/70">PDF or DOCX (Max 5MB)</p>
                        {certificationsFileName ? (
                          <div className="mt-2 flex flex-col items-center gap-1 text-xs text-navy-deep/80 sm:flex-row sm:justify-center">
                            <span className="rounded-full bg-white/80 px-2 py-1 font-medium shadow-sm truncate max-w-[150px]">{certificationsFileName}</span>
                            <span className="text-navy-deep/70 underline">Replace</span>
                          </div>
                        ) : (
                          <div className="pt-2">
                            <span className="inline-block rounded-lg bg-[#1a365d] px-4 py-1.5 text-xs font-bold text-white shadow transition hover:bg-navy">Browse</span>
                          </div>
                        )}
                      </div>
                      <input type="file" accept=".pdf,.docx" className="sr-only" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null, "cert")} />
                    </label>
                  </div>

                  {/* Additional Items Upload */}
                  <div>
                    <h2 className="text-lg font-bold text-navy-deep flex items-center gap-2 mb-3">
                       <FileText className="h-4 w-4 text-navy-deep/70" /> Additional Portfolio Items
                    </h2>
                    <label className="group flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy/20 bg-sky-soft px-4 py-6 text-center transition hover:border-navy/40 hover:bg-sky/95 cursor-pointer">
                      <div className="mt-2 space-y-1">
                        <p className="text-sm font-semibold text-navy-deep">
                          {additionalItemsFileName ? "Items ready" : "Drag & Drop files here"}
                        </p>
                        <p className="text-xs text-navy-deep/70">PDF or DOCX (Max 5MB)</p>
                        {additionalItemsFileName ? (
                          <div className="mt-2 flex flex-col items-center gap-1 text-xs text-navy-deep/80 sm:flex-row sm:justify-center">
                            <span className="rounded-full bg-white/80 px-2 py-1 font-medium shadow-sm truncate max-w-[150px]">{additionalItemsFileName}</span>
                            <span className="text-navy-deep/70 underline">Replace</span>
                          </div>
                        ) : (
                          <div className="pt-2">
                            <span className="inline-block rounded-lg bg-[#1a365d] px-4 py-1.5 text-xs font-bold text-white shadow transition hover:bg-navy">Browse</span>
                          </div>
                        )}
                      </div>
                      <input type="file" accept=".pdf,.docx" className="sr-only" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null, "add")} />
                    </label>
                  </div>

                </div>
                
                <p className="text-xs text-navy-deep/50 mt-4 pt-2 border-t border-navy/5">
                  * Upload your distinct portfolio files before saving.
                </p>
              </section>

              {/* RIGHT CONTAINER: PROJECT DETAILS & TECH SELECTION */}
              <section className="rounded-[28px] border border-navy/10 bg-white/90 p-8 shadow-sm flex flex-col justify-between h-full space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-navy-deep/60">
                        Step 2
                      </p>
                      <h2 className="mt-2 text-xl font-bold text-navy-deep">
                        Project & Technology Selection
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddMoreProjects}
                      className="inline-flex items-center gap-1 text-xs font-bold text-navy-deep hover:underline bg-sky/50 px-3 py-1.5 rounded-full transition"
                    >
                      <Plus className="h-3 w-3" /> Add More Projects
                    </button>
                  </div>

                  {projects.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-navy/10 bg-sky-soft/40 p-4 space-y-2">
                      <p className="text-xs font-bold text-navy-deep/60 uppercase tracking-wide">Projects Queue list:</p>
                      <div className="flex flex-wrap gap-2">
                        {projects.map((p, idx) => (
                          <div key={p._id || p.id || idx} className="flex items-center gap-2 rounded-full bg-white border border-navy/10 px-3 py-1.5 text-xs text-navy-deep shadow-sm">
                            <span className="font-semibold">#{idx+1} {p.projectTitle}</span>
                            <button 
                              type="button" 
                              onClick={() => removeProjectFromList(p._id || p.id || "")}
                              className="text-red-500 hover:text-red-700 font-bold"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 space-y-4 border-b border-navy/10 pb-6">
                    <label className="block">
                      <span className="text-sm font-semibold text-navy-deep">Project title</span>
                      <input
                        value={projectTitle}
                        onChange={(event) => setProjectTitle(event.target.value)}
                        placeholder="Enter your capstone or system project name"
                        className="mt-2 w-full rounded-3xl border border-navy/15 bg-sky/60 px-4 py-3 text-sm text-navy-deep outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/10"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-navy-deep">Project description</span>
                      <textarea
                        value={projectDescription}
                        onChange={(event) => setProjectDescription(event.target.value)}
                        placeholder="Describe your project features, architecture, and outcomes"
                        rows={3}
                        className="mt-2 w-full rounded-3xl border border-navy/15 bg-sky/60 px-4 py-3 text-sm text-navy-deep outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/10"
                      />
                    </label>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-semibold text-navy-deep">
                        Search or add a technology used in this project
                      </label>
                      <span className="rounded-full bg-sky/70 px-2.5 py-0.5 text-xs font-semibold text-navy-deep">
                        {selectedTech.length} selected
                      </span>
                    </div>
                    
                    <input
                      value={techQuery}
                      onChange={(event) => setTechQuery(event.target.value)}
                      onKeyDown={handleTechKeyDown}
                      placeholder="Type to search, then press Enter to add custom tags"
                      className="w-full rounded-3xl border border-navy/15 bg-sky/60 px-4 py-3 text-sm text-navy-deep outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/10"
                    />

                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
                      {filteredTechnologies.slice(0, 6).map((tech) => (
                        <button
                          key={tech}
                          type="button"
                          onClick={() => addTechnology(tech)}
                          className="rounded-full border border-navy/15 bg-white px-3 py-1.5 text-xs text-navy-deep transition hover:border-navy hover:bg-sky-soft text-left truncate"
                        >
                          + {tech}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-navy-deep/70">Selected Stack:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedTech.length === 0 ? (
                          <span className="text-xs text-navy-deep/50 italic">
                            No technologies selected yet.
                          </span>
                        ) : (
                          selectedTech.map((tech) => (
                            <span
                              key={tech}
                              className="flex items-center gap-1.5 rounded-full bg-navy-deep/5 px-2.5 py-1 text-xs font-medium text-navy-deep"
                            >
                              {tech}
                              <button
                                type="button"
                                onClick={() => removeTechnology(tech)}
                                className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-navy-deep/10 text-navy-deep transition hover:bg-navy-deep/20"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  {validationError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {validationError}
                    </div>
                  ) : null}

                  <div className="flex flex-col sm:flex-row gap-2 justify-end">
                    <button
                      type="button"
                      onClick={handleAddMoreProjects}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-navy-deep text-navy-deep px-5 py-3 text-sm font-semibold transition hover:bg-navy-deep/5"
                    >
                      <Plus className="h-4 w-4" />
                      Add Project to List
                    </button>
                    <button
                      type="button"
                      onClick={submitPortfolio}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-navy-deep px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy"
                    >
                      Save and compile portfolio
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}