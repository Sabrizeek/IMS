const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const User = require("./models/User");
const StudentProfile = require("./models/StudentProfile");
const InternshipApplication = require("./models/InternshipApplication");
const StudentCGPA = require("./models/StudentCGPA");

async function seed100() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const companies = [
      "WSO2", "IFS", "Sysco", "Dialog", "Virtusa", "99x", 
      "LSEG", "Creative Software", "Mitra Innovation", "Surge Global"
    ];
    const specializations = [
      "Computer Science",
      "Software Engineering",
      "Information Systems"
    ];

    const passwordHash = await bcrypt.hash("Student@123", 10);

    let createdCount = 0;
    for (let i = 1; i <= 100; i++) {
      const studentId = `SC/2021/${(9000 + i).toString().padStart(4, '0')}`;
      const email = `student${9000 + i}@ruh.ac.lk`;
      
      const user = await User.findOneAndUpdate(
        { email },
        {
          firstName: `DummyFirst${i}`,
          lastName: `DummyLast${i}`,
          email,
          password: passwordHash,
          role: "student",
          studentId,
          isVerified: true
        },
        { upsert: true, new: true }
      );

      const specialization = specializations[i % specializations.length];
      
      await StudentProfile.findOneAndUpdate(
        { user: user._id },
        {
          name: `DummyFirst${i} DummyLast${i}`,
          studentId,
          email,
          specialization,
          specializationConfirmed: true,
          cvFileName: "dummy_cv.pdf",
          cvMimeType: "application/pdf",
          cvDataUrl: "data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPQM1Qo5ypUMFAwALJMLY31jBQsTAz1LBSKUrnCuQC1eQW3CmVuZHN0cmVhbQplbmRvYmoKCjMgMCBvYmoKMzEKZW5kb2JqCgo0IDAgb2JqCjw8L1R5cGUvUGFnZS9NZWRpYUJveFswIDAgNTk1LjI3NiA4NDEuODldL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSAxIDAgUj4+Pj4vQ29udGVudHMgMiAwIFIvUGFyZW50IDUgMCBSPj4KZW5kb2JqCgoxIDAgb2JqCjw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL0Jhc2VGb250L0hlbHZldGljYT4+CmVuZG9iagoKNSAwIG9iago8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1s0IDAgUl0+PgplbmRvYmoKCjYgMCBvYmoKPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDUgMCBSPj4KZW5kb2JqCgplbmRvYmoKeHJlZgowIDcKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMjQyIDAwMDAwIG4gCjAwMDAwMDAwMTkgMDAwMDAgbiAKMDAwMDAwMDA5MCAwMDAwMCBuIAowMDAwMDAwMTEyIDAwMDAwIG4gCjAwMDAwMDAzMzAgMDAwMDAgbiAKMDAwMDAwMDM4NyAwMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgNy9Sb290IDYgMCBSPj4Kc3RhcnR4cmVmCjQzNgolJUVPRgo="
        },
        { upsert: true }
      );

      const internTypes = [
        "Software Engineering Intern",
        "QA Intern",
        "Data Science Intern",
        "DevOps Intern",
        "UI/UX Intern",
        "Business Analyst Intern"
      ];
      const jobPosition = internTypes[Math.floor(Math.random() * internTypes.length)];
      
      const company = companies[Math.floor(Math.random() * companies.length)];
      await InternshipApplication.findOneAndUpdate(
        { user: user._id },
        {
          state: "selected",
          companyName: company,
          jobPosition: jobPosition,
          internshipStartDate: new Date("2026-08-01"),
          approved: true,
          submittedAt: new Date()
        },
        { upsert: true }
      );

      await StudentCGPA.findOneAndUpdate(
        { registrationNo: studentId.toUpperCase() },
        {
          cgpa: (Math.random() * (4.0 - 2.5) + 2.5).toFixed(2),
          calculatedAt: new Date()
        },
        { upsert: true }
      );

      createdCount++;
    }
    console.log(`Seeded ${createdCount} students with placements.`);
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

seed100();
