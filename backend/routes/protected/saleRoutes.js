// routes/salesRoutes.js

const express = require("express");
const {
  createSale,
  getSaleById,
  listSales,
  getAllSales,
  updateSaleStatus,
} = require("../../controllers/saleController");
const {
  authenticateUser,
  authorizeRoles,
} = require("../../middleware/authMiddleware");
const router = express.Router();

router.use(authenticateUser, authorizeRoles("admin"));
// POST a new sale
router.post("/", createSale);

// GET one sale
router.get("/:id", getSaleById);

// GET a list of sales
router.get("/", getAllSales);

router.patch('/updateSaleStatus/:id',updateSaleStatus)

module.exports = router;
