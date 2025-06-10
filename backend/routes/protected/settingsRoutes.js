// routes/settingsRoutes.js
const express = require("express");
const multer = require("multer");
const {
  getSettings,
  updateSettings,
} = require("../../controllers/settingsController");

const router = express.Router();

const {
  authenticateUser,
  authorizeRoles,
} = require("../../middleware/authMiddleware");

router.use(authenticateUser, authorizeRoles("admin"));  
// Use memory storage so req.file.buffer is available for Cloudinary upload
const upload = multer({ storage: multer.memoryStorage() });

// GET current settings
router.get("/", getSettings);

// PATCH update settings (with optional "logo" file in memory)
router.patch("/", upload.single("logo"), updateSettings);

module.exports = router;
