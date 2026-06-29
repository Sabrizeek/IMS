"use client";

import { useEffect, useMemo, useState } from "react";

import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { StudentNav } from "@/components/layout/StudentNav";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import {
  GRADES,
  calculateGpa,
  semesterGpa,
  totalCredits,
} from "@/lib/gpa";
import { newRow } from "@/lib/semesters";
import type { Grade, Semester, SubjectRow } from "@/lib/types";

export default function GpaCalculatorPage() {
  const { user, ready, semesters, setSemesters } = useAuth();
  useAuthGuard("student", "/student/login");

  // Editable working copy; the context/sessionStorage holds the committed data.
  const [draft, setDraft] = useState<Semester[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (semesters.length) {
      setDraft(semesters);
      setOpenId((cur) => cur ?? semesters[0].id);
    }
  }, [semesters]);

  // Summary cards reflect the committed data.
  const gpa = useMemo(() => calculateGpa(semesters), [semesters]);
  const credits = useMemo(() => totalCredits(semesters), [semesters]);

  const updateSemester = (id: string, rows: SubjectRow[]) =>
    setDraft((prev) => prev.map((s) => (s.id === id ? { ...s, rows } : s)));

  const commit = (next: Semester[]) => {
    setDraft(next);
    setSemesters(next);
  };

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
          <h1 className="text-2xl font-bold text-navy-deep">GPA Calculator</h1>
          <p className="mt-1 text-navy-deep/70">
            Simulate your academic performance and project your graduation grade
          </p>

          {/* Summary cards */}
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl bg-navy px-7 py-6 text-white">
              <p className="text-sm uppercase tracking-wide text-white/70">
                Current Cumulative GPA
              </p>
              <p className="mt-3 text-5xl font-bold">
                {gpa.toFixed(2)}
                <span className="ml-1 text-2xl font-normal text-white/70">
                  /4.0
                </span>
              </p>
            </div>
            <div className="rounded-xl bg-navy px-7 py-6 text-white">
              <p className="text-sm uppercase tracking-wide text-white/70">
                Total Credit Earned
              </p>
              <p className="mt-3 text-5xl font-bold">
                {credits}
                <span className="ml-2 text-base font-normal text-white/70">
                  Credits
                </span>
              </p>
            </div>
          </div>

          {/* Semester accordions */}
          <div className="mt-8 space-y-4">
            {draft.map((semester) => (
              <SemesterAccordion
                key={semester.id}
                semester={semester}
                open={openId === semester.id}
                onToggle={() =>
                  setOpenId((cur) => (cur === semester.id ? null : semester.id))
                }
                onRowsChange={(rows) => updateSemester(semester.id, rows)}
                onSave={() => commit(draft)}
              />
            ))}
          </div>

          {/* Calculate */}
          <div className="mt-8 flex justify-end">
            <Button
              variant="dark"
              className="px-8 py-3.5"
              onClick={() => {
                commit(draft);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Calculate GPA
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

function SemesterAccordion({
  semester,
  open,
  onToggle,
  onRowsChange,
  onSave,
}: {
  semester: Semester;
  open: boolean;
  onToggle: () => void;
  onRowsChange: (rows: SubjectRow[]) => void;
  onSave: () => void;
}) {
  const gpa = semesterGpa(semester);

  const setRow = (id: string, patch: Partial<SubjectRow>) =>
    onRowsChange(semester.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRow = () => onRowsChange([...semester.rows, newRow()]);
  const removeRow = (id: string) =>
    onRowsChange(semester.rows.filter((r) => r.id !== id));

  return (
    <div className="overflow-hidden rounded-xl border border-white/60 bg-sky-soft/70">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <span className="flex items-center gap-3 font-bold text-navy-deep">
          <ChevronRight
            className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`}
          />
          {semester.name}
        </span>
        {gpa > 0 && (
          <span className="text-sm font-medium text-navy-deep/70">
            GPA {gpa.toFixed(2)}
          </span>
        )}
      </button>

      {open && (
        <div className="bg-sky-soft px-6 pb-6 pt-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-navy-deep">
              {semester.name} Results
            </h3>
            <Button variant="dark" onClick={addRow} className="px-4 py-2">
              <Plus className="h-4 w-4" />
              Add Row
            </Button>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[1.4fr_1fr_1fr_2.2rem] gap-3 border-b border-navy-deep/20 pb-2 text-xs font-semibold uppercase tracking-wide text-navy-deep/70 lg:grid-cols-[1.4fr_1fr_1fr_1.6fr]">
            <span>Subject Code</span>
            <span>Credit</span>
            <span>Grade</span>
            <span className="hidden lg:block" />
          </div>

          {/* Rows + note */}
          <div className="mt-3 grid gap-4 lg:grid-cols-[2fr_1.2fr]">
            <div className="space-y-3">
              {semester.rows.map((row, i) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[1.4fr_1fr_1fr_2.2rem] items-center gap-3"
                >
                  <input
                    className={fieldClass}
                    placeholder={`e.g. CS${123 - i * 10}`}
                    value={row.code}
                    onChange={(e) => setRow(row.id, { code: e.target.value })}
                    onBlur={async () => {
                      const codeVal = row.code.trim();
                      if (!codeVal) return;
                      try {
                        const token = sessionStorage.getItem("ims.student.token");
                        const res = await fetch(`http://localhost:5000/api/subjects?code=${encodeURIComponent(codeVal)}&semester=${encodeURIComponent(semester.name)}`, {
                          headers: token ? { Authorization: `Bearer ${token}` } : {},
                        });
                        if (res.ok) {
                          const data = await res.json();
                          if (data.subjects && data.subjects.length > 0) {
                            const match = data.subjects[0];
                            setRow(row.id, { code: match.code, credit: match.credits.toString() });
                          } else {
                            alert(`Subject code "${codeVal}" not found in database. Delta (D) or Beta (B) subjects are allowed (e.g. MAT121D).`);
                          }
                        }
                      } catch (err) {
                        console.error("Subject lookup failed:", err);
                      }
                    }}
                  />
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    disabled={true}
                    className={`${fieldClass} text-center disabled:opacity-60 disabled:cursor-not-allowed`}
                    placeholder="—"
                    value={row.credit}
                    onChange={(e) => setRow(row.id, { credit: e.target.value })}
                  />
                  <select
                    className={`${fieldClass} cursor-pointer`}
                    value={row.grade}
                    onChange={(e) =>
                      setRow(row.id, { grade: e.target.value as Grade | "" })
                    }
                  >
                    <option value="">—</option>
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    aria-label="Remove row"
                    disabled={semester.rows.length === 1}
                    className="flex justify-center text-red-500 transition-colors hover:text-red-600 disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-col justify-between gap-4">
              <p className="text-sm leading-relaxed text-navy-deep/80">
                <span className="font-bold text-red-600">Note</span>: When
                entering a subject code for an extra subject, use{" "}
                <strong>D</strong> for Delta (Δ) subjects and <strong>B</strong>{" "}
                for Beta (β) subjects (e.g., MAT121D, MAT121B).
              </p>
              <Button
                variant="dark"
                onClick={onSave}
                className="self-end px-8 py-2.5"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const fieldClass =
  "w-full rounded-md border border-navy-deep/30 bg-sky/40 px-3 py-2.5 text-sm text-navy-deep placeholder:text-navy-deep/40 focus:outline-none focus:ring-2 focus:ring-accent/50";
