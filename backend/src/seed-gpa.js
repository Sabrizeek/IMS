require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Models
const User = require("./models/User");
const StudentProfile = require("./models/StudentProfile");
const AcademicYear = require("./models/AcademicYear");
const Semester = require("./models/Semester");
const GpaSubject = require("./models/GpaSubject");
const ResultUpload = require("./models/ResultUpload");
const StudentResult = require("./models/StudentResult");
const StudentSemesterGPA = require("./models/StudentSemesterGPA");
const StudentCGPA = require("./models/StudentCGPA");

// Utils
const { calculateSemesterGPA } = require("./utils/gpaCalculator");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ims";

async function runSeeder() {
  try {
    console.log("=========================================");
    console.log("🚀 Starting GPA Management Seeder Script");
    console.log("=========================================");

    await mongoose.connect(MONGO_URI);
    console.log(`✅ Connected to MongoDB at ${MONGO_URI}`);

    // ────────────────────────────────────────────────────────────────────────
    // 1. SAFE CLEANUP
    console.log("\n🧹 STEP 1: Safe Cleanup of Test Data");
    await AcademicYear.deleteMany({});
    await Semester.deleteMany({});
    await GpaSubject.deleteMany({});
    await ResultUpload.deleteMany({});
    await StudentResult.deleteMany({});
    await StudentSemesterGPA.deleteMany({});
    await StudentCGPA.deleteMany({});
    console.log("  ↳ Emptied AcademicYear, Semester, GpaSubject, ResultUpload, StudentResult, StudentSemesterGPA, StudentCGPA");

    // ────────────────────────────────────────────────────────────────────────
    // 2. CREATE SPECIFIC STUDENTS
    console.log("\n👤 STEP 2: Upserting Specific & Dummy Students");
    
    const hashedPassword = await bcrypt.hash("password123", 10);
    
    // Mark Mark
    const mark = await User.findOneAndUpdate(
      { email: "sabricolombo17@gmail.com" },
      { 
        role: "student", 
        firstName: "Mark", 
        lastName: "Mark", 
        studentId: "SC/2020/6666", 
        password: hashedPassword 
      },
      { upsert: true, new: true }
    );
    await StudentProfile.findOneAndUpdate(
      { user: mark._id },
      { name: "Mark Mark", studentId: "SC/2020/6666", email: "sabricolombo17@gmail.com", specialization: "Software Engineering" },
      { upsert: true, new: true }
    );

    // Den Den
    const den = await User.findOneAndUpdate(
      { email: "denuri17@gmail.com" },
      { 
        role: "student", 
        firstName: "Den", 
        lastName: "Den", 
        studentId: "SC/2020/741", 
        password: hashedPassword 
      },
      { upsert: true, new: true }
    );
    await StudentProfile.findOneAndUpdate(
      { user: den._id },
      { name: "Den Den", studentId: "SC/2020/741", email: "denuri17@gmail.com", specialization: "Computer Science" },
      { upsert: true, new: true }
    );

    console.log("  ↳ Upserted: Mark Mark (SC/2020/6666) & Den Den (SC/2020/741)");

    // Dummies
    const dummies = [];
    for (let i = 1; i <= 8; i++) {
      const dEmail = `dummy${i}@test.com`;
      const dId = `SC/2020/000${i}`;
      const dUser = await User.findOneAndUpdate(
        { email: dEmail },
        { role: "student", firstName: "Dummy", lastName: `Student${i}`, studentId: dId, password: hashedPassword },
        { upsert: true, new: true }
      );
      await StudentProfile.findOneAndUpdate(
        { user: dUser._id },
        { name: `Dummy Student${i}`, studentId: dId, email: dEmail },
        { upsert: true }
      );
      dummies.push(dId);
    }
    console.log(`  ↳ Generated 8 additional dummy students`);

    // Department Uploader
    const dept = await User.findOneAndUpdate(
      { email: "dept_gpa@test.com" },
      { role: "department", firstName: "GPA", lastName: "Admin", password: hashedPassword },
      { upsert: true, new: true }
    );

    const allStudents = ["SC/2020/6666", "SC/2020/741", ...dummies];

    // ────────────────────────────────────────────────────────────────────────
    // 3. CREATE ACADEMIC STRUCTURE
    console.log("\n🏫 STEP 3: Creating Academic Structure");
    const year1 = await AcademicYear.create({ year: "2023/2024", isLocked: true });
    const year2 = await AcademicYear.create({ year: "2024/2025", isLocked: false });
    console.log(`  ↳ Created Academic Years: ${year1.year} (Locked) & ${year2.year} (Unlocked)`);

    const sem1 = await Semester.create({ academicYearId: year1._id, semesterNumber: 1, label: "Semester 1", isLocked: true });
    const sem2 = await Semester.create({ academicYearId: year1._id, semesterNumber: 2, label: "Semester 2", isLocked: false });
    const sem3 = await Semester.create({ academicYearId: year2._id, semesterNumber: 3, label: "Semester 3", isLocked: false });
    console.log(`  ↳ Created Semesters for 2023/2024: ${sem1.label} (Locked), ${sem2.label} (Unlocked)`);
    console.log(`  ↳ Created Semesters for 2024/2025: ${sem3.label} (Unlocked)`);

    // ────────────────────────────────────────────────────────────────────────
    // 4. CREATE SUBJECTS
    console.log("\n📚 STEP 4: Creating Subjects");
    const sem1Subjects = [
      { semesterId: sem1._id, subjectCode: "CSC1111", subjectName: "Programming 1", credits: 4, subjectType: "Core" },
      { semesterId: sem1._id, subjectCode: "CSC1122", subjectName: "Math 1", credits: 3, subjectType: "Core" },
      { semesterId: sem1._id, subjectCode: "CSC1133", subjectName: "Hardware", credits: 2, subjectType: "Core" },
      { semesterId: sem1._id, subjectCode: "CS301", subjectName: "Algorithms", credits: 3, subjectType: "Optional" },
      { semesterId: sem1._id, subjectCode: "CS302", subjectName: "Networking", credits: 2, subjectType: "Optional" }
    ];
    await GpaSubject.insertMany(sem1Subjects);

    const sem2Subjects = [
      { semesterId: sem2._id, subjectCode: "CSC1211", subjectName: "Programming 2", credits: 4, subjectType: "Core" },
      { semesterId: sem2._id, subjectCode: "CSC1222", subjectName: "Math 2", credits: 3, subjectType: "Core" },
      { semesterId: sem2._id, subjectCode: "CSC1233", subjectName: "Databases", credits: 2, subjectType: "Core" },
      { semesterId: sem2._id, subjectCode: "CS401", subjectName: "OS", credits: 3, subjectType: "Optional" },
      { semesterId: sem2._id, subjectCode: "CS402", subjectName: "AI", credits: 2, subjectType: "Optional" }
    ];
    await GpaSubject.insertMany(sem2Subjects);

    const sem3Subjects = [
      { semesterId: sem3._id, subjectCode: "CSC2111", subjectName: "Data Structures", credits: 4, subjectType: "Core" },
      { semesterId: sem3._id, subjectCode: "CSC2122", subjectName: "Statistics", credits: 3, subjectType: "Core" },
      { semesterId: sem3._id, subjectCode: "CSC2133", subjectName: "Web Dev", credits: 2, subjectType: "Core" },
      { semesterId: sem3._id, subjectCode: "CS501", subjectName: "Machine Learning", credits: 3, subjectType: "Optional" },
      { semesterId: sem3._id, subjectCode: "CS502", subjectName: "Security", credits: 2, subjectType: "Optional" }
    ];
    await GpaSubject.insertMany(sem3Subjects);
    console.log(`  ↳ Inserted 5 subjects each for ${sem1.label}, ${sem2.label}, and ${sem3.label}`);

    // Helper mapping for grade points
    const gradePoints = { "A+": 4.0, "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7, "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, "D": 1.0, "E": 0.0, "F": 0.0, "MC": 0.0 };
    const getGradePoint = (g) => gradePoints[g];

    // ────────────────────────────────────────────────────────────────────────
    // 5A. CREATE RESULT UPLOADS & GRADES (PUBLISHED - SEM 1)
    console.log("\n📈 STEP 5A: Simulating PUBLISHED results for Semester 1");
    
    const uploadSem1 = await ResultUpload.create({
      semesterId: sem1._id,
      fileName: "sem1_results_final.xlsx",
      filePath: "uploads/results/sem1_results_final.xlsx",
      uploadedBy: dept._id,
      recordCount: allStudents.length * sem1Subjects.length,
      isActive: true,
      isPublished: true,
      version: 1
    });

    const sem1Grades = [];
    allStudents.forEach(regNo => {
      sem1Subjects.forEach((sub, i) => {
        let grade = "B+"; // default
        if (regNo === "SC/2020/6666") {
          // Mark gets mixed grades
          const mg = ["A+", "A", "B", "C-", "F"];
          grade = mg[i];
        } else if (regNo === "SC/2020/741") {
          // Den gets an MC to verify UI
          if (sub.subjectCode === "CS301") grade = "MC";
          else grade = "A";
        } else {
          // Dummies get random
          const r = ["A-", "B", "C+", "C", "D+"];
          grade = r[Math.floor(Math.random() * r.length)];
        }

        sem1Grades.push({
          registrationNo: regNo,
          studentName: "Test Student",
          semesterId: sem1._id,
          subjectCode: sub.subjectCode,
          credits: sub.credits,
          grade: grade,
          gradePoint: getGradePoint(grade),
          isLatestAttempt: true,
          resultUploadId: uploadSem1._id
        });
      });
    });
    await StudentResult.insertMany(sem1Grades);
    console.log(`  ↳ Generated ${sem1Grades.length} StudentResult records for Semester 1 (includes Den's MC grade)`);

    // Calculate Semester GPA
    let sem1GpaUpserts = [];
    allStudents.forEach(regNo => {
      const studentRows = sem1Grades.filter(r => r.registrationNo === regNo);
      const { semesterGPA, totalCredits } = calculateSemesterGPA(studentRows);
      sem1GpaUpserts.push({
        updateOne: {
          filter: { registrationNo: regNo, semesterId: sem1._id },
          update: { $set: { semesterGPA, totalCredits, calculatedAt: new Date() } },
          upsert: true
        }
      });
    });
    await StudentSemesterGPA.bulkWrite(sem1GpaUpserts);
    console.log(`  ↳ Calculated & Upserted StudentSemesterGPA for all 10 students (Semester 1)`);

    // Calculate CGPA
    let cgpaUpserts = [];
    for (const regNo of allStudents) {
      const gpas = await StudentSemesterGPA.find({ registrationNo: regNo });
      let totalPts = 0;
      let totalCreds = 0;
      for (const g of gpas) {
        totalPts += g.semesterGPA * g.totalCredits;
        totalCreds += g.totalCredits;
      }
      const cgpa = totalCreds > 0 ? (totalPts / totalCreds) : 0;
      cgpaUpserts.push({
        updateOne: {
          filter: { registrationNo: regNo },
          update: { $set: { cgpa: parseFloat(cgpa.toFixed(4)), calculatedAt: new Date() } },
          upsert: true
        }
      });
    }
    await StudentCGPA.bulkWrite(cgpaUpserts);
    console.log(`  ↳ Calculated & Upserted StudentCGPA for all 10 students`);


    // ────────────────────────────────────────────────────────────────────────
    // 5B. CREATE RESULT UPLOADS & GRADES (UNPUBLISHED - SEM 2)
    console.log("\n📉 STEP 5B: Simulating UNPUBLISHED results for Semester 2");
    
    const uploadSem2 = await ResultUpload.create({
      semesterId: sem2._id,
      fileName: "sem2_results_draft.xlsx",
      filePath: "uploads/results/sem2_results_draft.xlsx",
      uploadedBy: dept._id,
      recordCount: allStudents.length * sem2Subjects.length,
      isActive: true,
      isPublished: false,
      version: 1
    });

    const sem2Grades = [];
    allStudents.forEach(regNo => {
      sem2Subjects.forEach(sub => {
        sem2Grades.push({
          registrationNo: regNo,
          studentName: "Test Student",
          semesterId: sem2._id,
          subjectCode: sub.subjectCode,
          credits: sub.credits,
          grade: "B",
          gradePoint: 3.0,
          isLatestAttempt: true,
          resultUploadId: uploadSem2._id
        });
      });
    });
    await StudentResult.insertMany(sem2Grades);
    console.log(`  ↳ Generated ${sem2Grades.length} StudentResult records for Semester 2 (Draft mode)`);
    console.log(`  ↳ Skipped GPA calculation to leave Semester 2 unpublished.`);

    console.log("\n=========================================");
    console.log("🎉 Seeding Completed Successfully!");
    console.log("=========================================");
    process.exit(0);

  } catch (err) {
    console.error("\n❌ SEEDING FAILED:", err);
    process.exit(1);
  }
}

runSeeder();
