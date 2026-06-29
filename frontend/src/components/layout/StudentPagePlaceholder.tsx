"use client";

import { StudentNav } from "@/components/layout/StudentNav";
import { Footer } from "@/components/layout/Footer";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAuth } from "@/context/AuthContext";

export function StudentPagePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { user, ready } = useAuth();
  useAuthGuard("student", "/student/login");

  if (!ready || user?.role !== "student") {
    return (
      <main className="flex flex-1 items-center justify-center bg-sky text-navy-deep">
        Loading…
      </main>
    );
  }

  return (
    <>
      <StudentNav />
      <main className="flex-1 bg-sky">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <h1 className="text-2xl font-bold text-navy-deep">{title}</h1>
          <p className="mt-1 text-navy-deep/70">{description}</p>

          <div className="mt-8 rounded-2xl border border-dashed border-navy/20 bg-white/50 p-12 text-center text-navy-deep/60">
            This section is a frontend scaffold. Connect it to your backend to
            enable live data.
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
