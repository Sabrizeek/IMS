"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2 } from "lucide-react";
import { BackToDashboard } from "@/components/layout/BackToDashboard";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";

export default function DepartmentProfileUploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError(null);

    if (!file) {
      setError("No file selected.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Please select an image smaller than 5MB.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file (JPG or PNG).");
      return;
    }

    setFileName(file.name);

    // Simulate processing, then navigate to dashboard.
    await new Promise((resolve) => setTimeout(resolve, 400));
    router.push("/department/dashboard");
  };

  return (
    <main className="flex-1 bg-sky-soft">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6">
          <BackToDashboard />
        </div>

        <div className="overflow-hidden rounded-3xl shadow-2xl ring-1 ring-navy-deep/10 bg-white">
          <div className="bg-navy-deep px-10 py-10 text-center text-white">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
              <Camera className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-semibold">Upload Profile Photo</h1>
            <p className="mt-3 max-w-2xl mx-auto text-sm text-white/75">
              Add a clear, professional photo for your department profile. This image may be used in system reports and department dashboards.
            </p>
          </div>

          <div className="px-10 py-12">
            <div className="mx-auto flex max-w-xl flex-col items-center gap-8 rounded-3xl bg-slate-50 px-8 py-10 text-center shadow-sm">
              <div className="flex h-40 w-40 items-center justify-center rounded-full bg-slate-100 text-slate-400 shadow-inner">
                <Camera className="h-14 w-14" />
              </div>

              <div className="space-y-3 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Upload Profile Photo</p>
                <p>Add a clear, formal photo for your identification in the system.</p>
                <p className="text-xs text-slate-500">Max size 5MB. Formats: JPG, PNG.</p>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              <Button type="button" className="w-full max-w-sm py-3.5" onClick={handleButtonClick}>
                Add Photo
              </Button>

              {fileName && (
                <div className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700">
                  Selected file: <span className="font-semibold">{fileName}</span>
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-left text-sm text-slate-600">
                <p className="font-semibold">Note</p>
                <p>This photo will be visible on department profiles and internal system summaries.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
