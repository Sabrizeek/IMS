const router = require("express").Router();
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");
const {
  listSemesters,
  createSemester,
  updateSemester,
  deleteSemester,
} = require("../controllers/semesterController");

const guard = [protect, authorizeRoles("department", "admin")];

router.get("/",       guard, listSemesters);
router.post("/",      guard, createSemester);
router.put("/:id",    guard, updateSemester);
router.delete("/:id", guard, deleteSemester);

module.exports = router;
