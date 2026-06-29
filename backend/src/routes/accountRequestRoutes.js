const router = require("express").Router();
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");
const { createRequest, listRequests, updateRequest, checkStatus, deleteRequest } = require("../controllers/accountRequestController");

router.post("/", createRequest);
router.get("/status", checkStatus); // Public status check route
router.get("/", protect, authorizeRoles("department", "admin"), listRequests);
router.put("/:id", protect, authorizeRoles("department", "admin"), updateRequest);
router.delete("/:id", protect, authorizeRoles("department", "admin"), deleteRequest);

module.exports = router;
