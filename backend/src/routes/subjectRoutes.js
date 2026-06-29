const router = require("express").Router();
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");
const { listSubjects, createSubject } = require("../controllers/subjectController");

router.get("/", protect, listSubjects);
router.post("/", protect, authorizeRoles("department", "admin"), createSubject);

module.exports = router;
