const router = require("express").Router();
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");
const {
  listGpaSubjects,
  createGpaSubject,
  updateGpaSubject,
  deleteGpaSubject,
} = require("../controllers/gpaSubjectController");

const guard = [protect, authorizeRoles("department", "admin")];

router.get("/",       guard, listGpaSubjects);
router.post("/",      guard, createGpaSubject);
router.put("/:id",    guard, updateGpaSubject);
router.delete("/:id", guard, deleteGpaSubject);

module.exports = router;
