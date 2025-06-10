// routes/productRoutes.js
const express = require("express");
const router = express.Router();
const {
  createProduct,
  getAllProducts,
  getProductById,
  deleteProductById,
  updateProduct,
  getProductByBarCode,
} = require("../../controllers/productController");
const {
  authenticateUser,
  authorizeRoles,
} = require("../../middleware/authMiddleware");
const multer = require("multer");
// e.g. single & array setup
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.use(authenticateUser, authorizeRoles("admin"));

router.get("/", getAllProducts);
/*router.get("/:id",       ctrl.getProductById);*/
router.post(
  "/",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "images", maxCount: 5 },
  ]),
  createProduct
);
router.get("/:id", getProductById);
router.get("/barcode/:barcode", getProductByBarCode);
router.put(
  "/:id",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "images", maxCount: 5 },
  ]),
  updateProduct
);
router.delete("/:id", deleteProductById);

module.exports = router;
