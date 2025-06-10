const {
  createUserAddress,
  deleteUserAddress,
  getUserAddress,
  setUserDefaultAddress
} = require("../../controllers/usersController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const express = require("express");

const router = express.Router();



router.post("/addresses", authenticateUser, createUserAddress);

router.delete("/addresses/:addressId", authenticateUser, deleteUserAddress);

router.get('/addresses', authenticateUser, getUserAddress);

router.patch('/addresses/:addressId', authenticateUser, setUserDefaultAddress);

module.exports = router;