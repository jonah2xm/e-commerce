// routes/promotionalPanelRoutes.js

const express = require("express");
const multer = require("multer");
const {
  getPromotionalPanel,
  updatePromotionalPanel,
} = require("../../controllers/promotionalPanelController");

const router = express.Router();

const {
  authenticateUser,
  authorizeRoles,
} = require("../../middleware/authMiddleware");

router.use(authenticateUser, authorizeRoles("admin"));

// Set up multer to store files in memory (so we can read req.file.buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// GET  /api/promotional-panel
//   → Returns the single panel (creates default if none exists)
router.get("/", getPromotionalPanel);

// PATCH /api/promotional-panel
//   → Update (or create) the panel. Accepts optional `imageFile` in form-data.
router.patch(
  "/",
  upload.single("imageFile"), // field name: "imageFile"
  updatePromotionalPanel
);

module.exports = router;
