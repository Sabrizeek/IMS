"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Info, User as UserIcon } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { DepartmentNav } from "@/components/layout/DepartmentNav";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import type { DepartmentProfile } from "@/lib/types";

export default function DepartmentProfileEditPage() {
  const router = useRouter();
  const { user, ready, deptProfile, setDeptProfile } = useAuth();
  useAuthGuard("department", "/department/auth");
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<DepartmentProfile>({
    fullName: "",
    universityId: "",
    designation: "",
    academicTitle: "",
    contactNumber: "",
    email: "",
  });

  useEffect(() => {
    if (deptProfile) setForm(deptProfile);
  }, [deptProfile]);

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, photo: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDeptProfile(form);
    router.push("/department/dashboard");
  };

  if (!ready || user?.role !== "department") {
    return (
      <main className="flex flex-1 items-center justify-center bg-sky-soft text-navy-deep">
        Loading…
      </main>
    );
  }

  return (
    <>
      <DepartmentNav />
      <main className="flex-1 bg-sky-soft flex items-center justify-center">
        <div className="w-full max-w-lg px-6 py-12">
          <form onSubmit={handleSubmit}>
            <section className="rounded-[32px] bg-white px-8 py-10 text-center shadow-xs border border-slate-100">
              <h2 className="text-2xl font-extrabold text-navy-deep">Profile Photo</h2>
              
              <p className="mx-auto mt-2 max-w-xs text-sm text-navy-deep/70">
                Add a clear, formal photo for your identification in the system.
              </p>

              <div className="relative mx-auto mt-8 w-fit">
                <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-4 border-navy-deep bg-slate-50 shadow-inner">
                  {form.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.photo} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <UserIcon className="h-24 w-24 text-slate-300" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  aria-label="Upload photo"
                  className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-navy-deep text-white shadow-md hover:bg-navy-deep/90 transition-all hover:scale-105"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-slate-100 py-3.5 text-sm font-bold tracking-wide text-navy-deep transition hover:bg-slate-200"
              >
                <Camera className="h-5 w-5" />
                Browse Photo
              </button>
              
              <p className="mt-3 text-[11px] font-semibold text-slate-400">
                Max size 5MB. Formats: JPG, PNG.
              </p>

              <div className="mt-6 flex items-start gap-3 rounded-xl bg-sky-50 px-4 py-4 text-left text-sm text-sky-800 border border-sky-100">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                <p className="text-xs font-medium leading-relaxed">
                  This photo will be visible on student internship certificates
                  and faculty directories.
                </p>
              </div>

              {error && <p className="mt-6 text-sm text-rose-600 font-bold">{error}</p>}

              <Button type="submit" variant="dark" className="mt-8 w-full py-4 text-sm tracking-widest rounded-xl">
                SAVE & CONTINUE
              </Button>

              <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={onPhoto} />
            </section>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}