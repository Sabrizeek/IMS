const router = require("express").Router();
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");
const {
  listAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
} = require("../controllers/academicYearController");

const guard = [protect, authorizeRoles("department", "admin")];

router.get("/",       guard, listAcademicYears);
router.post("/",      guard, createAcademicYear);
router.put("/:id",    guard, updateAcademicYear);
router.delete("/:id", guard, deleteAcademicYear);

module.exports = router;
