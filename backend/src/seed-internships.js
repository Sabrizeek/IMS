const mongoose = require("mongoose");
require("dotenv").config({ path: "../.env" });
const User = require("./models/User");
const StudentProfile = require("./models/StudentProfile");
const InternshipApplication = require("./models/InternshipApplication");

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const companies = ["WSO2", "IFS", "Sysco", "Dialog", "Virtusa", "99x"];

    // Find all student users
    const students = await User.find({ role: "student" }).limit(10);
    
    let count = 0;
    for (const student of students) {
      // 1. Add CV to their profile
      await StudentProfile.findOneAndUpdate(
        { user: student._id },
        {
          cvFileName: "dummy_cv.pdf",
          cvMimeType: "application/pdf",
          cvDataUrl: "data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPQM1Qo5ypUMFAwALJMLY31jBQsTAz1LBSKUrnCuQC1eQW3CmVuZHN0cmVhbQplbmRvYmoKCjMgMCBvYmoKMzEKZW5kb2JqCgo0IDAgb2JqCjw8L1R5cGUvUGFnZS9NZWRpYUJveFswIDAgNTk1LjI3NiA4NDEuODldL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSAxIDAgUj4+Pj4vQ29udGVudHMgMiAwIFIvUGFyZW50IDUgMCBSPj4KZW5kb2JqCgoxIDAgb2JqCjw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL0Jhc2VGb250L0hlbHZldGljYT4+CmVuZG9iagoKNSAwIG9iago8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1s0IDAgUl0+PgplbmRvYmoKCjYgMCBvYmoKPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDUgMCBSPj4KZW5kb2JqCgplbmRvYmoKeHJlZgowIDcKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMjQyIDAwMDAwIG4gCjAwMDAwMDAwMTkgMDAwMDAgbiAKMDAwMDAwMDA5MCAwMDAwMCBuIAowMDAwMDAwMTEyIDAwMDAwIG4gCjAwMDAwMDAzMzAgMDAwMDAgbiAKMDAwMDAwMDM4NyAwMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgNy9Sb290IDYgMCBSPj4Kc3RhcnR4cmVmCjQzNgolJUVPRgo="
        },
        { upsert: true }
      );

      // 2. Add an accepted internship
      const company = companies[count % companies.length];
      await InternshipApplication.findOneAndUpdate(
        { user: student._id },
        {
          state: "selected",
          companyName: company,
          jobPosition: "Software Engineering Intern",
          internshipStartDate: new Date("2026-08-01"),
          approved: true,
          submittedAt: new Date()
        },
        { upsert: true }
      );
      
      console.log(`Seeded for ${student.email} at ${company}`);
      count++;
    }
    console.log("Seeding complete!");
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

seed();
