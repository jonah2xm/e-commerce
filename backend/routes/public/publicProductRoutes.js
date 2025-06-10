// routes/productRoutes.js
const express = require("express");
const router = express.Router();
const {
  createProduct,
  getAllProducts,
  getProductById,
  deleteProductById,
  updateProduct,
  getRelatedProducts
} = require("../../controllers/productController");
const {authenticateUser,authorizeRoles} =require('../../middleware/authMiddleware')
const multer = require("multer");
// e.g. single & array setup
const storage = multer.memoryStorage();

router.get("/", getAllProducts);
/*router.get("/:id",       ctrl.getProductById);*/
router.get("/:id", getProductById);

router.get('/relatedProducts/:id',getRelatedProducts)
module.exports = router;
