const AccountRequest = require("../models/AccountRequest");
const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const StudentGrade = require("../models/StudentGrade");
const Log = require("../models/Log");
const { hashPassword } = require("../utils/password");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

function generateTempPassword() {
  const randomHex = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `RUH-${randomHex}`;
}

async function createRequest(req, res) {
  try {
    const { firstName, lastName, studentId, email } = req.body;
    if (!firstName || !studentId || !email) {
      return res.status(400).json({ message: "First name, student ID, and email are required" });
    }

    const emailLower = email.toLowerCase().trim();
    const idTrimmed = studentId.trim();

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: emailLower },
        { studentId: idTrimmed }
      ]
    });
    if (existingUser) {
      return res.status(409).json({ message: "An active user with this email or student ID already exists." });
    }

    // Check if request already exists and is pending or approved
    const existingRequest = await AccountRequest.findOne({
      $or: [
        { email: emailLower },
        { studentId: idTrimmed }
      ],
      status: { $in: ["pending", "approved"] }
    });
    if (existingRequest) {
      return res.status(409).json({ message: "A registration request for this student is already pending or approved." });
    }

    const record = await AccountRequest.create({
      firstName: firstName.trim(),
      lastName: lastName ? lastName.trim() : "",
      studentId: idTrimmed,
      email: emailLower,
      status: "pending"
    });

    res.status(201).json({ request: record });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function listRequests(req, res) {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const requests = await AccountRequest.find(filter).sort({ createdAt: -1 });
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function updateRequest(req, res) {
  try {
    const { status, notes } = req.body;
    const request = await AccountRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Registration request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request has already been processed" });
    }

    if (status === "approved") {
      // Check if user already exists again to prevent race conditions
      const existingUser = await User.findOne({
        $or: [
          { email: request.email },
          { studentId: request.studentId }
        ]
      });
      if (existingUser) {
        request.status = "rejected";
        request.notes = "System automatically rejected: Account details are already registered.";
        await request.save();
        return res.status(409).json({ message: "User account already exists" });
      }

      const tempPassword = generateTempPassword();
      const hashedPassword = await hashPassword(tempPassword);

      // Create student user
      const user = await User.create({
        role: "student",
        firstName: request.firstName,
        lastName: request.lastName,
        studentId: request.studentId,
        email: request.email,
        password: hashedPassword,
        mustResetPassword: true,
      });

      // Create profiles
      await StudentProfile.create({
        user: user._id,
        name: `${request.firstName} ${request.lastName ?? ""}`.trim(),
        studentId: request.studentId,
        email: request.email,
      });

      await StudentGrade.create({
        user: user._id,
        semesters: []
      });

      // Update request status
      request.status = "approved";
      request.tempPassword = tempPassword;
      if (notes) request.notes = notes;
      await request.save();

      // Send actual activation email
      try {
        let transporter;
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
          transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_PORT == 465,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          });
        } else {
          // Fallback to Ethereal test account for development environments
          const testAccount = await nodemailer.createTestAccount();
          transporter = nodemailer.createTransport({
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
          });
        }

        const loginUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/student/login?email=${encodeURIComponent(request.email)}`;

        const info = await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@ims.example",
          to: request.email,
          subject: "Your IMS Account is Approved!",
          html: `
            <h2>Account Approved</h2>
            <p>Dear ${request.firstName},</p>
            <p>Your account request has been approved by the department.</p>
            <p>You can log in to your account using the credentials below:</p>
            <ul>
              <li><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></li>
              <li><strong>University Email:</strong> ${request.email}</li>
              <li><strong>Temporary Password:</strong> ${tempPassword}</li>
            </ul>
            <p>You will be prompted to set a permanent password upon your first login.</p>
          `,
        });

        // Log preview URL when using test account
        if (info && info.messageId && !process.env.SMTP_HOST) {
          console.log('Preview URL: ' + nodemailer.getTestMessageUrl(info));
        }
      } catch (mailError) {
        console.error("Failed to send activation email:", mailError);
        // Log the error but continue without failing the approval process
      }

      // Write Audit Log
      await Log.create({
        userId: req.user._id,
        action: "Registration Approval",
        studentId: request.studentId,
      });

      return res.json({ request });
    } else if (status === "rejected") {
      request.status = "rejected";
      request.notes = notes || "Rejected by department.";
      await request.save();

      // Write Audit Log
      await Log.create({
        userId: req.user._id,
        action: "Registration Rejection",
        studentId: request.studentId,
      });

      return res.json({ request });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function checkStatus(req, res) {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const request = await AccountRequest.findOne({ email: email.toLowerCase().trim() });
    if (!request) {
      return res.status(404).json({ message: "No registration request found for this email" });
    }

    res.json({
      status: request.status,
      tempPassword: request.status === "approved" ? request.tempPassword : null,
      notes: request.status === "rejected" ? request.notes : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function deleteRequest(req, res) {
  try {
    const request = await AccountRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Registration request not found" });
    }

    // If the account was approved, delete the associated User, Profile, and Grade records
    // to completely free up the email and student ID for re-registration.
    if (request.status === "approved") {
      const user = await User.findOne({ email: request.email });
      if (user) {
        await StudentProfile.deleteOne({ user: user._id });
        await StudentGrade.deleteOne({ user: user._id });
        await User.deleteOne({ _id: user._id });
      }
    }

    await AccountRequest.deleteOne({ _id: request._id });

    // Write Audit Log
    await Log.create({
      userId: req.user._id,
      action: "Registration Deletion",
      studentId: request.studentId,
    });

    res.json({ message: "Request and associated account data completely deleted." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = { createRequest, listRequests, updateRequest, checkStatus, deleteRequest };
