const router = require("express").Router();
const { protect } = require("../middlewares/authMiddleware");
const { getMe, upsertMe, getDepartmentProfile, updateDepartmentProfile } = require("../controllers/profileController");

router.get("/me", protect, getMe);
router.put("/me", protect, upsertMe);
router.get("/department", protect, getDepartmentProfile);
router.put("/department", protect, updateDepartmentProfile);

module.exports = router;
