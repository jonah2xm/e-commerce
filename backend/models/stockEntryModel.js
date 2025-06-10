const mongoose = require("mongoose")

const stockItemSchema = new mongoose.Schema({
  productId:      { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  variantId:      { type: mongoose.Schema.Types.ObjectId, ref: "Variant", required: true },
  productName:    { type: String, required: true },
  sku:            { type: String, required: true },
  color:          String,
  size:           String,
  image:          String,
  previousStock:  { type: Number, required: true, min: 0 },
  quantity:       { type: Number, required: true, min: 1 },
  newStock:       { type: Number, required: true, min: 0 },
}, { _id: false })

const stockEntrySchema = new mongoose.Schema({
  reference: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  date: {
    type: Date,
    required: true,
  },
  notes: {
    type: String,
    trim: true,
    default: "",
  },
  items: {
    type: [stockItemSchema],
    validate: (arr) => Array.isArray(arr) && arr.length > 0,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
}, {
  timestamps: true,
})

module.exports = mongoose.models.StockEntry || mongoose.model("StockEntry", stockEntrySchema)
