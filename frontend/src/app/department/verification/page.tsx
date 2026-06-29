"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DepartmentNav } from "@/components/layout/DepartmentNav";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";

interface AccountRequestData {
  _id: string;
  firstName: string;
  lastName: string;
  studentId: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  tempPassword?: string;
  notes?: string;
  createdAt: string;
}

export default function DepartmentVerificationPage() {
  const { user, ready } = useAuth();
  useAuthGuard("department", "/department/auth");
  
  const [requests, setRequests] = useState<AccountRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const token = sessionStorage.getItem("ims.department.token");
      if (!token) return;
      const res = await fetch(`http://localhost:5000/api/account-requests?status=${activeFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch {
      setError("Failed to fetch registration requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ready && user?.role === "department") {
      setLoading(true);
      fetchRequests();
    }
  }, [ready, user, activeFilter]);

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    let notes = "";
    if (status === "rejected") {
      const input = prompt("Please enter a reason for rejection:");
      if (input === null) return; // Cancelled
      notes = input.trim();
    }

    try {
      const token = sessionStorage.getItem("ims.department.token");
      const res = await fetch(`http://localhost:5000/api/account-requests/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to update request.");
        return;
      }

      if (status === "approved" && data.request?.tempPassword) {
        alert(`Account approved successfully!\n\nUniversity Email: ${data.request.email}\nTemporary Password: ${data.request.tempPassword}\n\nThis information is also logged in the backend terminal logs.`);
      } else {
        alert("Registration request rejected successfully.");
      }

      fetchRequests();
    } catch {
      alert("Unable to process request.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to completely delete this registration request and any associated account data? This cannot be undone.")) return;
    try {
      const token = sessionStorage.getItem("ims.department.token");
      const res = await fetch(`http://localhost:5000/api/account-requests/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Failed to delete request.");
        return;
      }
      fetchRequests();
    } catch {
      alert("Unable to delete request.");
    }
  };

  if (!ready || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-sky text-navy-deep">
        Loading…
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-sky">
      <DepartmentNav />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-[32px] bg-white/90 p-10 shadow-sm">
          <p className="text-sm uppercase tracking-[0.35em] text-navy-deep/70 font-bold">
            Verification
          </p>
          <h1 className="mt-4 text-4xl font-bold text-navy-deep">Registration Management</h1>
          <p className="mt-4 max-w-3xl text-sm text-navy-deep/75 leading-relaxed">
            Review and manage student internship registration requests. Ensure all institutional prerequisites are met before verifying documentation.
          </p>

          {error && (
            <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-3">
                {(["pending", "approved", "rejected"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setActiveFilter(status)}
                    className={`rounded-2xl border px-5 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-400 capitalize ${
                      activeFilter === status
                        ? "bg-navy-deep text-white border-navy-deep"
                        : "bg-white text-navy-deep border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <p className="text-sm text-slate-500">Filter registrations by verification state.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-navy-deep text-white">
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Student ID</th>
                    <th className="px-6 py-4">University Email</th>
                    <th className="px-6 py-4">Request Date</th>
                    {activeFilter === "approved" && <th className="px-6 py-4">Temp Password</th>}
                    {activeFilter === "rejected" && <th className="px-6 py-4">Rejection Notes</th>}
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">
                        No requests found in this section.
                      </td>
                    </tr>
                  ) : (
                    requests.map((row) => (
                      <tr key={row._id} className="border-b border-slate-200 last:border-b-0">
                        <td className="px-6 py-4 font-semibold text-slate-800">{`${row.firstName} ${row.lastName || ""}`.trim()}</td>
                        <td className="px-6 py-4 text-slate-600">{row.studentId}</td>
                        <td className="px-6 py-4 text-sky-700 font-medium">{row.email}</td>
                        <td className="px-6 py-4 text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</td>
                        
                        {activeFilter === "approved" && (
                          <td className="px-6 py-4 font-mono font-bold text-emerald-700">{row.tempPassword || "—"}</td>
                        )}
                        {activeFilter === "rejected" && (
                          <td className="px-6 py-4 text-rose-600">{row.notes || "—"}</td>
                        )}

                        <td className="px-6 py-4 space-x-2 whitespace-nowrap text-right flex justify-end items-center">
                          {activeFilter === "pending" && (
                            <>
                              <button
                                onClick={() => handleAction(row._id, "approved")}
                                className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleAction(row._id, "rejected")}
                                className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(row._id)}
                            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            Delete
                          </button>
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
    </div>
  );
}
