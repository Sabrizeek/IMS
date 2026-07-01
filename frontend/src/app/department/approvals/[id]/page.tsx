"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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

export default function ReviewPlacementPage() {
  const { user, ready } = useAuth();
  useAuthGuard("department", "/department/auth");
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [request, setRequest] = useState<PlacementRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user?.role === "department") {
      fetchRequest();
    }
  }, [ready, user, id]);

  const fetchRequest = async () => {
    try {
      const token = sessionStorage.getItem("ims.department.token");
      if (!token) return;
      // Fetch all and filter for now
      const res = await fetch("http://localhost:5000/api/internships", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const found = data.applications?.find((app: PlacementRequest) => app._id === id);
        if (found) {
          setRequest(found);
        } else {
          alert("Request not found.");
          router.push("/department/approvals");
        }
      }
    } catch {
      alert("Failed to fetch placement request.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!request) return;
    try {
      const token = sessionStorage.getItem("ims.department.token");
      const res = await fetch(`http://localhost:5000/api/internships/${request._id}/review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approved: true }),
      });
      if (res.ok) {
        setActionMessage(`Placement approved for ${request.student}. Redirecting...`);
        setTimeout(() => {
          router.push("/department/approvals");
        }, 2000);
      } else {
        alert("Failed to approve placement.");
      }
    } catch {
      alert("Unable to process request.");
    }
  };

  const handleRejectConfirm = async () => {
    if (!request) return;
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason or select a condition before submitting.");
      return;
    }
    try {
      const token = sessionStorage.getItem("ims.department.token");
      const res = await fetch(`http://localhost:5000/api/internships/${request._id}/review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approved: false, rejectionReason }),
      });
      if (res.ok) {
        setActionMessage(`Rejection sent to ${request.student}. Redirecting...`);
        setTimeout(() => {
          router.push("/department/approvals");
        }, 2000);
      } else {
        alert("Failed to reject placement.");
      }
    } catch {
      alert("Unable to process request.");
    }
  };

  const handleDownloadOfferLetter = () => {
    if (!request || !request.offerDataUrl) return;
    const link = document.createElement("a");
    link.href = request.offerDataUrl;
    link.download = request.offerFileName || "offer_letter.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!ready || loading) {
    return (
      <div className="min-h-screen bg-[#dceef7] flex items-center justify-center text-[#1a446c] font-bold">
        Loading…
      </div>
    );
  }

  if (!request) return null;

  return (
    <div className="min-h-screen bg-[#dceef7] flex flex-col font-sans text-slate-800">
      <DepartmentNav />
      <main className="flex-grow mx-auto w-full max-w-[1400px] px-6 py-10">
        <button
          onClick={() => router.push("/department/approvals")}
          className="mb-6 flex items-center gap-2 text-sm font-bold text-[#1a446c] hover:text-[#0f2a4a] transition-colors cursor-pointer bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm w-fit"
        >
          ← Back to Approvals
        </button>

        <div className="rounded-[32px] bg-white p-8 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 pb-6 mb-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#1a446c] font-black">Review Request</p>
              <h2 className="text-2xl font-black text-slate-900 mt-1">
                Internship Workspace
              </h2>
            </div>
            {actionMessage && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-xs text-emerald-800 shadow-sm font-bold">
                {actionMessage}
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_2.5fr] items-start">
            
            {/* Left Column: Student Profile & Internship Details */}
            <div className="space-y-6">
              
              {/* Student Profile Card */}
              <div className="rounded-2xl bg-white border border-slate-200 p-8 flex flex-col items-center text-center shadow-sm">
                <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-[#eff4f8] bg-slate-100 mb-4 flex items-center justify-center shadow-inner">
                  {request.photo ? (
                    <img src={request.photo} alt={request.student} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl">👤</span>
                  )}
                </div>
                <h3 className="text-lg font-black text-[#1a446c]">{request.student}</h3>
                <p className="text-xs font-bold text-slate-400 mt-1 tracking-wide">Student ID: {request.id}</p>
                <p className="text-[11px] font-medium text-slate-400 mt-1 break-all">{request.email}</p>
              </div>

              {/* Internship Details Card */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 space-y-6 shadow-sm">
                <h3 className="text-sm font-black text-[#1a446c] uppercase tracking-wide border-b border-slate-200 pb-3">Internship Details</h3>
                <div className="space-y-5 text-sm">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Company Name</p>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">{request.company}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Job Position</p>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">{request.role}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Start Date</p>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">{request.internshipStartDate}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Request Date</p>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">{request.date}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Document Viewer */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="text-slate-300">📄</span>
                  <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Document Viewer</h3>
                </div>
                {request.offerDataUrl && (
                  <button
                    type="button"
                    onClick={handleDownloadOfferLetter}
                    className="flex items-center gap-1.5 rounded bg-white border border-sky-200 px-3 py-1.5 text-[10px] font-bold text-sky-700 hover:bg-sky-50 transition shadow-sm cursor-pointer"
                  >
                    <span className="text-sky-500">⬇</span> Download File
                  </button>
                )}
              </div>
              
              <div className="p-0 bg-[#e1e4e8] flex-grow flex flex-col justify-center items-center min-h-[700px]">
                {request.offerDataUrl ? (
                  request.offerMimeType === "application/pdf" ? (
                    <object data={request.offerDataUrl} type="application/pdf" className="w-full h-full min-h-[750px] object-contain">
                      <p className="p-10 text-center text-slate-500 text-sm bg-white">PDF preview not available. Please download the file.</p>
                    </object>
                  ) : request.offerMimeType?.startsWith("image/") ? (
                    <div className="w-full h-full p-4 flex items-center justify-center bg-[#e1e4e8]">
                      <img src={request.offerDataUrl} alt="Offer Letter Preview" className="max-h-[750px] shadow-lg rounded bg-white object-contain" />
                    </div>
                  ) : (
                    <div className="p-10 bg-white shadow-lg rounded-xl text-sm text-slate-600 font-medium max-w-sm text-center">
                      Preview not available for this file type. Please click the Download button above to view the document.
                    </div>
                  )
                ) : (
                  <div className="p-10 bg-white/50 rounded-2xl flex flex-col items-center justify-center text-center max-w-sm">
                    <span className="text-4xl opacity-20 mb-3">📄</span>
                    <p className="text-sm font-bold text-slate-600">No document attached.</p>
                    <p className="text-xs text-slate-500 mt-1">The student did not upload an offer letter.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-end gap-4">
            {!isRejecting ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsRejecting(true)}
                  className="w-full sm:w-auto rounded-xl bg-white border border-rose-200 px-6 py-3 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-50 shadow-sm cursor-pointer"
                >
                  Reject Request
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  className="w-full sm:w-auto rounded-xl bg-emerald-600 px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700 shadow-sm cursor-pointer"
                >
                  Approve Placement
                </button>
              </>
            ) : (
              <div className="w-full rounded-2xl bg-rose-50 border border-rose-200 p-5">
                <h4 className="text-sm font-black text-rose-800 mb-2 uppercase tracking-wide">Provide Rejection Reason</h4>
                <p className="text-xs text-rose-600/80 mb-4 text-balance">The student will receive this feedback and will be required to submit a new placement request.</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {["Invalid Offer Letter", "Company not verified", "Position not relevant to degree", "Start date conflict"].map(reason => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setRejectionReason(reason)}
                      className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[10px] font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="Or type a specific reason here..."
                  className="w-full rounded-xl border border-rose-300 bg-white p-3 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 mb-4 min-h-[80px]"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRejecting(false);
                      setRejectionReason("");
                    }}
                    className="rounded-lg bg-white border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRejectConfirm}
                    className="rounded-lg bg-rose-600 px-6 py-2 text-xs font-bold text-white transition hover:bg-rose-700 shadow-sm cursor-pointer"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
