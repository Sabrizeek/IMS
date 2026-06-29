# IMS Gap Analysis — SRS vs Current Implementation

> **Audit Date**: 2026-06-29
> **Scope**: Frontend (Next.js, `d:/IMS/frontend`) + Backend (Express/MongoDB, `d:/IMS/backend`)
> **SRS Source**: INTERNSHIP MANAGEMENT SYSTEM (2).pdf
> **Phase boundary reminder (do not merge)**: Record Book _student-side_ (FR-T08–T13) = Phase 3; Record Book _department-side_ (FR-D17–D22) = Phase 4. The shared week-status enum (`"Draft" | "Edited" | "Submitted"`) already exists in both layers — **do not redefine it**.

---

## 1. FR Status Table

### Part 01 — Registration / Auth (FR-F01 – FR-F09)

| FR ID | Requirement (1-line) | Backend Status | Frontend Status | UI Impact | Contract Match | Combined Status | Notes |
|-------|----------------------|----------------|-----------------|-----------|----------------|-----------------|-------|
| FR-F01 | Student submits registration request (name, ID, email) | Complete — `POST /api/account-requests` (createRequest) | Complete — `student/auth/page.tsx` | — | Match | **Complete** | Duplicate check for email and studentId present |
| FR-F02 | Department verifies request (accept/reject) | Complete — `PUT /api/account-requests/:id` (updateRequest) | Complete — `department/verification/page.tsx` | — | Match | **Complete** | Rejection reason via window.prompt() not a proper form |
| FR-F03 | Approval triggers temp password, account creation, activation email | Partial — account created and temp password generated; approval email still console.log only; nodemailer only wired in forgotPassword path | Complete — confirmation alert shown in verification page | Wiring only | Mismatch — real email not sent on approval | **Partial** | Need to add nodemailer to accountRequestController.updateRequest approval branch |
| FR-F04 | First-time login: auto-fill email from URL, login with temp password, redirect to password setup | Complete — login returns mustResetPassword flag | Complete — login page reads ?email= param; redirects to /student/set-password on mustResetPassword:true | — | Match | **Complete** | — |
| FR-F05 | Password setup: new + confirm, validation, activate account | Complete — POST /api/auth/activate-password + POST /api/auth/reset-password | Complete — set-password/page.tsx handles both activation and reset flows | — | Match | **Complete** | Client-side validates match and strength before API call |
| FR-F06 | Initial profile setup: auto-populated fields + specialization selection + checkbox | Partial — profile auto-populated on account creation; no dedicated first-run API step | Partial — profile/edit/page.tsx handles this but NOT auto-opened after first login; dashboard shown first | New UI needed | Mismatch — SRS requires auto-redirect to profile setup after password activation; code redirects to /student/dashboard | **Partial** | set-password pushes to /student/dashboard not /student/profile/edit |
| FR-F07 | Specialization locked after confirmation | Partial — specializationConfirmed stored; PUT /api/profile/me uses $set without backend guard | Complete — profile/edit disables select when locked | — | Mismatch — backend does not reject specialization updates once confirmed | **Partial** | Backend guard missing; lock is frontend-only |
| FR-F08 | Overview page: Full Name, ID, Email, Specialization, Registration Status, optional GitHub/LinkedIn | Partial — profile data available; no registrationStatus field exposed | Partial — dashboard shows name/ID/email/spec/GPA/social links; no Registration Status | New UI needed | Mismatch — Registration Status not in API or dashboard | **Partial** | SRS requires showing Registration Status (Active/Pending) |
| FR-F09 | Forgot Password: email entry, reset link sent, new password set, redirect to overview | Complete — POST /api/auth/forgot-password uses nodemailer; POST /api/auth/reset-password validates JWT | Complete — forgot-password/page.tsx + set-password/page.tsx | — | Mismatch — after reset frontend redirects to /student/login not overview page | **Partial** | set-password with queryToken should push to /student/dashboard |

---

### Part 02 — GPA Calculator (FR-W01 – FR-W07)

| FR ID | Requirement (1-line) | Backend Status | Frontend Status | UI Impact | Contract Match | Combined Status | Notes |
|-------|----------------------|----------------|-----------------|-----------|----------------|-----------------|-------|
| FR-W01 | Auto-display subject code, name, credit per semester from DB | Partial — subjects exist and GET /api/subjects works; semesters not auto-populated from DB | Partial — loads semesters from StudentGrade.semesters not Subject collection; free-entry approach | Wiring only | Mismatch — subjects not pushed per-semester from DB | **Partial** | DB lookup on-blur only; not automatic display |
| FR-W02 | Students enter only Grade; credits come from DB (not editable) | Partial — Subject model has credits field | Missing — credit field is editable input | Existing UI contradicts SRS | Mismatch — SRS says students shall NOT modify credits | **Mismatched** | Credit input must be locked/read-only after DB lookup |
| FR-W03 | Grade validation against authorized list; invalid grade shows error | Complete — schema enum restricts grades | Partial — grade is a select limited to valid values; no explicit error message | Wiring only | Match | **Partial** | "Invalid Grade Entered" message not shown |
| FR-W04 | Optional subjects: add row, enter subject code, system auto-fills credits | Complete — GET /api/subjects?code=CODE | Complete — onBlur calls API and auto-fills credits | — | Match | **Complete** | Credits auto-filled but field still editable (see FR-W02) |
| FR-W05 | Subject code must exist AND belong to selected semester | Partial — API checks existence only; no semester check | Partial — error shown if not found; no semester check | Wiring only | Mismatch — semester validation missing in both layers | **Partial** | Subject model has no semester field |
| FR-W06 | Calculate semester GPA and overall GPA | Complete — correct formula in gpaController.js | Complete — lib/gpa.ts matches backend formula | — | Match | **Complete** | — |
| FR-W07 | Display semester GPA, total credits, overall GPA | Complete — GET /api/gpa/me returns all | Complete — shown in summary cards and accordion header | — | Match | **Complete** | Per-semester GPA only in header, not a dedicated result row |

---

### Part 03 — Portfolio / Internship / Record Book (FR-T01 – FR-T15)

| FR ID | Requirement (1-line) | Backend Status | Frontend Status | UI Impact | Contract Match | Combined Status | Notes |
|-------|----------------------|----------------|-----------------|-----------|----------------|-----------------|-------|
| FR-T01 | Portfolio upload: CV, Academic Projects, Certifications, Additional Items | Partial — portfolioFiles[] and portfolio upload route exist; no certifications/additional fields | Partial — CV and Projects handled; no Certifications or Additional Items | New UI needed | Mismatch — portfolio upload uses multipart but FE stores CV as base64 in profile via PUT /api/profile/me | **Partial** | Certifications and Additional Portfolio Items completely missing |
| FR-T02 | Portfolio visible to Department | Complete — GET /api/students/:id returns all portfolio data | Complete — student-details page shows CV and projects | — | Match | **Complete** | — |
| FR-T03 | Student selects I Have Been Selected or Not Selected | Complete — state enum idle/selected/notSelected | Complete — two selection cards | — | Match | **Complete** | — |
| FR-T04 | If Selected: unlock company, position, start date, offer letter | Complete | Complete — fields disabled unless state=selected | — | Match | **Complete** | — |
| FR-T05 | If Not Selected: offer letter locked, warning shown | Complete | Complete | — | Match | **Complete** | — |
| FR-T06 | Progress Tracker: 3 stages with color indicators | Partial — state/approved determine stage | Complete — 3-stage timeline with active/inactive indicators | — | Match | **Complete** | — |
| FR-T07 | Department reviews offer letter, may approve/reject | Complete — PATCH /api/internships/:id/review | Complete — review modal in approvals page | — | Match | **Complete** | Student self-approval simulation button still in student UI (dev artifact) |
| FR-T08 | Record Book locked initially; unlocked after offer letter approval | Complete — application.approved gate | Complete — record-book checks approved before rendering | — | Match | **Complete** | Phase 3 boundary |
| FR-T09 | Weekly Record Book: enter activities, save draft, edit; fields: week#, start, end, activities | Complete — POST/PUT /api/weekly-records | Complete — 24-week grid with textarea and save/submit buttons | — | Match | **Complete** | Phase 3 boundary |
| FR-T10 | Edit before submission or within active week; no edit after submission | Complete — checks status=Submitted and isLocked | Complete — UI disables editing for submitted/locked weeks | — | Match | **Complete** | Phase 3 boundary |
| FR-T11 | Record status: Draft, Edited, Submitted | Complete — enum in WeeklyRecord.status | Complete — status displayed per week | — | Match | **Complete** | Phase 3 boundary |
| FR-T12 | Auto-close week when end date passed | Complete — listMyRecords auto-updates isLocked | Complete — frontend isPast check | — | Match | **Complete** | Phase 3 boundary |
| FR-T13 | Generate/download weekly and 3-week summary PDF reports | Missing — no PDF generation endpoint | Partial — generates plain-text blob named .pdf | Wiring only | Mismatch — SRS requires actual PDF format | **Partial** | Phase 3 boundary; real PDF generation needed |
| FR-T14 | Placement rejection: status=Rejected, reason stored, student notified in dashboard + nav bar | Complete — rejectionReason stored; rejection logged | Partial — shown on internship-status page only; no dashboard notification or nav bell | New UI needed | Match on data; Mismatch on notification surface | **Partial** | Dashboard widget and nav bar notification panel required |
| FR-T15 | Display exact rejection reason | Complete | Complete — shown in internship-status page | — | Match | **Complete** | — |

---

### Part 04 — Department Portal (FR-D01 – FR-D22)

| FR ID | Requirement (1-line) | Backend Status | Frontend Status | UI Impact | Contract Match | Combined Status | Notes |
|-------|----------------------|----------------|-----------------|-----------|----------------|-----------------|-------|
| FR-D01 | Department login interface | Complete — POST /api/auth/login | Complete — department/auth/page.tsx | — | Match | **Complete** | — |
| FR-D02 | Dashboard with 3 widgets: Registration Requests, Student Details, Pending Approvals | Complete — GET /api/students/dashboard-stats/count returns all 3 | Complete — 3 dynamic cards | — | Match | **Complete** | — |
| FR-D03 | View all registration requests: name, ID, email, date, status | Complete — GET /api/account-requests | Complete — verification page table | — | Match | **Complete** | — |
| FR-D04 | Filter by Pending/Accepted/Rejected | Complete — supports ?status= query param | Complete — 3 filter buttons; client-side filtering | — | Minor mismatch — FE fetches all then filters; backend param unused | **Complete** | Functional but inefficient at scale |
| FR-D05 | Accept/reject registration | Complete | Complete | — | Match | **Complete** | — |
| FR-D06 | View student profiles: name, ID, email, spec, GPA, internship status | Complete — GET /api/students | Complete — student-details table | — | Match | **Complete** | — |
| FR-D07 | Filter by specialization, internship status, GPA order | Complete — returns all data | Complete — client-side filters | — | Match | **Complete** | — |
| FR-D08 | View student profile + CV + portfolio (projects, certs, LinkedIn, GitHub) | Complete — GET /api/students/:id | Partial — CV and projects shown; certifications missing (see FR-T01) | — | Partial — certifications missing from storage and display | **Partial** | — |
| FR-D09 | Total Registered Students count updates automatically | Complete — activeStudentsCount in stats | Complete — Student Details card shows count | — | Match | **Complete** | Count requires specializationConfirmed=true — matches SRS workflow |
| FR-D10 | Placement review queue: student name, company, position, date, status | Complete — GET /api/internships (listAll) | Complete — approvals table | — | Match | **Complete** | — |
| FR-D11 | Filter placements: Pending Review / Approved | Backend returns all | Complete — 2 filter tabs | — | Minor — Rejected shown under Approved tab | **Complete** | Label mismatch: Rejected should have own tab per SRS |
| FR-D12 | Placement review modal with offer letter view | Complete | Complete — review modal with offer embed | — | Match | **Complete** | — |
| FR-D13 | Approve placement: status=Approved, progress tracker active, record book unlocked | Complete — application.approved=true | Complete — record book checks approved | — | Match | **Complete** | — |
| FR-D14 | Reject placement with mandatory rejection reason | Complete — rejectionReason required | Partial — no client-side required validation before API call | Wiring only | Match | **Partial** | Frontend must validate non-empty before calling /review |
| FR-D15 | Student receives rejection: status + reason, record book stays locked | Complete | Complete — shown on internship-status page | — | Match | **Complete** | — |
| FR-D16 | Re-submission support | Complete — POST /api/internships upserts and resets approved=false | Complete — fields re-enabled after rejection | — | Match | **Complete** | — |
| FR-D17 | Department accesses all approved student record books | Complete — GET /api/weekly-records/student/:studentId | Complete — approvals page opens record book modal per student | — | Match | **Complete** | Phase 4 boundary |
| FR-D18 | View submitted/active/future weeks with details | Complete — endpoint returns all records | Complete — record book modal shows week table | — | Match | **Complete** | Phase 4 boundary |
| FR-D19 | Monitor record status: Draft/Edited/Submitted per week | Complete | Complete — status shown per row | — | Match | **Complete** | Phase 4 boundary |
| FR-D20 | Receive unlock request; approve or reject | Complete — POST /api/weekly-records/:id/unlock | Complete — unlock queue in approvals page | — | Match | **Complete** | Phase 4 boundary |
| FR-D21 | Approve unlock: week editable again; log the action | Complete — unlockRecord sets isLocked=false, logs to Log | Complete | — | Minor — log action string not differentiated from request vs approval | **Complete** | Phase 4 boundary |
| FR-D22 | Monitor total weeks completed, current week, pending/submitted reports per student | Partial — no summary aggregation endpoint | Partial — no summary stats panel exists | New UI needed | Mismatch — summary stats panel missing | **Partial** | Phase 4 boundary |

---

## 2. Validation & Enum Issues

| # | Issue | Location | SRS Requirement |
|---|-------|----------|-----------------|
| V-01 | Credit field editable by student | student/gpa/page.tsx — editable number input | FR-W01/W02: Students shall NOT modify credits |
| V-02 | Specialization lock is frontend-only | PUT /api/profile/me uses $set without checking specializationConfirmed | FR-F07: Backend must prevent modification too |
| V-03 | Rejection reason not validated before API call (department) | department/approvals/page.tsx — no required check on textarea | FR-D14: Rejection reason is mandatory |
| V-04 | Password reset redirects to login not overview page | set-password/page.tsx — pushes to /student/login on reset path | FR-F09: After reset, redirect to Overview Page |
| V-05 | After activation, redirect goes to dashboard not profile setup | set-password/page.tsx — pushes to /student/dashboard | FR-F06: After password setup profile setup begins |
| V-06 | Status enum mismatch: Rejected shown under Approved filter tab | department/approvals/page.tsx | FR-D11: Filters should be Pending Review and Approved only |
| V-07 | Approval activation email still simulated (console.log) | accountRequestController.js lines 136-145 | FR-F03: System shall send real activation email |
| V-08 | Subject semester-belonging not verified | Subject model has no semester field | FR-W05: Verify subject belongs to selected semester |
| V-09 | Reset link token exposed in UI | student/forgot-password/page.tsx displays reset link inline | FR-F09: Token-based reset links should only travel via email |
| V-10 | Unlock log action string not differentiated | weeklyRecordController.js uses same string for student request and dept approval | Audit: each action must be distinct |
| V-11 | D+ grade in frontend types not in SRS authorized list | lib/types.ts Grade type includes D+ | FR-W02: Authorized grades are A+, A, A-, B+, B, B-, C+, C, C-, D, E |
| V-12 | D+ grade in StudentGrade schema | StudentGrade.js gradeRowSchema enum includes D+ | Same as V-11 — remove D+ from enum |

---

## 3. Schema Gaps

| Model | Missing Field(s) | Required By |
|-------|-----------------|-------------|
| StudentProfile | registrationStatus (Active / Pending) | FR-F08: Overview page shows Registration Status |
| StudentProfile | certifications[] (file uploads) | FR-T01: Certifications portfolio upload |
| StudentProfile | additionalPortfolioItems[] | FR-T01: Additional Portfolio Items |
| Subject | semester (string) | FR-W05: Subject must belong to a selected semester |
| Log | action is freeform String — should be enum | FR-D audit requirements: consistent action naming |
| WeeklyRecord | versionHistory[] array | FR-D Reliability NFR: version history required |
| InternshipApplication | reviewedAt (Date) | FR-D10: No reviewed-by-dept timestamp stored |

---

## 4. Cross-cutting / NFR Gaps

| # | Category | Gap | SRS Requirement |
|---|----------|-----|-----------------|
| N-01 | Security | PATCH /api/internships/:id/review allows student self-approval (dev workaround in route) | Only department/admin shall approve placements |
| N-02 | Security | Specialization update not guarded on backend | FR-F07: System must enforce locking |
| N-03 | Security | Reset token returned in API body and displayed in UI | FR-F09: Token should only travel via email |
| N-04 | Audit | Week Unlock Requests log label used for both student request AND dept approval | Each action must be distinct in logs |
| N-05 | Audit | No log created when department rejects an unlock request | All actions shall be logged |
| N-06 | Reliability | No version history on WeeklyRecord | FR-D Reliability NFR |
| N-07 | Reliability | Activation email delivery failures not logged (console.error only) | Email delivery failures shall be logged |
| N-08 | Performance | GET /api/students has N+1 problem (3 DB queries per student sequentially) | Dashboard shall load within 3 seconds |
| N-09 | Availability | No rate limiting on public routes (account-requests, forgot-password) | General security NFR |
| N-10 | PDF | No actual PDF generation; downloads plain text with .pdf extension | FR-T13: Reports shall be in PDF format |

---

## 5. New UI Needed — Rollup

Items that require new UI elements (not just wiring). Style must match existing design.

| # | FR | Description |
|---|----|-------------|
| U-01 | FR-F06 | Auto-redirect to Profile Setup page after first-time password activation |
| U-02 | FR-F08 | Registration Status badge on student overview/dashboard |
| U-03 | FR-T01 | Certifications upload section in student portfolio page |
| U-04 | FR-T01 | Additional Portfolio Items upload section in student portfolio page |
| U-05 | FR-T14 | Dashboard notification widget for placement rejection |
| U-06 | FR-T14 | Navigation bar notification bell/panel for placement rejection alerts |
| U-07 | FR-D22 | Weekly progress summary stats panel in department approvals per student |

---

## 6. Priority-Ordered Punch List

### Critical — Breaks SRS compliance or security

| ID | FR | Item |
|----|----|------|
| C-01 | FR-F03 | Wire nodemailer into accountRequestController approval branch to send real activation email |
| C-02 | FR-F07 | Add backend guard in PUT /api/profile/me to reject specialization updates when specializationConfirmed=true |
| C-03 | N-01 | Remove student self-approval bypass from PATCH /api/internships/:id/review |
| C-04 | FR-W02 | Make credit field read-only after subject code DB lookup resolves |
| C-05 | V-11/V-12 | Remove D+ grade from StudentGrade schema enum and lib/types.ts |
| C-06 | FR-F09 | After password reset via token redirect to /student/dashboard not /student/login |
| C-07 | FR-F06 | After first-time activation redirect to /student/profile/edit not /student/dashboard |

### Important — SRS requirement not met but system still partially functional

| ID | FR | Item |
|----|----|------|
| I-01 | FR-T13 | Implement real PDF report generation on backend; update handleDownloadReport |
| I-02 | FR-D14 | Add client-side required validation for rejection reason before calling /review |
| I-03 | FR-W05 | Add semester field to Subject schema and validate subject-semester belonging |
| I-04 | FR-T14 | Add dashboard notification widget and nav bell for placement rejection (New UI U-05, U-06) |
| I-05 | FR-D22 | Add weekly progress summary stats to department approvals per student (New UI U-07) |
| I-06 | FR-F08 | Add registrationStatus field to StudentProfile and display on student overview (New UI U-02) |
| I-07 | FR-T01 | Add Certifications and Additional Portfolio Items upload to portfolio page (New UI U-03, U-04) |
| I-08 | N-08 | Fix N+1 query in GET /api/students — use parallel queries or MongoDB aggregation |
| I-09 | N-05 | Log department unlock rejection action in Log model |
| I-10 | V-10 | Differentiate log strings: Week Unlock Requested vs Week Unlock Approved vs Week Unlock Rejected |

### Polish — Minor UX or completeness improvements

| ID | FR | Item |
|----|----|------|
| P-01 | FR-D11 | Fix approvals filter: show Rejected under separate tab not under Approved |
| P-02 | FR-D04 | Use server-side filtering (?status= param) in verification page |
| P-03 | FR-W07 | Add per-semester GPA result row below each accordion |
| P-04 | N-06 | Add versionHistory[] to WeeklyRecord to satisfy reliability NFR |
| P-05 | V-09 | Remove Open Reset Link from forgot-password page in production mode |
| P-06 | N-09 | Add rate limiting middleware to POST /account-requests and POST /auth/forgot-password |
| P-07 | FR-D02 | Validate that Student Details count logic aligns with SRS (completed activations vs specializationConfirmed) |
| P-08 | FR-F02 | Replace window.prompt() for rejection reason with an inline modal form |

---

*End of GAP_ANALYSIS.md*
