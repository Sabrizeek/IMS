"use client";

import { useState } from "react";
import Link from "next/link";
import { GraduationCap, KeyRound, Copy, Check } from "lucide-react";
import { BackHome } from "@/components/layout/BackHome";
import { Footer } from "@/components/layout/Footer";
import { Field, Input } from "@/components/ui/Field";
import { Button, LinkButton } from "@/components/ui/Button";

export default function StudentSignupPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    studentId: "",
    email: "",
  });
  const [submittedRequest, setSubmittedRequest] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }

    const studentIdRegex = /^SC\/\d{4}\/\d{5}$/;
    if (!studentIdRegex.test(form.studentId.trim())) {
      setError("Student ID must be in the format SC/YYYY/DDDDD (e.g., SC/2022/12793).");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/account-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to submit request.");
        return;
      }
      setSubmittedRequest(true);
    } catch {
      setError("Unable to connect to the backend server.");
    }
  };

  return (
    <>
      <main className="flex-1 bg-sky">
        <div className="mx-auto max-w-md px-6 py-10">
          <div className="mb-6">
            <BackHome />
          </div>

          <div className="overflow-hidden rounded-2xl shadow-xl">
            {/* Header */}
            <div className="bg-navy px-8 py-8 text-center text-white">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
                <GraduationCap className="h-7 w-7" />
              </div>
              <h1 className="text-2xl font-bold">Student Portal</h1>
              <p className="mt-1 text-sm text-white/75">
                Register to access your internship dashboard
              </p>
            </div>

            {/* Body */}
            <div className="bg-panel px-8 py-8">
              {submittedRequest ? (
                <AccountCreated email={form.email} />
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="First Name" htmlFor="firstName">
                      <Input
                        id="firstName"
                        placeholder="Enter first name"
                        value={form.firstName}
                        onChange={set("firstName")}
                        required
                      />
                    </Field>
                    <Field label="Last Name" htmlFor="lastName">
                      <Input
                        id="lastName"
                        placeholder="Enter last name"
                        value={form.lastName}
                        onChange={set("lastName")}
                      />
                    </Field>
                  </div>
                  <Field label="Student ID" htmlFor="studentId">
                    <Input
                      id="studentId"
                      placeholder="e.g. SC/2020/12345"
                      value={form.studentId}
                      onChange={set("studentId")}
                      required
                    />
                  </Field>
                  <Field label="University Email" htmlFor="email">
                    <Input
                      id="email"
                      type="email"
                      placeholder="student@university.ruh.ac.lk"
                      value={form.email}
                      onChange={set("email")}
                      required
                    />
                  </Field>

                  {error && <p className="text-sm text-red-600">{error}</p>}

                  <Button type="submit" variant="dark" className="w-full py-3.5">
                    Create Account
                  </Button>

                  <p className="text-center text-sm text-navy-deep/70">
                    Already have an account?{" "}
                    <Link
                      href="/student/login"
                      className="font-semibold text-navy hover:underline"
                    >
                      Log in
                    </Link>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function AccountCreated({ email }: { email: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-navy/10">
        <KeyRound className="h-6 w-6 text-navy" />
      </div>
      <h2 className="text-lg font-bold text-navy-deep">Request Submitted</h2>
      <p className="mt-2 text-sm text-navy-deep/70">
        Your registration request has been successfully submitted to the department.
      </p>

      <div className="mt-5 flex items-center justify-center gap-3 rounded-lg border border-navy/20 bg-white px-4 py-3">
        <code className="text-lg font-bold tracking-wider text-navy-deep">
          PENDING VERIFICATION
        </code>
      </div>

      <p className="mt-4 text-xs text-navy-deep/60">
        Once the department approves, your temporary password will be logged in the backend terminal console.
      </p>

      <LinkButton
        href={`/student/login?email=${encodeURIComponent(email)}`}
        variant="dark"
        className="mt-6 w-full py-3.5"
      >
        Continue to Login
      </LinkButton>
    </div>
  );
}
