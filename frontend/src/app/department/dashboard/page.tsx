"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { DepartmentNav } from "@/components/layout/DepartmentNav";
import { useAuth } from "@/context/AuthContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";

const cards = [
  {
    title: "Registration Verifications",
    badge: "Email Tracking",
    badgeLabel: "New",
    metric: "0",
    subtitle: "Verification Status",
    button: "Manage Verifications",
    href: "/department/verification",
    className: "bg-[#1d4473] text-white",
  },
  {
    title: "Student Details",
    badge: "Active Repository",
    badgeLabel: null,
    metric: "0",
    subtitle: "Total Active Students",
    button: "Manage Student Details",
    href: "/department/student-details",
    className: "bg-[#182335] text-white",
  },
  {
    title: "Pending Approvals",
    badge: "Urgent Action",
    badgeLabel: null,
    metric: "0",
    subtitle: "Tasks Outstanding",
    button: "Review Actions",
    href: "/department/approvals",
    className: "bg-[#7994b6] text-[#0b1b33]",
  },
  {
    title: "GPA Management",
    badge: "Academic Performance",
    badgeLabel: null,
    metric: null,
    body: "Upload and manage student grade records via Excel to track departmental academic performance and generate cumulative metrics.",
    button: "Manage GPA Records\u2192",
    href: "/department/gpa-management",
    className: "bg-[#182335] text-white",
  },
];

export default function DepartmentDashboard() {
  const { user, ready } = useAuth();
  useAuthGuard("department", "/department/auth");
  const [stats, setStats] = useState<{
    registrationRequestsCount: number;
    activeStudentsCount: number;
    pendingApprovalsCount: number;
    companyPlacements: Array<{ name: string; count: number; students: Array<{name: string, position: string}> }>;
  }>({
    registrationRequestsCount: 0,
    activeStudentsCount: 0,
    pendingApprovalsCount: 0,
    companyPlacements: [],
  });

  const [analyticsFilter, setAnalyticsFilter] = useState("");
  const [gpaFilter, setGpaFilter] = useState("");
  const [internTypeFilter, setInternTypeFilter] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<{name: string, count: number, students: Array<{name: string, position: string}>} | null>(null);

  useEffect(() => {
    if (!ready || user?.role !== "department") return;
    
    async function fetchStats() {
      try {
        const token = sessionStorage.getItem("ims.department.token");
        const params = new URLSearchParams();
        if (analyticsFilter) params.append("specialization", analyticsFilter);
        if (gpaFilter) params.append("gpa", gpaFilter);
        if (internTypeFilter) params.append("internType", internTypeFilter);
        
        const url = `http://localhost:5000/api/students/dashboard-stats/count?${params.toString()}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
      }
    }
    fetchStats();
  }, [ready, user, analyticsFilter, gpaFilter, internTypeFilter]);

  const handleDownloadAnalytics = () => {
    let csv = "Company,Count,Student Name,Position\n";
    stats.companyPlacements.forEach((comp) => {
      if (!comp.students || comp.students.length === 0) {
        csv += `"${comp.name}",${comp.count},,\n`;
      } else {
        comp.students.forEach((student) => {
          csv += `"${comp.name}",${comp.count},"${student.name || ''}","${student.position || ''}"\n`;
        });
      }
    });
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "company_placements_analytics.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const dynamicCards = useMemo(() => {
    return cards.map(card => {
      let metric = card.metric;
      if (card.title === "Registration Verifications") {
        metric = stats.registrationRequestsCount.toString();
      } else if (card.title === "Student Details") {
        metric = stats.activeStudentsCount.toString();
      } else if (card.title === "Pending Approvals") {
        metric = stats.pendingApprovalsCount.toString();
      }
      return { ...card, metric };
    });
  }, [stats]);

  if (!ready || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#d9effc] text-[#0b1b33]">
        Loading…
      </main>
    );
  }

  return (
    // Light background from system UI preview sheets
    <div className="min-h-screen bg-[#d9effc] flex flex-col font-sans antialiased">
      <DepartmentNav />

      <main className="mx-auto w-full max-w-[1400px] px-6 py-10 space-y-10 flex-grow">
        
        {/* Title Section Container */}
        <section className="rounded-[32px] bg-white/90 px-10 py-10 shadow-xs">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-[#0b1b33]/70">
              Department Dashboard
            </p>
            <h1 className="mt-4 text-4xl font-extrabold text-[#0b1b33]">
              Department Dashboard
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-slate-500 leading-relaxed">
              Managing student internship placements and department progress for this academic year.
            </p>
          </div>
        </section>

        {/* Action Grid Cards Section */}
        <section className="grid gap-6 md:grid-cols-4">
          {dynamicCards.map((card) => (
            <div 
              key={card.title} 
              className={`rounded-[32px] p-8 shadow-xs flex flex-col justify-between min-h-[380px] ${card.className}`}
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 bg-[#ffffff10] px-3 py-1.5 rounded-full border border-white/10">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] opacity-90">
                      {card.badge}
                    </p>
                    {card.title === "GPA Management" && <GraduationCap className="h-4 w-4 text-slate-300" />}
                  </div>
                  {card.badgeLabel ? (
                    <span className="rounded-md bg-rose-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                      {card.badgeLabel}
                    </span>
                  ) : null}
                </div>
                {card.title === "GPA Management" ? (
                  <>
                    <h2 className="mt-8 text-lg font-bold tracking-wide">{card.title}</h2>
                    <p className="mt-3 text-xs opacity-75 leading-relaxed pr-2 italic font-light">
                      {card.body}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="mt-8 text-xl font-bold tracking-wide">{card.title}</h2>
                    <p className="mt-3 text-xs opacity-75 leading-relaxed max-w-xs">
                      {card.title === "Registration Verifications" && "Monitor and re-send registration verification emails to students with pending or unverified accounts."}
                      {card.title === "Student Details" && "Access and manage the centralized repository of all departmental internship enrollments."}
                      {card.title === "Pending Approvals" && "Internship applications and site validations requiring immediate department review."}
                    </p>
                  </>
                )}
              </div>

              <div>
                {card.metric !== null && (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">{card.subtitle}</p>
                    <p className="text-5xl font-black mt-1 tracking-tight">{card.metric}</p>
                  </>
                )}
                
                <Link
                  href={card.href}
                  className={`mt-6 inline-flex w-full items-center justify-center rounded-xl py-3 text-xs font-bold transition shadow-2xs ${
                    card.title === "Pending Approvals"
                      ? "border border-[#0b1b33]/30 bg-transparent text-[#0b1b33] hover:bg-[#0b1b33]/10"
                      : card.title === "Student Details" || card.title === "GPA Management"
                      ? "bg-white text-[#0b1b33] hover:bg-slate-50"
                      : "border border-white/20 bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  {card.button}
                </Link>
              </div>
            </div>
          ))}
        </section>

        {/* Company Placement Analytics */}
        <section className="mt-6 rounded-[32px] bg-[#0f172a] p-10 shadow-sm relative">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-wide">Company Placement Analytics</h2>
              <p className="text-sm text-slate-400 mt-1">Top recruiting partners by student selection count</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={gpaFilter}
                onChange={(e) => setGpaFilter(e.target.value)}
                className="bg-[#1e293b]/60 border border-slate-700 text-slate-200 text-xs font-semibold py-2.5 px-4 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-500 cursor-pointer shadow-sm"
              >
                <option value="">All GPAs</option>
                <option value="high">GPA ≥ 3.5</option>
                <option value="mid">GPA 3.0 - 3.49</option>
                <option value="low">GPA &lt; 3.0</option>
              </select>

              <select
                value={internTypeFilter}
                onChange={(e) => setInternTypeFilter(e.target.value)}
                className="bg-[#1e293b]/60 border border-slate-700 text-slate-200 text-xs font-semibold py-2.5 px-4 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-500 cursor-pointer shadow-sm"
              >
                <option value="">All Roles</option>
                <option value="Software Engineering Intern">Software Engineering</option>
                <option value="QA Intern">QA Intern</option>
                <option value="Data Science Intern">Data Science</option>
                <option value="DevOps Intern">DevOps</option>
                <option value="UI/UX Intern">UI/UX</option>
                <option value="Business Analyst Intern">Business Analyst</option>
              </select>

              <select
                value={analyticsFilter}
                onChange={(e) => setAnalyticsFilter(e.target.value)}
                className="bg-[#1e293b]/60 border border-slate-700 text-slate-200 text-xs font-semibold py-2.5 px-4 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-500 cursor-pointer shadow-sm"
              >
                <option value="">All Specializations</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Software Engineering">Software Engineering</option>
                <option value="Information Systems">Information Systems</option>
              </select>
              <button 
                onClick={handleDownloadAnalytics}
                className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 px-6 rounded-lg transition-colors border border-slate-700 shadow-sm ml-2"
              >
                Download
              </button>
            </div>
          </div>
          
          <div className="bg-[#1e293b]/60 rounded-[24px] p-8 mt-2">
            <div className="flex items-end justify-around h-64 border-b border-slate-700/50 pb-4">
              {stats.companyPlacements.length > 0 ? (
                stats.companyPlacements.map((company, index) => {
                  const maxCount = Math.max(...stats.companyPlacements.map(c => c.count), 1);
                  return (
                    <div 
                      key={company.name} 
                      className="flex flex-col items-center justify-end w-full relative group h-full cursor-pointer"
                      onClick={() => setSelectedCompany(company)}
                    >
                      <div className="absolute bottom-full mb-2 bg-[#1e293b] text-white text-[10px] font-bold py-1 px-3 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-slate-700 z-10">
                        {company.count} Student{company.count !== 1 ? 's' : ''}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1e293b]"></div>
                      </div>
                      <div 
                        className={`w-14 rounded-t-md ${index % 2 === 0 ? "bg-slate-500" : "bg-slate-400"} transition-all duration-1000 ease-out group-hover:bg-sky-500 group-hover:shadow-[0_0_15px_rgba(14,165,233,0.5)]`} 
                        style={{ height: `${(company.count / maxCount) * 100}%` }}
                      ></div>
                      <div className="absolute -bottom-10 text-xs tracking-wide mt-4 font-medium text-slate-400 group-hover:text-white transition-colors text-center px-1 truncate w-full">
                        {company.name}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="w-full flex items-center justify-center text-slate-500 text-sm">
                  No placement data available yet.
                </div>
              )}
            </div>
            <div className="h-6"></div>
          </div>
        </section>

        {/* Split Hero Banner Section */}
        <section className="overflow-hidden rounded-[32px] shadow-xs bg-[#0b1b33]">
          <div className="grid gap-0 lg:grid-cols-2 min-h-[340px]">
            
            {/* Left Box Side Content block */}
            <div className="p-10 lg:p-14 flex flex-col justify-center bg-[#13233c]">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-sky-400">
                Empowering the Future of Career Excellence
              </p>
              <h2 className="mt-4 text-3xl font-extrabold leading-tight text-white">
                Empowering the Future of Career Excellence
              </h2>
              <p className="mt-4 text-xs leading-6 text-slate-300 max-w-md">
                The Department of Computer Science is dedicated to connecting students with industry leaders to foster innovation and practical skill development through strategic internship placements.
              </p>
            </div>
            
            {/* Right Box Side Media Frame wrapper */}
            <div 
              className="relative bg-cover bg-center min-h-[260px] lg:min-h-full flex items-center p-10 lg:p-14" 
              style={{ backgroundImage: "url('/department.jpg')" }}
            >
              {/* Overlay shading layout directly referencing design tokens */}
              <div className="absolute inset-0 bg-[#0b1b33]/75 mix-blend-multiply" />
              
              <div className="relative z-10 max-w-sm">
                <h2 className="text-3xl font-black leading-snug text-white tracking-wide drop-shadow-md">
                  University Internship Management System
                </h2>
              </div>
            </div>

          </div>
        </section>
      </main>

      {/* Selected Company Details Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] rounded-[24px] border border-slate-700 shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-[#1e293b]/50">
              <div>
                <h3 className="text-2xl font-bold text-white">{selectedCompany.name} Placements</h3>
                <p className="text-sm text-slate-400 mt-1">{selectedCompany.count} student{selectedCompany.count !== 1 ? 's' : ''} selected</p>
              </div>
              <button 
                onClick={() => setSelectedCompany(null)}
                className="text-slate-400 hover:text-white transition-colors p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="grid gap-3">
                {selectedCompany.students?.map((student, idx) => (
                  <div key={idx} className="bg-[#1e293b] rounded-xl p-4 flex justify-between items-center border border-slate-700/50 hover:border-sky-500/50 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-slate-200">{student.name || "Unknown Student"}</p>
                      <p className="text-xs text-slate-400 mt-1">{student.position || "Intern"}</p>
                    </div>
                    <div className="bg-sky-500/10 text-sky-400 text-[10px] font-bold px-3 py-1 rounded-full border border-sky-500/20">
                      Accepted
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}