const router = require("express").Router();
const multer = require("multer");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");
const {
  getTemplate,
  uploadResults,
  publishResults,
  archiveResults,
  getHistory,
  getMyAcademicPerformance,
  getUploadData,
} = require("../controllers/resultsController");

// Store file in memory for processing (max 10 MB enforced in controller)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const deptGuard  = [protect, authorizeRoles("department", "admin")];
const studentGuard = [protect, authorizeRoles("student")];

// Academic-structure result operations (dept / admin)
router.get("/template",            deptGuard, getTemplate);
router.post("/upload",             deptGuard, upload.single("file"), uploadResults);
router.post("/publish/:uploadId",  deptGuard, publishResults);
router.post("/archive/:uploadId",  deptGuard, archiveResults);
router.get("/history",             deptGuard, getHistory);
router.get("/upload/:uploadId/data", deptGuard, getUploadData);

// Student-facing performance endpoint
router.get("/my-performance", studentGuard, getMyAcademicPerformance);

module.exports = router;
