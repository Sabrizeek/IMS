"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Send, ShieldCheck, XCircle, CloudUpload, Lock, Unlock } from "lucide-react";
import { StudentNav } from "@/components/layout/StudentNav";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";

const STORAGE_KEY = "ims.internshipStatus";
const ALLOWED_OFFER_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

type ApplicationState = "idle" | "selected" | "notSelected";

interface InternshipStatusData {
  state: ApplicationState;
  companyName: string;
  jobPosition: string;
  internshipStartDate: string;
  offerFileName: string;
  offerMimeType: string;
  offerDataUrl: string;
  submittedAt: string;
  approved: boolean;
}

function getStorageKey(email: string) {
  return `${STORAGE_KEY}.${email}`;
}

export default function InternshipStatusPage() {
  const router = useRouter();
  const { user, ready } = useAuth();
  useAuthGuard("student", "/student/login");
  const [state, setState] = useState<ApplicationState>("idle");
  const [companyName, setCompanyName] = useState("");
  const [jobPosition, setJobPosition] = useState("");
  const [internshipStartDate, setInternshipStartDate] = useState("");
  const [offerFileName, setOfferFileName] = useState("");
  const [offerMimeType, setOfferMimeType] = useState("");
  const [offerDataUrl, setOfferDataUrl] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [approved, setApproved] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const fetchStatus = async () => {
    try {
      const token = sessionStorage.getItem("ims.student.token");
      if (!token) return;
      const res = await fetch("http://localhost:5000/api/internships/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.application) {
          const app = data.application;
          setApplicationId(app._id);
          setState(app.state || "idle");
          setCompanyName(app.companyName || "");
          setJobPosition(app.jobPosition || "");
          setInternshipStartDate(app.internshipStartDate ? app.internshipStartDate.split("T")[0] : "");
          setOfferFileName(app.offerFileName || "");
          setOfferMimeType(app.offerMimeType || "");
          setOfferDataUrl(app.offerDataUrl || "");
          setSubmitted(Boolean(app.submittedAt));
          setApproved(app.approved || false);
          setRejectionReason(app.rejectionReason || "");
        }
      }
    } catch (err) {
      console.error("Failed to fetch internship status:", err);
    }
  };

  useEffect(() => {
    if (ready && user?.role === "student") {
      fetchStatus();
    }
  }, [ready, user]);

  const statusIsSubmitted = state === "selected" && submitted && (approved || !rejectionReason);
  const statusIsRejected = state === "selected" && submitted && !approved && rejectionReason;
  const statusIsApproved = statusIsSubmitted && approved;

  const isFormLocked = submitted && !statusIsRejected;

  const timeline = useMemo(
    () => [
      { label: "Placement Search", subLabel: statusIsSubmitted || statusIsApproved ? "Completed" : "In Progress", active: true },
      { label: "Pending Approval", subLabel: statusIsApproved ? "Verified" : statusIsSubmitted ? "Awaiting department verification" : "Awaiting submission", active: statusIsSubmitted || statusIsApproved },
      { label: "Approved", subLabel: "Ready to access Record Book upon approval", active: statusIsApproved },
    ],
    [statusIsSubmitted, statusIsApproved],
  );

  const resetForm = () => {
    setCompanyName("");
    setJobPosition("");
    setInternshipStartDate("");
    setOfferFileName("");
    setOfferMimeType("");
    setOfferDataUrl("");
    setSubmitted(false);
    setApproved(false);
    setValidationError("");
  };

  const saveStatus = (next: InternshipStatusData) => {
    if (!user || user.role !== "student") return;
    sessionStorage.setItem(getStorageKey(user.email), JSON.stringify(next));
  };

  const handleOfferUpload = (file: File | null) => {
    if (isFormLocked || !file) return;
    if (!ALLOWED_OFFER_TYPES.includes(file.type)) {
      setValidationError("Please upload a PDF or DOCX offer letter.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setValidationError("Offer letter must be 5MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setOfferDataUrl(reader.result);
        setOfferFileName(file.name);
        setOfferMimeType(file.type);
        setValidationError("");
      }
    };
    reader.readAsDataURL(file);
  };

  const submitApplication = async () => {
    if (isFormLocked) return;
    if (!companyName.trim() || !jobPosition.trim() || !internshipStartDate || !offerDataUrl) {
      setValidationError("Fill all required fields, including the start date, and upload the offer letter before submitting.");
      return;
    }

    try {
      const token = sessionStorage.getItem("ims.student.token");
      const res = await fetch("http://localhost:5000/api/internships", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          state: "selected",
          companyName: companyName.trim(),
          jobPosition: jobPosition.trim(),
          internshipStartDate,
          offerFileName,
          offerMimeType,
          offerDataUrl,
          submittedAt: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setApplicationId(data.application._id);
        setSubmitted(true);
        setState("selected");
        setRejectionReason("");
        setValidationError("");
        setToastMessage("Offer submitted. Pending departmental approval.");
        window.setTimeout(() => setToastMessage(""), 3000);
        fetchStatus();
      } else {
        setValidationError("Failed to submit internship application.");
      }
    } catch {
      setValidationError("Unable to connect to backend server.");
    }
  };

  const approvePlacement = async () => {
    if (!applicationId) return;
    try {
      const token = sessionStorage.getItem("ims.student.token");
      const res = await fetch(`http://localhost:5000/api/internships/${applicationId}/review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approved: true }),
      });
      if (res.ok) {
        setApproved(true);
        setRejectionReason("");
        setToastMessage("Department approved your placement.");
        window.setTimeout(() => setToastMessage(""), 3000);
        fetchStatus();
      }
    } catch {
      setValidationError("Unable to connect to backend server.");
    }
  };

  const downloadOffer = () => {
    if (!offerDataUrl || !offerFileName) return;
    const link = document.createElement("a");
    link.href = offerDataUrl;
    link.download = offerFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const canSubmit =
    !isFormLocked &&
    companyName.trim().length > 0 &&
    jobPosition.trim().length > 0 &&
    internshipStartDate.length > 0 &&
    offerDataUrl.length > 0;

  if (!ready || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#b2d3e6] text-[#0f2d59]">
        Loading…
      </main>
    );
  }

  if (user.role !== "student") {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#b2d3e6]">
      <StudentNav />
      
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-6 py-8">
          
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-xl font-bold text-[#0f2d59]">
              Internship Placement Tracking
            </h1>
            <p className="mt-2 max-w-4xl text-sm text-[#0f2d59]/80 leading-relaxed font-semibold">
              Only students who have been selected for an internship are eligible to complete and submit this form. If you have secured a placement, please provide the details below for department verification.
            </p>
          </div>

          {toastMessage ? (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
              {toastMessage}
            </div>
          ) : null}

          {/* Main Layout Grid */}
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            
            {/* Left Column: Cards & Form */}
            <div className="space-y-6">

              {/* Status Message for Rejection */}
              {statusIsRejected ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <XCircle className="h-5 w-5 shrink-0" />
                      <p className="text-sm font-bold">Placement Rejected by Department</p>
                    </div>
                    <p className="text-xs ml-8">Reason: <span className="font-semibold">{rejectionReason}</span></p>
                    <p className="text-xs ml-8 italic">Please update your company details or upload a new offer letter below and re-submit.</p>
                  </div>
                </div>
              ) : null}

              {/* Formalize Your Offer Form Panel */}
              <div className={`overflow-hidden rounded-xl bg-[#c5dfee] shadow-sm transition-opacity duration-300 ${isFormLocked ? "opacity-75" : "opacity-100"}`}>
                
                {/* Form Banner Header */}
                <div className={`flex items-center justify-between px-5 py-4 text-white transition-colors duration-300 ${isFormLocked ? "bg-gray-500" : "bg-[#1e467a]"}`}>
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5" />
                    <span className="text-sm font-semibold tracking-wide">Formalize Your Offer</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2">
                    {isFormLocked ? (
                      <div className="rounded bg-white/20 p-1 flex items-center gap-1.5 px-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider">Locked</span>
                        <Lock className="h-4 w-4 text-white" />
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Form Fields Context */}
                <div className="p-6 space-y-6">
                  {!statusIsSubmitted ? (
                    <div className="space-y-5">
                      <div className="grid gap-6 sm:grid-cols-2">
                        <label className="block">
                          <span className={`text-xs font-bold ${isFormLocked ? "text-[#0f2d59]/60" : "text-[#0f2d59]"}`}>Company Name <span className="text-rose-500">*</span></span>
                          <input
                            disabled={isFormLocked}
                            value={companyName}
                            onChange={(event) => setCompanyName(event.target.value)}
                            className="mt-2 w-full rounded border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                            placeholder="e.g., TechCorp Solutions"
                          />
                        </label>
                        <label className="block">
                          <span className={`text-xs font-bold ${isFormLocked ? "text-[#0f2d59]/60" : "text-[#0f2d59]"}`}>Job Position <span className="text-rose-500">*</span></span>
                          <input
                            disabled={isFormLocked}
                            value={jobPosition}
                            onChange={(event) => setJobPosition(event.target.value)}
                            className="mt-2 w-full rounded border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                            placeholder="e.g., Software Engineering Intern"
                          />
                        </label>
                      </div>

                      {/* Internship Start Date Section */}
                      <div className="block">
                        <label className="block">
                          <span className={`text-xs font-bold ${isFormLocked ? "text-[#0f2d59]/60" : "text-[#0f2d59]"}`}>Internship Start Date <span className="text-rose-500">*</span></span>
                          <input
                            type="date"
                            disabled={isFormLocked}
                            value={internshipStartDate}
                            onChange={(event) => setInternshipStartDate(event.target.value)}
                            className="mt-2 w-full sm:w-1/2 block rounded border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                          />
                        </label>
                      </div>

                      {/* Drag and Drop Zone */}
                      <label className={`block rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${isFormLocked ? "border-gray-400/40 bg-gray-200/40 cursor-not-allowed" : "border-[#0f2d59]/30 bg-[#b2d3e6]/40 cursor-pointer hover:bg-[#b2d3e6]/60"}`}>
                        <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-lg text-white ${isFormLocked ? "bg-gray-400" : "bg-[#1e467a]"}`}>
                          <CloudUpload className="h-5 w-5" />
                        </div>
                        <p className={`mt-4 text-sm font-bold ${isFormLocked ? "text-gray-400" : "text-[#0f2d59]"}`}>Drag and drop your offer letter here</p>
                        <p className={`mt-1 text-xs ${isFormLocked ? "text-gray-400/80" : "text-[#0f2d59]/70"}`}>or click to browse from your computer</p>
                        <p className={`mt-1 text-[11px] font-medium ${isFormLocked ? "text-gray-400/60" : "text-[#0f2d59]/60"}`}>PDF, MAX 5MB</p>
                        
                        {offerFileName ? (
                          <p className="mx-auto mt-3 max-w-xs rounded bg-white px-3 py-1.5 text-xs font-medium text-[#0f2d59] shadow-sm truncate">
                            {offerFileName}
                          </p>
                        ) : null}
                        
                        <input
                          type="file"
                          disabled={isFormLocked}
                          accept=".pdf,.docx"
                          className="sr-only"
                          onChange={(event) => handleOfferUpload(event.target.files?.[0] ?? null)}
                        />
                      </label>

                      {validationError ? (
                        <div className="rounded bg-rose-100 px-4 py-2 text-xs font-medium text-rose-700">
                          {validationError}
                        </div>
                      ) : null}

                      {/* Bottom Bar: Disclaimer & Action Button */}
                      <div className="pt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-[#0f2d59]/10">
                        <p className="text-[11px] text-[#0f2d59]/70 italic max-w-md">
                          By submitting, you agree that the provided information is accurate for the formal internship validation process.
                        </p>
                        
                        <button
                          type="button"
                          onClick={submitApplication}
                          disabled={!canSubmit}
                          className="inline-flex items-center justify-center gap-2 rounded bg-[#1e467a] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0f2d59] disabled:cursor-not-allowed disabled:opacity-50 self-end sm:self-auto"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Submit for Review
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Submitted View Actions */
                    <div className="rounded-xl border border-[#0f2d59]/10 bg-white/60 p-5">
                      <p className="text-sm font-bold text-[#0f2d59]">Offer letter submitted</p>
                      <p className="mt-2 text-xs text-[#0f2d59]/80 leading-relaxed">
                        Your company details and offer letter are now waiting for departmental verification. Track progress in the right panel.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={downloadOffer}
                          className="inline-flex items-center gap-2 rounded bg-white px-4 py-2 text-xs font-bold text-[#0f2d59] shadow-sm hover:bg-gray-50"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Download offer letter
                        </button>
                        {statusIsApproved ? (
                          <button
                            type="button"
                            onClick={() => router.push("/student/record-book")}
                            className="inline-flex items-center gap-2 rounded bg-[#0f2d59] px-4 py-2 text-xs font-bold text-white hover:bg-[#1e467a]"
                          >
                            Go to Record Book
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Your Progress Timeline */}
            <aside className="rounded-xl bg-[#c5dfee] p-5 self-start">
              <p className="text-xs font-bold uppercase tracking-wider text-[#0f2d59]">
                Your Progress
              </p>
              
              <div className="mt-6 relative border-l-2 border-[#0f2d59]/20 pl-5 space-y-6">
                {timeline.map((item) => (
                  <div key={item.label} className="relative">
                    {/* Circle Indicator on the line */}
                    <div
                      className={`absolute -left-[27px] top-0.5 h-3 w-3 rounded-full border-2 bg-white ${
                        item.active ? "border-emerald-500 bg-emerald-500" : "border-gray-400"
                      }`}
                    />
                    <div>
                      <p className="text-xs font-bold text-[#0f2d59]">{item.label}</p>
                      <p className="text-[11px] text-[#0f2d59]/70 mt-0.5">
                        {item.subLabel}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </aside>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
