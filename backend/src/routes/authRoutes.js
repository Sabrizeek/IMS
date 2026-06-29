const router = require("express").Router();
const {
  registerStudent,
  registerDepartment,
  login,
  me,
  changePassword,
  activatePassword,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

router.post("/register/student", registerStudent);
router.post("/register/department", protect, authorizeRoles("admin"), registerDepartment);
router.post("/login", login);
router.get("/me", protect, me);
router.post("/change-password", protect, changePassword);
router.post("/activate-password", protect, activatePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
