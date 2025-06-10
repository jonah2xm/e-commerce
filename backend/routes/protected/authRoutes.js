const {
  registerUser,
  loginUser,
  logoutUser,
  getProfile,
  handleForgotPassword,
  resetPassword,
  changePassword,
} = require("../../controllers/usersController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const express = require("express");

const router = express.Router();

// @route   POST /api/auth/register
router.post("/register", registerUser);

// @route   POST /api/auth/login
router.post("/login", loginUser);

// @route   POST /api/auth/logout
router.post("/logout", logoutUser);
// @route POST /api/auth/forgot-password
router.post("/verify-email", handleForgotPassword);

router.post("/reset-password", resetPassword);

// @route   GET /api/auth/profile
router.get("/profile", authenticateUser, getProfile);

router.patch("/change-password", authenticateUser, changePassword);
module.exports = router;
