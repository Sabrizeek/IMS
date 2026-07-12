"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserRound, Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";

const links = [
  { label: "Overview", href: "/student/dashboard" },
  { label: "Academic Performance", href: "/student/academic-performance" },
  { label: "Portfolio", href: "/student/portfolio" },
  { label: "InternshipStatus", href: "/student/internship-status" },
  { label: "Record Book", href: "/student/record-book" },
];

export function StudentNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, logout, profile } = useAuth();

  const [hasRejection, setHasRejection] = useState(false);

  useEffect(() => {
    if (ready && user?.role === "student") {
      fetch("http://localhost:5000/api/internships/me", {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("ims.student.token")}` },
      })
        .then((r) => r.json())
        .then((data) => {
          const app = data.application;
          if (
            app &&
            app.state === "selected" &&
            app.submittedAt &&
            !app.approved &&
            app.rejectionReason
          ) {
            setHasRejection(true);
          }
        })
        .catch(() => {});
    }
  }, [ready, user]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 bg-navy-deep text-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/student/dashboard" className="flex items-center gap-2 text-2xl font-bold tracking-wide">
          <img src="/logo.jpg" alt="IMS Logo" className="h-8 w-auto object-contain" />
          IMS
        </Link>

        <ul className="hidden flex-1 items-center justify-center gap-8 text-sm font-medium lg:flex">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <li key={l.label}>
                <Link
                  href={l.href}
                  className={`transition-colors ${
                    active ? "text-white" : "text-white/75 hover:text-white"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-4">
          <Link href="/student/internship-status" className="relative transition hover:text-white/80">
            <Bell className="h-5 w-5" />
            {hasRejection && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white shadow-sm ring-2 ring-navy-deep">
                !
              </span>
            )}
          </Link>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/25"
          >
            Logout
          </button>
          <Link href="/student/profile/edit" className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-2 ring-white/30 transition hover:bg-white/20">
            {profile?.photo ? (
              <img src={profile.photo} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <UserRound className="h-6 w-6 text-white/80" />
            )}
          </Link>
        </div>
      </nav>
    </header>
  );
}
