const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  barcode: {
    type: String,
    required: true,
    default: null,
  },
  sku: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  size: {
    type: String,
    required: true,
    trim: true,
    // no enum here—allows XS, 28, 40.5, etc.
  },
  color: {
    type: String,
    required: true,
    trim: true,
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
  },
});

// new sub‐schema for specifications
const specificationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  value: {
    type: String,
    required: true,
    trim: true,
  },
});

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },

    // —— PRICING & SALES AT PRODUCT LEVEL ——
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    salePrice: {
      type: Number,
      min: 0,
      default: null, // null = no sale
    },
    saleStart: {
      type: Date,
      default: null, // null = sale always active if salePrice set
    },
    saleEnd: {
      type: Date,
      default: null, // null = sale never expires
    },

    // garment variants
    variants: [variantSchema],

    // category reference + denormalized
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    categoryName: String,
    categorySlug: String,
    categoryParent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    // product images
    images: [String],

    // —— NEW FIELDS ——
    features: {
      type: [String], // array of feature descriptions
      default: [],
    },
    specifications: {
      type: [specificationSchema], // array of { name, value }
      default: [],
    },

    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
    },

    // explicit createdAt if you need a separate alias
    createdAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  {
    timestamps: true, // adds both createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * currentPrice virtual takes the product-level sale into account:
 *  - If salePrice is set and now ∈ [saleStart, saleEnd], return salePrice
 *  - Otherwise fall back to base price
 */
productSchema.virtual("currentPrice").get(function () {
  const now = new Date();
  if (this.salePrice !== null) {
    const started = !this.saleStart || this.saleStart <= now;
    const notEnded = !this.saleEnd || this.saleEnd >= now;
    if (started && notEnded) {
      return this.salePrice;
    }
  }
  return this.price;
});

module.exports = mongoose.model("Product", productSchema);
