// routes/userRoutes.js

const express = require("express");
const router = express.Router();
const { updateUser } = require("../../controllers/usersController");
const { authenticateUser } = require("../../middleware/authMiddleware");

// PUT /api/users/:id
router.patch("/:id", authenticateUser, updateUser);

module.exports = router;
