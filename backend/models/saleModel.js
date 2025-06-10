// models/Sale.js

const mongoose = require("mongoose");

const saleItemSchema = new mongoose.Schema(
  {
    id: {
      // this was your variant._id
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true },
    variant: { type: String, required: true }, // e.g. "M/Red"
    sku: { type: String, required: true },
    barcode: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    saleNumber: {
      type: String,
      required: true,
      unique: true,
    },
    items: {
      type: [saleItemSchema],
      required: true,
      validate: (v) => Array.isArray(v) && v.length > 0,
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "credit_card", "debit_card"],
      required: true,
    },
    status: {
      type: String,
      enum: ["completed", "refunded"],
      default: "completed",
      required: true,
    },

    // (We’re keeping discounts “UI-only” so we don’t persist discountType/value)
    subtotal: { type: Number, required: true, min: 0 },
    discountedSubtotal: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },

    amountTendered: {
      type: Number,
      min: 0,
      // only set when paymentMethod === "cash"
    },
    changeDue: {
      type: Number,
      min: 0,
      // only set when paymentMethod === "cash"
    },

    timestamp: {
      type: Date,
      default: () => new Date(),
      required: true,
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt
  }
);

module.exports = mongoose.models.Sale || mongoose.model("Sale", saleSchema);
