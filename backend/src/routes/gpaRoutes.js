const router = require("express").Router();
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");
const { getMyGrades, saveMyGrades } = require("../controllers/gpaController");

router.get("/me", protect, authorizeRoles("student"), getMyGrades);
router.put("/me", protect, authorizeRoles("student"), saveMyGrades);

module.exports = router;
