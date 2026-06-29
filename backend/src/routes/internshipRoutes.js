const router = require("express").Router();
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");
const { listMine, createMine, updateMine, deleteMine, listAll, review } = require("../controllers/internshipController");

router.get("/me", protect, authorizeRoles("student"), listMine);
router.post("/", protect, authorizeRoles("student"), createMine);
router.put("/:id", protect, authorizeRoles("student"), updateMine);
router.delete("/:id", protect, authorizeRoles("student"), deleteMine);
router.get("/", protect, authorizeRoles("department", "admin"), listAll);
router.patch("/:id/review", protect, authorizeRoles("department", "admin"), review);

module.exports = router;
