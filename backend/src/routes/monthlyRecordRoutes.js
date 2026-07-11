const router = require("express").Router();
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");
const {
  listMyRecords,
  createRecord,
  updateRecord,
  listStudentRecords,
} = require("../controllers/monthlyRecordController");

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

router.get("/me", protect, authorizeRoles("student"), listMyRecords);
router.post("/", protect, authorizeRoles("student"), upload.single("file"), createRecord);
router.put("/:id", protect, authorizeRoles("student"), upload.single("file"), updateRecord);

// Department endpoints
router.get("/student/:studentId", protect, authorizeRoles("department", "admin"), listStudentRecords);

module.exports = router;
