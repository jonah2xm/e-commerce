// models/Order.js
const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  sku: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  color: String,
  size: String,
  image: String,
});

const totalsSchema = new mongoose.Schema({
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  shipping: {
    type: Number,
    required: true,
    min: 0,
  },
  tax: {
    type: Number,
    required: true,
    min: 0,
  },
  total: {
    type: Number,
    required: true,
    min: 0,
  },
}, { _id: false });

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },

    email: {
      type: String,
      required: true,
    },
    saveInfo: {
      type: Boolean,
      default: false,
    },

    // Flat shipping‐address fields
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    apartment: String,
    city: {
      type: String,
      required: true,
    },
    state: String,
    zipCode: String,
    wilaya: {
      type: String,
      required: true,
    },
    commune: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },

    shippingMethod: {
      type: String,
      required: true,
      enum: ["desk", "home"],
    },

    // line items
    items: {
      type: [orderItemSchema],
      required: true,
      validate: (v) => Array.isArray(v) && v.length > 0,
    },

    // totals sub‐document (flat money fields)
    totals: {
      type: totalsSchema,
      required: true,
    },

    status: {
      type: String,
      enum: ["confirmation", "pending", "shipped", "delivered", "canceled","Purchased"],
      default: "confirmation",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Order || mongoose.model("Order", orderSchema);
