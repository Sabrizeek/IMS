"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Info, User as UserIcon } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Field, Input, Label, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { SPECIALIZATIONS, type Specialization, type StudentProfile } from "@/lib/types";

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, ready, profile, setProfile } = useAuth();
  useAuthGuard("student", "/student/login");
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<StudentProfile>({
    name: "",
    studentId: "",
    email: "",
    specialization: "",
    specializationConfirmed: false,
    photo: undefined,
  });

  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setForm(profile);
      setConfirm(profile.specializationConfirmed);
    }
  }, [profile]);

  const locked = profile?.specializationConfirmed ?? false;

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, photo: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.photo) {
      setError("Please upload a profile photo to continue.");
      return;
    }

    if (!form.specialization) {
      setError("Please select a specialization to continue.");
      return;
    }

    if (!locked && !confirm) {
      setError("Please confirm your specialization to continue.");
      return;
    }

    setError(null);
    setProfile({
      ...form,
      specializationConfirmed: locked || confirm,
    });
    router.push("/student/dashboard");
  };

  if (!ready || user?.role !== "student") {
    return <main className="flex flex-1 items-center justify-center bg-sky text-navy-deep min-h-screen">Loading…</main>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 bg-sky p-6">
        <div className="mx-auto max-w-3xl py-10">
          <form onSubmit={handleSubmit} className="rounded-3xl bg-white/70 p-8 sm:p-12 shadow-sm">
            <h1 className="text-xl font-bold text-navy-deep">Academic Identity</h1>
            <p className="mt-1 text-sm text-navy-deep/70">Please provide your details as they appear on your official enrollment documents</p>

            {/* Profile Photo සහ විස්තරය එකම පේළියේ පෙන්වීම */}
            <div className="mt-8 flex items-center gap-6">
              <div className="relative">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-navy/20 border-2 border-white">
                  {form.photo ? (
                    <img src={form.photo} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <UserIcon className="h-14 w-14 text-navy-deep/70" />
                  )}
                </div>
                <button type="button" onClick={() => fileRef.current?.click()} className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-navy-deep text-white shadow-md hover:bg-navy">
                  <Camera className="h-4 w-4" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
              </div>

              {/* අලුතින් එක් කළ පෙළ කොටස */}
              <div className="flex flex-col">
                <h2 className="font-semibold text-navy-deep">Profile Photo</h2>
                <p className="text-sm text-navy-deep/70 max-w-xs">
                  Upload a clear, front-facing professional headshot with a solid blue background. Recommended size: 400x400px.
                </p>
              </div>
            </div>

            {/* Fields */}
            <div className="mt-8 space-y-5">
              <Field label="Name" htmlFor="name">
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </Field>

              <Field label="Student ID" htmlFor="studentId">
                <Input id="studentId" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required />
              </Field>

              <Field label="University Email" htmlFor="email">
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </Field>

              <div>
                <Label htmlFor="specialization">Specialization</Label>
                <Select id="specialization" value={form.specialization} disabled={locked} onChange={(e) => setForm({ ...form, specialization: e.target.value as Specialization | "" })}>
                  <option value="">Select your specialization</option>
                  {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </div>

              {/* Confirm Checkbox */}
              <label className="flex gap-3 rounded-lg bg-sky/60 p-4 cursor-pointer">
                <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-0.5 h-5 w-5 accent-navy-deep" />
                <span className="text-sm text-navy-deep">
                  <span className="font-semibold">I confirm that this is my correct specialization</span>
                  <span className="mt-1 block text-navy-deep/70">By checking this box, you acknowledge that your specialization cannot be modified after clicking Save & Continue</span>
                </span>
              </label>

              {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
            </div>

            <div className="mt-8 flex justify-center">
              <Button type="submit" className="px-10 py-3.5">Save & Continue →</Button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}