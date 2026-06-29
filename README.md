# University IMS – Internship Management System

Welcome to the **University Internship Management System (IMS)**, a robust, full-stack application designed to streamline student internship registrations, placement tracking, weekly logbooks (Record Book), GPA calculations, portfolio creation, and departmental verification workflows.

---

## 🚀 Overview

The system features two main portals:
1. **Student Portal**: Allows students to request accounts, calculate and log semester GPAs, track placement application status, upload offer letters, write weekly record logs, add skills, and generate summary PDF reports of their progress.
2. **Department Portal**: Allows academic administrators to verify student account requests, review and approve/reject internship placements, track progress, manage student records, and access comprehensive audit logs.

---

## 🛠️ Technologies Used

### Frontend
- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) via [Mongoose](https://mongoosejs.com/)
- **Authentication**: JWT (JSON Web Tokens) & HTTP-only authorization headers
- **Mailer**: [Nodemailer](https://nodemailer.com/) (SMTP integration)
- **PDF Generation**: [PDFKit](https://pdfkit.org/) for generating internship summary reports

---

## 📂 Project Structure

```text
IMS/
├── backend/                  # Node.js + Express Backend
│   ├── src/
│   │   ├── config/           # Database & configuration settings
│   │   ├── controllers/      # Route logic handlers (Auth, GPA, Profile, Records)
│   │   ├── middlewares/      # Express guards (Authentication, Roles, Validation)
│   │   ├── models/           # Mongoose schemas (User, WeeklyRecord, StudentProfile, etc.)
│   │   ├── routes/           # API routes declaration
│   │   └── utils/            # Helper utilities (JWT, Passwords)
│   ├── server.js             # Express entry point
│   ├── .env.example          # Environment template
│   └── package.json
│
├── frontend/                 # Next.js + Tailwind Frontend
│   ├── public/               # Static assets & files
│   ├── src/
│   │   ├── app/              # Next.js App Router pages (Student, Department)
│   │   ├── components/       # Reusable layout and custom UI components
│   │   ├── context/          # React Context (AuthContext)
│   │   ├── hooks/            # Custom React hooks (Auth guards)
│   │   └── lib/              # Frontend utility methods (GPA formulas, Validation)
│   └── package.json
│
└── README.md                 # Project root documentation
```

---

## ⚙️ Setup & Installation

### Prerequisites
Before you start, make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v18.x or above recommended)
- [MongoDB](https://www.mongodb.com/try/download/community) (running locally or a MongoDB Atlas connection URI)
- Git (optional)

---

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd IMS
```

---

### Step 2: Configure Environment Variables

#### Backend Configuration
Navigate to the `backend/` directory, create a `.env` file based on `.env.example`, and fill in your credentials:
```bash
cd backend
cp .env.example .env
```
Inside `backend/.env`:
```ini
PORT=5000
MONGO_URI=mongodb://localhost:27017/internship_management_system
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:3000
NODE_ENV=development

# SMTP Configuration (for sending password reset and activation emails)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM=noreply@ruh.ac.lk
```

---

### Step 3: Run the Backend
From the `backend/` folder:
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server (runs nodemon for hot-reloading):
   ```bash
   npm run dev
   ```
*Note: On first startup, the backend automatically connects to MongoDB and seeds:*
- *Default Department Administrator account: **`department@ruh.ac.lk`** / **`Admin@12345`***
- *Standard Course Subjects database.*

---

### Step 4: Run the Frontend
Open a new terminal window, navigate to the `frontend/` directory:
1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start the Next.js development server:
   ```bash
   npm run dev
   ```
3. Open your browser and navigate to: `http://localhost:3000`

---

## 🔐 Credentials for Testing

- **Department Account** (Auto-seeded):
  - **Email**: `department@ruh.ac.lk`
  - **Password**: `Admin@12345`

- **Student Accounts**:
  - Register a new student under the Student Portal or use an approved test student credentials to experience the Record Book & GPA verification workflows.

---

## ✨ Features Breakdown

### 📘 Record Book Module
- Tracks 24 internship log weeks chronologically.
- Enforces strict validation rules:
  - Week number, reporting period, start/end dates, tasks completed, challenges, reflections, and skills gained are required before submission.
  - End Date must be greater than or equal to Start Date.
  - Start/End Dates must be within the active week range.
- Allows students to save entries as **Draft** and re-edit, or **Submit** for final approval.
- Once submitted or once the week timeline has passed, logs are locked and cannot be edited.
- Clean skills-gained input box supporting both free-text typing and tags.
- Direct PDF report compiling and downloading.

### 📊 GPA Calculator
- Automatically retrieves subject credit details from the database based on the subject code.
- Locks credit editing so students cannot manually modify credit values.
- Computes Semester and overall GPA using validated formulas.

### 👤 Portfolio & Placements
- Students upload details of their host organization, offer letter, and roles.
- Tracks stages: Applied ➜ Placed ➜ Approved.
- Displays rejection comments when the department requests revisions or rejects the placement.
