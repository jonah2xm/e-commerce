// routes/admin/inventory.js
const express = require("express");
const {
  authenticateUser,
  authorizeRoles,
} = require("../../middleware/authMiddleware");
const {
  createStockEntry,
  listStockEntries,
  getStockEntryById,
  deleteStockEntry,
  updateStockEntry,
} = require("../../controllers/inventoryController");

const router = express.Router();

router.use(authenticateUser, authorizeRoles("admin"));
// Create a new stock entry (and update variant stock levels)
router.post("/", createStockEntry);

// List all stock entries
router.get("/", listStockEntries);

// Get a single stock entry by ID
router.get("/:id", getStockEntryById);

router.put('/:id',updateStockEntry)
// Delete a stock entry by ID
router.delete("/:id", deleteStockEntry);


module.exports = router;
