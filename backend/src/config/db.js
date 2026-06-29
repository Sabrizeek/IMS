const mongoose = require("mongoose");
const User = require("../models/User");
const Subject = require("../models/Subject");
const { hashPassword } = require("../utils/password");

async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/internship_management_system";
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log("MongoDB connected");

  // Seed default department user if none exists
  try {
    const existingDept = await User.findOne({ email: "department@ruh.ac.lk" });
    if (!existingDept) {
      console.log("Seeding default department account...");
      const hashedPassword = await hashPassword("Admin@12345");
      await User.create({
        role: "department",
        email: "department@ruh.ac.lk",
        password: hashedPassword,
        departmentProfile: {
          fullName: "Department Administrator",
          universityId: "DEPT-ADMIN-01",
          designation: "Head of Department",
          academicTitle: "Professor",
          contactNumber: "+94 41 222 2624",
          email: "department@ruh.ac.lk",
        }
      });
      console.log("Default department account seeded successfully (department@ruh.ac.lk / Admin@12345)");
    }
  } catch (error) {
    console.error("Error seeding default department user:", error);
  }

  // Seed default subjects if none exist
  try {
    const existingSubjectsCount = await Subject.countDocuments();
    if (existingSubjectsCount === 0) {
      console.log("Seeding default subjects database...");
      const defaultSubjects = [
        { code: "CS111", name: "Introduction to Computer Science", credits: 3, semester: "Semester I" },
        { code: "CS112", name: "Programming Methodology", credits: 3, semester: "Semester I" },
        { code: "CS121", name: "Data Structures and Algorithms", credits: 4, semester: "Semester II" },
        { code: "CS122", name: "Database Management Systems", credits: 3, semester: "Semester II" },
        { code: "SE211", name: "Software Requirements Engineering", credits: 3, semester: "Semester III" },
        { code: "SE212", name: "Software Architecture and Design", credits: 3, semester: "Semester III" },
        { code: "MAT121D", name: "Mathematics for Computing (Delta)", credits: 3, semester: "Semester I" },
        { code: "MAT121B", name: "Mathematics for Computing (Beta)", credits: 3, semester: "Semester I" },
      ];
      await Subject.insertMany(defaultSubjects);
      console.log("Default subjects seeded successfully");
    }
  } catch (error) {
    console.error("Error seeding default subjects:", error);
  }
}

module.exports = { connectDB };
