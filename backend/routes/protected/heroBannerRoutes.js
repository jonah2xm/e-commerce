// routes/heroBannerRoutes.js
const express = require("express");
const multer = require("multer");
const {
  getHeroBanner,
  updateHeroBanner,
} = require("../../controllers/heroBannerController");
const {
  authenticateUser,
  authorizeRoles,
} = require("../../middleware/authMiddleware");
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateUser, authorizeRoles("admin"));
// Get or auto-create the banner
router.get("/", getHeroBanner);

// Update (or create if none) via multipart/form-data
router.patch("/", upload.single("image"), updateHeroBanner);

module.exports = router;
