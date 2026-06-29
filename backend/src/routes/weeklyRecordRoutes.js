const router = require("express").Router();
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");
const {
  listMyRecords,
  createRecord,
  updateRecord,
  requestUnlock,
  listStudentRecords,
  unlockRecord,
  generatePdfReport,
} = require("../controllers/weeklyRecordController");

router.get("/me", protect, authorizeRoles("student"), listMyRecords);
router.post("/", protect, authorizeRoles("student"), createRecord);
router.put("/:id", protect, authorizeRoles("student"), updateRecord);
router.post("/:id/request-unlock", protect, authorizeRoles("student"), requestUnlock);
router.post("/report", protect, authorizeRoles("student"), generatePdfReport);

// Department endpoints
router.get("/student/:studentId", protect, authorizeRoles("department", "admin"), listStudentRecords);
router.post("/:id/unlock", protect, authorizeRoles("department", "admin"), unlockRecord);

module.exports = router;
