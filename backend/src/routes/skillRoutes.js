const express = require("express");
const router = express.Router();
const skillController = require("../controllers/skillController");
const { protect } = require("../middlewares/authMiddleware");

// Both students and department members can fetch skills
router.get("/", protect, skillController.getSkills);

module.exports = router;
