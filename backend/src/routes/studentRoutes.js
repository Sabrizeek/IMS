const router = require("express").Router();
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");
const { listStudents, getStudentById, getDashboardStats } = require("../controllers/studentController");

router.get("/", protect, authorizeRoles("department", "admin"), listStudents);
router.get("/dashboard-stats/count", protect, authorizeRoles("department", "admin"), getDashboardStats);
router.get("/:id", protect, authorizeRoles("department", "admin"), getStudentById);

module.exports = router;
