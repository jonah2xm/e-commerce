// backend/routes/orders.js
const express = require("express");
const router  = express.Router();
const {createOrder, getOrderById, getAllOrders}   = require("../../controllers/orderController");
const multer = require("multer");

const upload = multer(); // memory storage
// POST   /orders        → createOrder
// GET    /orders/:id    → getOrderById
router.post("/",upload.none(), createOrder);
router.get('/:id',getOrderById)
router.get('/',getAllOrders)
module.exports = router;
