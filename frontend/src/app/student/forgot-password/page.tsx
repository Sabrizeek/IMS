"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function StudentForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setResetLink(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid university email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to initiate password reset.");
        setLoading(false);
        return;
      }

      setSuccessMessage(
        "A password reset link has been sent to your university email. Please check your inbox.",
      );
    } catch {
      setError("Unable to connect to the backend server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-sky-soft">
      <div className="mx-auto w-full max-w-md px-6 py-10">
        <div className="mb-6">
          <Link
            href="/student/login"
            className="inline-flex items-center text-sm font-medium text-navy-deep hover:underline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Link>
        </div>

        <div className="overflow-hidden rounded-3xl shadow-2xl ring-1 ring-navy-deep/10">
          <div className="bg-navy-deep px-10 py-10 text-center text-white">
            <h1 className="text-3xl font-semibold">Forgot your Password?</h1>
            <p className="mt-3 text-sm text-white/75">
              Enter your university email to recover your account.
            </p>
          </div>

          <div className="bg-panel px-10 py-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Field label="University Email" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  placeholder="student@university.ruh.ac.lk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button type="submit" className="w-full py-3.5" disabled={loading}>
                {loading ? "Sending reset link..." : "Send Reset Link"}
              </Button>
            </form>

            {successMessage && (
              <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 shadow-sm">
                <div className="flex items-start gap-3">
                  <MailCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="font-semibold">Password reset email sent</p>
                    <p className="mt-1 text-sm leading-relaxed text-emerald-700/90">
                      {successMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 rounded-3xl bg-slate-100 px-5 py-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Need assistance?</p>
              <p className="mt-2 leading-relaxed">
                If you don't see the message, please check your spam folder or check your backend logs.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
