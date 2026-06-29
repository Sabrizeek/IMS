const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");
const { listFiles, addFile, removeFile } = require("../controllers/portfolioController");

const uploadDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

router.get("/me", protect, authorizeRoles("student"), listFiles);
router.post("/me", protect, authorizeRoles("student"), upload.single("file"), addFile);
router.delete("/me/:fileId", protect, authorizeRoles("student"), removeFile);

module.exports = router;
