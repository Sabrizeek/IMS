"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Info, User as UserIcon } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Field, Input } from "@/components/ui/Field";
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

  const set = (key: keyof DepartmentProfile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

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

    if (!form.fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!form.universityId.trim()) {
      setError("Please enter your University ID.");
      return;
    }

    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid university email address.");
      return;
    }

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
      <main className="flex-1 bg-sky-soft">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            {/* Left: details */}
            <section className="rounded-xl bg-panel/40 p-8">
              <div className="-mx-8 -mt-8 mb-6 rounded-t-xl bg-panel px-8 py-5">
                <h1 className="font-bold capitalize text-navy-deep">
                  Complete Your Profile
                </h1>
                <p className="mt-1 text-sm text-navy-deep/70">
                  please provide your academic and professional details to set
                  up your administrator account
                </p>
              </div>

              <h2 className="font-bold text-navy-deep">Profile Details</h2>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Field label="Full Name" htmlFor="fullName">
                  <Input id="fullName" value={form.fullName} onChange={set("fullName")} required />
                </Field>
                <Field label="University ID" htmlFor="universityId">
                  <Input id="universityId" value={form.universityId} onChange={set("universityId")} required />
                </Field>
                <Field label="Designation" htmlFor="designation">
                  <Input id="designation" value={form.designation} onChange={set("designation")} placeholder="e.g. Internship Coordinator" />
                </Field>
                <Field label="Academic Title" htmlFor="academicTitle">
                  <Input id="academicTitle" value={form.academicTitle} onChange={set("academicTitle")} placeholder="e.g. Senior Lecturer" />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Contact Number" htmlFor="contactNumber">
                    <Input id="contactNumber" type="tel" value={form.contactNumber} onChange={set("contactNumber")} />
                  </Field>
                </div>
              </div>

              <hr className="my-8 border-navy-deep/15" />

              {error && <p className="mb-4 text-sm text-red-600 font-medium">{error}</p>}

              <Button type="submit" variant="dark" className="px-10 py-3.5">
                SAVE &amp; CONTINUE
              </Button>
            </section>

            {/* Right: photo */}
            <aside className="rounded-xl bg-sky px-8 py-10 text-center">
              <h2 className="font-bold text-navy-deep">Upload Profile Photo</h2>

              <div className="relative mx-auto mt-8 w-fit">
                <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-4 border-navy-deep bg-white">
                  {form.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.photo} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <UserIcon className="h-24 w-24 text-navy-deep" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  aria-label="Upload photo"
                  className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-navy-deep text-white shadow-md hover:bg-navy"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              <p className="mx-auto mt-4 max-w-xs text-sm text-navy-deep/70">
                Add a clear, formal photo for your identification in the system.
              </p>

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-lg bg-navy-deep py-4 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-navy"
              >
                <Camera className="h-5 w-5" />
                Add Photo
              </button>
              <p className="mt-3 text-xs text-navy-deep/60">
                Max size 5MB. Formats: JPG, PNG.
              </p>

              <div className="mt-6 flex items-start gap-3 rounded-lg bg-navy-deep px-4 py-4 text-left text-sm text-white/85">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  This photo will be visible on student internship certificates
                  and faculty directories
                </p>
              </div>

              <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={onPhoto} />
            </aside>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}