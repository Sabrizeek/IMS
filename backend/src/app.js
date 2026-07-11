const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { notFound, errorHandler } = require("./middlewares/errorMiddleware");
const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const profileRoutes = require("./routes/profileRoutes");
const gpaRoutes = require("./routes/gpaRoutes");
const portfolioRoutes = require("./routes/portfolioRoutes");
const weeklyRecordRoutes = require("./routes/weeklyRecordRoutes");
const monthlyRecordRoutes = require("./routes/monthlyRecordRoutes");
const accountRequestRoutes = require("./routes/accountRequestRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const internshipRoutes = require("./routes/internshipRoutes");
const skillRoutes = require("./routes/skillRoutes");
const academicYearRoutes = require("./routes/academicYearRoutes");
const semesterRoutes = require("./routes/semesterRoutes");
const gpaSubjectRoutes = require("./routes/gpaSubjectRoutes");
const resultsRoutes = require("./routes/resultsRoutes");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use("/templates", express.static(path.join(__dirname, "..", "public", "templates")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "ims-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/gpa", gpaRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/weekly-records", weeklyRecordRoutes);
app.use("/api/monthly-records", monthlyRecordRoutes);
app.use("/api/account-requests", accountRequestRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/internships", internshipRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/academic-years", academicYearRoutes);
app.use("/api/semesters", semesterRoutes);
app.use("/api/gpa-subjects", gpaSubjectRoutes);
app.use("/api/results", resultsRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
