// controllers/ordersController.js
const Order = require("../models/order");
const {sendOrderConfirmationEmail,sendOrderUpdateEmail}=require('../services/mailService')
const mongoose=require('mongoose')
/**
 * Create a new order in MongoDB.
 * Order numbers will be of the form "MM-<n>" where MM is the month (01–12)
 * and <n> is the 1‐based sequence within that month.
 */
exports.createOrder = async (req, res) => {
  try {
    const data = req.body;
    const now  = new Date();

    // Build month‐seq orderNumber
    const year       = now.getFullYear();
    const monthIndex = now.getMonth();
    const monthNum   = String(monthIndex + 1).padStart(2, "0");
    const startOfMonth = new Date(year, monthIndex, 1);
    const startOfNext  = new Date(year, monthIndex + 1, 1);
    const countThisMonth = await Order.countDocuments({
      createdAt: { $gte: startOfMonth, $lt: startOfNext },
    });
    const orderNumber = `${monthNum}-${countThisMonth + 1}`;

    // Merge in orderNumber
    const orderData = { ...data, orderNumber };
    const order = new Order(orderData);
    await order.save();

    // Send confirmation email (don't block response)
    sendOrderConfirmationEmail(
      order.email,
      order.orderNumber,
      order.items.map((i) => ({
        name: i.name,
        sku: i.sku,
        price: i.price,
        quantity: i.quantity,
      })),
      {
        subtotal: order.totals.subtotal,
        shipping: order.totals.shipping,
        tax:      order.totals.tax,
        total:    order.totals.total,
      }
    ).catch((err) => {
      console.error("Failed to send order confirmation email:", err);
    });

    // Respond with IDs
    return res.status(201).json({
      success:     true,
      orderId:     order._id,
      orderNumber: order.orderNumber,
    });
  } catch (err) {
    console.error("Order creation failed:", err);
    return res.status(400).json({ success: false, error: err.message });
  }
};


exports.updateOrder = async (req, res) => {
  console.log("yes its working",req.body)
  try {
    const { id } = req.params;
    const updates = req.body;

    // 1. Find the existing order
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // 2. Whitelist fields you allow to be updated
    const allowedUpdates = ['email','lastName','firstName','items', 'totals', 'status','address','apartment', 'wilaya','commune','status','phone','shippingMethod'];
    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        order[field] = updates[field];
      }
    });

    // 3. Save the changes
    await order.save();

    // 4. Optionally, notify customer of key updates (e.g., status change)
    if (updates.status) {
      sendOrderConfirmationEmail(
        order.email,
        order.orderNumber,
        order.items.map((i) => ({
          name: i.name,
          sku: i.sku,
          price: i.price,
          quantity: i.quantity,
        })),
        {
          subtotal: order.totals.subtotal,
          shipping: order.totals.shipping,
          tax:      order.totals.tax,
          total:    order.totals.total,
        }
      ).catch((err) => {
        console.error("Failed to send order confirmation email:", err);
      });
    }

    // 5. Return the updated order
    return res.status(200).json({
      success: true,
      orderId: order._id,
      orderNumber: order.orderNumber,
      updatedFields: Object.keys(updates),
    });
  } catch (err) {
    console.error('Order update failed:', err);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};

exports.orderStatusUpdate = async (req, res) => {
  console.log('req.body',req.body)
  try {
    const { id } = req.params;
    const { status } = req.body;

    // 1. Validate incoming status
    const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'canceled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`,
      });
    }

    // 2. Find and update the order's status
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // 3. Update and timestamp
    order.status    = status;
    order.updatedAt = new Date();
    await order.save();

    // 4. Notify customer
    sendOrderUpdateEmail(
      order.email,
      order.orderNumber,
      order.status
    ).catch(err => {
      console.error('Failed to send status update email:', err);
    });

    // 5. Return the updated status
    return res.status(200).json({
      success: true,
      orderId:     order._id,
      orderNumber: order.orderNumber,
      status:      order.status,
      updatedAt:   order.updatedAt,
    });
  } catch (err) {
    console.error('Order status update failed:', err);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};
exports.getOrderById = async (req, res) => {
  const { id } = req.params;

  try {
    // Build query: by _id if valid ObjectId, else by orderNumber
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { orderNumber: id };

    const order = await Order.findOne(query).lean();
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Respond with full order document
    res.json(order);
  } catch (err) {
    console.error("Error fetching order:", err);
    res.status(500).json({ message: "Server error" });
  }
};
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }); // newest first

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};

exports.getOrdersByEmail = async function (req, res) {
  try {
    const { email } = req.params;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email parameter is required" });
    }

    // Find all orders where `order.email` matches (case-insensitive)
    const orders = await Order.find({ email: { $regex: `^${email}$`, $options: "i" } })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: orders });
  } catch (err) {
    console.error("getOrdersByEmail error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
};
