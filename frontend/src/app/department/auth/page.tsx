"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link"; // Link එක import කරන්න
import { Building2, ArrowLeft } from "lucide-react"; // ArrowLeft අයිකනය එක් කරන්න
import { Footer } from "@/components/layout/Footer";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function DepartmentAuthPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError("Please enter a valid university email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to log in.");
        setLoading(false);
        return;
      }
      if (data.user.role !== "department" && data.user.role !== "admin") {
        setError("Unauthorized access. This portal is for department staff only.");
        setLoading(false);
        return;
      }

      await login(
        {
          role: "department",
          email: data.user.email,
        },
        data.token
      );
      router.push("/department/dashboard");
    } catch {
      setError("Unable to connect to the backend server.");
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 bg-sky-soft">
      <div className="mx-auto max-w-md px-6 py-10">
        {/* මෙතැනදී BackToDashboard වෙනුවට Link එක යොදා ඇත */}
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-navy-deep hover:underline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <div className="overflow-hidden rounded-3xl shadow-2xl ring-1 ring-navy-deep/10">
          <div className="bg-navy-deep px-10 py-10 text-center text-white">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
              <Building2 className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-semibold">Department Portal</h1>
            <p className="mt-3 max-w-sm mx-auto text-sm text-white/75">
              Use your university email and the default password provided by the system administrator.
            </p>
          </div>

          <div className="bg-panel px-10 py-10">
            <h2 className="text-xl font-semibold text-navy-deep">Department Login</h2>
            <p className="mt-2 text-sm text-slate-600">
              Login only. Department accounts are created and managed by the administrator.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <Field label="University Email" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  placeholder="department@university.example"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>

              <Field label="Password" htmlFor="password">
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button type="submit" className="w-full py-3.5" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
