// backend/routes/orders.js
const express = require("express");
const router  = express.Router();
const {createOrder, getOrderById, getAllOrders,updateOrder, orderStatusUpdate, getOrdersByEmail}   = require("../../controllers/orderController");
const multer = require("multer");
const {authenticateUser,authorizeRoles} =require('../../middleware/authMiddleware')

const upload = multer(); // memory storage
router.use(authenticateUser, authorizeRoles("admin"));
// POST   /orders        → createOrder
// GET    /orders/:id    → getOrderById
router.post("/",upload.none(), createOrder);
router.get('/:id',getOrderById)
router.get('/',getAllOrders)
router.get('/ordersByEmail/:email',getOrdersByEmail)
router.put('/:id',updateOrder)
router.patch('/:id',orderStatusUpdate)
module.exports = router;
