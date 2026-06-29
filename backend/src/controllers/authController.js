const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const nodemailer = require("nodemailer");
const StudentGrade = require("../models/StudentGrade");
const { hashPassword, comparePassword, isStrongPassword } = require("../utils/password");
const { signToken } = require("../utils/jwt");
const jwt = require("jsonwebtoken");

function sanitizeUser(user) {
  return {
    id: user._id,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    studentId: user.studentId,
    email: user.email,
    mustResetPassword: user.mustResetPassword,
  };
}

async function registerStudent(req, res) {
  const { firstName, lastName, studentId, email } = req.body;
  if (!firstName || !studentId || !email) return res.status(400).json({ message: "Missing required fields" });

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ message: "Account already exists" });

  const tempPassword = `RUH-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const user = await User.create({
    role: "student",
    firstName,
    lastName,
    studentId,
    email,
    password: await hashPassword(tempPassword),
    mustResetPassword: true,
  });

  await StudentProfile.create({
    user: user._id,
    name: `${firstName} ${lastName ?? ""}`.trim(),
    studentId,
    email,
  });
  await StudentGrade.create({ user: user._id, semesters: [] });

  res.status(201).json({ message: "Student registered", tempPassword, user: sanitizeUser(user) });
}

async function registerDepartment(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password are required" });
  if (!isStrongPassword(password)) return res.status(400).json({ message: "Password is not strong enough" });

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ message: "Account already exists" });

  const user = await User.create({
    role: "department",
    email,
    password: await hashPassword(password),
    departmentProfile: { email },
  });

  res.status(201).json({ message: "Department account created", user: sanitizeUser(user) });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await comparePassword(password, user.password);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = signToken({ id: user._id, role: user.role });
  res.json({ token, user: sanitizeUser(user) });
}

async function me(req, res) {
  res.json({ user: sanitizeUser(req.user) });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ message: "Missing password fields" });
  if (!isStrongPassword(newPassword)) return res.status(400).json({ message: "Password is not strong enough" });

  const user = await User.findById(req.user._id).select("+password");
  const ok = await comparePassword(currentPassword, user.password);
  if (!ok) return res.status(401).json({ message: "Current password is incorrect" });

  user.password = await hashPassword(newPassword);
  user.mustResetPassword = false;
  await user.save();
  res.json({ message: "Password updated" });
}

async function activatePassword(req, res) {
  const { newPassword } = req.body;
  if (!isStrongPassword(newPassword)) return res.status(400).json({ message: "Password is not strong enough" });
  const user = await User.findById(req.user._id).select("+password");
  if (!user.mustResetPassword) return res.status(400).json({ message: "Account is already active" });
  user.password = await hashPassword(newPassword);
  user.mustResetPassword = false;
  await user.save();
  res.json({ message: "Account activated", user: sanitizeUser(user) });
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    const resetToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || "fallbacksecret",
      { expiresIn: "15m" }
    );

    const resetUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/student/set-password?email=${encodeURIComponent(user.email)}&token=${resetToken}`;

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_PORT == 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: user.email,
        subject: "Password Reset Request - IMS",
        text: `Please click the link below to reset your password:\n\n${resetUrl}`,
        html: `<p>Please click the link below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      });
      console.log(`Password reset email sent to ${user.email}`);
    } catch (mailError) {
      console.error("Failed to send email:", mailError);
      return res.status(500).json({ message: "Failed to send reset email. Please try again later." });
    }

    res.json({ message: "Password reset email sent successfully", token: resetToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function resetPassword(req, res) {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: "Missing email, token or password" });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ message: "Password is not strong enough" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "fallbacksecret");
    } catch {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    if (decoded.email.toLowerCase() !== email.toLowerCase().trim()) {
      return res.status(400).json({ message: "Email mismatch" });
    }

    const user = await User.findById(decoded.id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = await hashPassword(newPassword);
    user.mustResetPassword = false;
    await user.save();

    const tokenToReturn = signToken({ id: user._id, role: user.role });

    res.json({ 
      message: "Password reset successful", 
      user: sanitizeUser(user), 
      token: tokenToReturn 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = {
  registerStudent,
  registerDepartment,
  login,
  me,
  changePassword,
  activatePassword,
  forgotPassword,
  resetPassword,
};
