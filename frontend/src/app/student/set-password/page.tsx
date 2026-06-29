"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useAuth } from "@/context/AuthContext";
import { isStrongPassword } from "@/lib/accounts";

function SetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();
  const email = params.get("email") ?? "";
  const queryToken = params.get("token") ?? "";

  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isStrongPassword(next)) {
      setError(
        "Password must be at least 8 characters with a mix of letters, numbers & symbols.",
      );
      return;
    }
    if (next !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    try {
      if (queryToken) {
        // Came from forgot password flow
        const res = await fetch("http://localhost:5000/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, token: queryToken, newPassword: next }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || "Failed to reset password.");
          return;
        }
        setError(null);
        login(data.user, data.token);
        router.push("/student/dashboard");
      } else {
        // First time activation flow (user is already logged in, token is in sessionStorage)
        const token = sessionStorage.getItem("ims.student.token");
        if (!token) {
          setError("Session expired. Please log in again.");
          return;
        }

        const res = await fetch("http://localhost:5000/api/auth/activate-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ newPassword: next }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || "Failed to activate account.");
          return;
        }
        setError(null);
        
        login(
          {
            role: "student",
            firstName: data.user.firstName,
            lastName: data.user.lastName,
            studentId: data.user.studentId,
            email: data.user.email,
          },
          token
        );
        router.push("/student/profile/edit");
      }
    } catch {
      setError("Unable to connect to the backend server.");
    }
  };

  return (
    <div className="flex flex-1 items-start justify-center bg-sky px-6 py-16">
      <div className="w-full max-w-lg rounded-xl bg-teal px-8 py-10 text-white shadow-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white">
          <Lock className="h-7 w-7 text-navy" />
        </div>
        <h1 className="text-center text-xl font-bold">Set Your New Password</h1>
        <p className="mt-2 text-center text-sm text-white/75">
          Create a strong password to secure your portal access
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="new" className="mb-1.5 block text-sm font-semibold">
              New Password
            </label>
            <PasswordInput
              id="new"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
            />
            <p className="mt-2 text-xs text-white/70">
              Password must be at least 8 characters with a mix of letters,
              numbers &amp; symbols
            </p>
          </div>

          <div>
            <label
              htmlFor="confirm"
              className="mb-1.5 block text-sm font-semibold"
            >
              Confirm Password
            </label>
            <PasswordInput
              id="confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-lg bg-periwinkle py-3.5 text-sm font-bold text-navy-deep transition-colors hover:bg-periwinkle/90"
          >
            {queryToken ? "Reset Password" : "Activate Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <>
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center bg-sky text-navy-deep">
            Loading…
          </div>
        }
      >
        <SetPasswordForm />
      </Suspense>
      <Footer />
    </>
  );
}
