const express = require("express");
const {
  listCustomers,
  getCustomerById,
  getCustomerOrders,
  getCustomerStats,
} = require("../../controllers/customerController");
const router = express.Router();
const {
  authenticateUser,
  authorizeRoles,
} = require("../../middleware/authMiddleware");

router.use(authenticateUser, authorizeRoles("admin"));
router.get("/", listCustomers);

router.get("/:idOrder", getCustomerById);
router.get("/:idOrder/orders", getCustomerOrders);
router.get("/:idOrder/stats", getCustomerStats);
//router.get("/detail",  getCustomerDetail);

module.exports = router;
