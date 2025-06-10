const express = require("express");
const multer = require("multer");
const {
  getCategories,
  createCategory,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getParentCategories,
} = require("../../controllers/categoryController");
const {authenticateUser,authorizeRoles} =require('../../middleware/authMiddleware')
const router = express.Router();

// Setup Multer with memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });
router.get("/", getCategories);
router.get('/parentCategories/',getParentCategories)
router.post("/", upload.single("image"), createCategory);
router.get("/:id", getCategoryById);
router.put("/:id", upload.single("image"), updateCategory);
router.delete("/:id", deleteCategory);

module.exports = router;
