// controllers/userWishlistController.js

const User = require("../models/usersModel");
const Product = require("../models/productModel");

exports.addWishlist = async (req, res) => {
  console.log("addWishlist called with body:", req.user);
  try {
    const userId = req.user.userId; 
    // assumes `protect` middleware sets req.user
    const { productId } = req.body; // destructure productId from body

    if (!productId) {
      return res
        .status(400)
        .json({ message: "productId is required in request body." });
    }

    // Use $addToSet so that the same productId isn't duplicated
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { wishlist: productId } }, // productId should be a string/ObjectId
      { new: true }
    )
      .populate({
        path: "wishlist",
        select: "name price images", // adjust fields as needed
      })
      .exec();

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      message: "Product added to wishlist.",
      wishlist: updatedUser.wishlist,
    });
  } catch (err) {
    console.error("Error in addWishlist:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

/**
 * @route   DELETE  /api/users/wishlist/:productId
 * @desc    Remove a product from the current user's wishlist
 * @access  Private
 */
exports.deleteWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;

    if (!productId) {
      return res
        .status(400)
        .json({ message: "productId is required in URL params." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { wishlist: productId } },
      { new: true }
    )
      .populate({
        path: "wishlist",
        select: "name price images", // adjust fields as needed
      })
      .exec();

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      message: "Product removed from wishlist.",
      wishlist: updatedUser.wishlist,
    });
  } catch (err) {
    console.error("Error in deleteWishlist:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

exports.getWishlist = async (req, res) => {
  console.log("getWishlist called with user:", req.user);
  try {
    const userId = req.user.userId; // assumes `protect` middleware sets req.user

    const user = await User.findById(userId).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Fetch full Product documents for all IDs in user.wishlist
    const products = await Product.find({ _id: { $in: user.wishlist } })
      .select("name price images description")
      .exec();

    return res.status(200).json({
      wishlist: products,
    });
  } catch (err) {
    console.error("Error in getWishlist:", err);
    return res.status(500).json({ message: "Server error." });
  }
};