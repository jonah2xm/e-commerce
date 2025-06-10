// routes/userWishlistRoutes.js

const express = require("express");
const router = express.Router();
const {
  addWishlist,
  deleteWishlist,
  getWishlist,
} = require("../../controllers/wishlistController");
const { authenticateUser } = require("../../middleware/authMiddleware");

router.get("/", authenticateUser, getWishlist);
router.post("/", authenticateUser, addWishlist);
router.delete("/:productId", authenticateUser, deleteWishlist);

module.exports = router;
