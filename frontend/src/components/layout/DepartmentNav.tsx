"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const links = [
  { label: "Overview", href: "/department/dashboard" },
  { label: "Verification", href: "/department/verification" },
  { label: "Student Details", href: "/department/student-details" },
  { label: "Approvals", href: "/department/approvals" },
];

export function DepartmentNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, deptProfile } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <header className="bg-navy-deep text-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/department/dashboard" className="text-2xl font-bold tracking-wide">
          IMS
        </Link>

        <ul className="hidden flex-1 items-center justify-center gap-8 text-sm font-medium lg:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className={`transition-colors ${
                    active ? "text-white" : "text-white/75 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/25"
          >
            Logout
          </button>
          <Link href="/department/profile/edit" className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-2 ring-white/30 transition hover:bg-white/20">
            {deptProfile?.photo ? (
              <img src={deptProfile.photo} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <UserRound className="h-6 w-6 text-white/80" />
            )}
          </Link>
        </div>
      </nav>
    </header>
  );
}
