"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
];

export default function DepartmentDashboard() {
  const { user, ready } = useAuth();
  useAuthGuard("department", "/department/auth");
  const [stats, setStats] = useState({
    registrationRequestsCount: 0,
    activeStudentsCount: 0,
    pendingApprovalsCount: 0,
  });

  useEffect(() => {
    if (!ready || user?.role !== "department") return;
    
    async function fetchStats() {
      try {
        const token = sessionStorage.getItem("ims.department.token");
        const res = await fetch("http://localhost:5000/api/students/dashboard-stats/count", {
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
  }, [ready, user]);

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
        <section className="grid gap-6 md:grid-cols-3">
          {dynamicCards.map((card) => (
            <div 
              key={card.title} 
              className={`rounded-[32px] p-8 shadow-xs flex flex-col justify-between min-h-[380px] ${card.className}`}
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.24em] opacity-80">
                    {card.badge}
                  </p>
                  {card.badgeLabel ? (
                    <span className="rounded-md bg-rose-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                      {card.badgeLabel}
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-8 text-xl font-bold tracking-wide">{card.title}</h2>
                <p className="mt-3 text-xs opacity-75 leading-relaxed max-w-xs">
                  {card.title === "Registration Verifications" && "Monitor and re-send registration verification emails to students with pending or unverified accounts."}
                  {card.title === "Student Details" && "Access and manage the centralized repository of all departmental internship enrollments."}
                  {card.title === "Pending Approvals" && "Internship applications and site validations requiring immediate department review."}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">{card.subtitle}</p>
                <p className="text-5xl font-black mt-1 tracking-tight">{card.metric}</p>
                
                <Link
                  href={card.href}
                  className={`mt-6 inline-flex w-full items-center justify-center rounded-xl py-3 text-xs font-bold transition shadow-2xs ${
                    card.title === "Pending Approvals"
                      ? "border border-[#0b1b33]/30 bg-transparent text-[#0b1b33] hover:bg-[#0b1b33]/10"
                      : card.title === "Student Details"
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

      <Footer />
    </div>
  );
}