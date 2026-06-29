"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function DashboardHeader({ subtitle }: { subtitle?: string }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const name =
    user?.role === "student"
      ? `${user.firstName} ${user.lastName}`.trim()
      : user?.email;

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <header className="bg-navy-deep text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-xl font-bold tracking-wide">IMS</span>
          {subtitle && (
            <span className="text-sm text-white/60">{subtitle}</span>
          )}
        </Link>

        <div className="flex items-center gap-4">
          {name && <span className="hidden text-sm text-white/80 sm:inline">{name}</span>}
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/20"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
