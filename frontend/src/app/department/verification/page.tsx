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
  photo?: string;
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
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const token = sessionStorage.getItem("ims.department.token");
      if (!token) return;
      const query = activeFilter === "all" ? "" : `?status=${activeFilter}`;
      const res = await fetch(`http://localhost:5000/api/account-requests${query}`, {
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

  const filteredRequests = useMemo(() => {
    let result = requests;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.firstName.toLowerCase().includes(q) ||
          r.lastName?.toLowerCase().includes(q) ||
          r.studentId.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q)
      );
    }
    return result;
  }, [requests, searchQuery]);

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
              <div className="inline-flex flex-nowrap items-center gap-1.5 rounded-[20px] bg-slate-100/80 p-1.5 border border-slate-200 shadow-inner overflow-x-auto">
                {(["all", "pending", "approved", "rejected"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setActiveFilter(status)}
                    className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all duration-200 capitalize ${
                      activeFilter === status
                        ? "bg-navy-deep text-white shadow-md"
                        : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:max-w-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-slate-400">🔍</span>
                </div>
                <input
                  type="text"
                  placeholder="Search by name, ID, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:border-navy-deep focus:bg-white focus:outline-none focus:ring-1 focus:ring-navy-deep transition"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-navy-deep text-white">
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Student ID</th>
                    <th className="px-6 py-4">University Email</th>
                    <th className="px-6 py-4">Request Date</th>
                    {activeFilter === "all" && <th className="px-6 py-4">Status</th>}
                    {activeFilter === "approved" && <th className="px-6 py-4">Temp Password</th>}
                    {activeFilter === "rejected" && <th className="px-6 py-4">Rejection Notes</th>}
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">
                        No requests found in this section.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((row) => (
                      <tr key={row._id} className="border-b border-slate-200 last:border-b-0">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200/80 border border-slate-300 shadow-inner">
                              {row.photo ? (
                                <img src={row.photo} alt={row.firstName} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-lg">👤</span>
                              )}
                            </div>
                            <span className="font-bold text-slate-800">{`${row.firstName} ${row.lastName || ""}`.trim()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{row.studentId}</td>
                        <td className="px-6 py-4 text-sky-700 font-medium">{row.email}</td>
                        <td className="px-6 py-4 text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</td>
                        
                        {activeFilter === "all" && (
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] uppercase font-black tracking-widest ${
                              row.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                              row.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                        )}

                        {activeFilter === "approved" && (
                          <td className="px-6 py-4 font-mono font-bold text-emerald-700">{row.tempPassword || "—"}</td>
                        )}
                        {activeFilter === "rejected" && (
                          <td className="px-6 py-4 text-rose-600">{row.notes || "—"}</td>
                        )}

                        <td className="px-6 py-4 space-x-2 whitespace-nowrap text-right flex justify-end items-center">
                          {row.status === "pending" && (
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
