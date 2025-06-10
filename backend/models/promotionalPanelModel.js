// models/PromotionalPanel.js

const mongoose = require("mongoose");

const PromotionalPanelSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: "1",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    buttonText: {
      type: String,
      required: true,
      trim: true,
    },
    buttonLink: {
      type: String,
      required: true,
      trim: true,
    },
    gradientFrom: {
      type: String,
      default: "#0d47a1",
      trim: true,
    },
    gradientTo: {
      type: String,
      default: "#1976d2",
      trim: true,
    },
    gradientOpacity: {
      type: Number,
      default: 0.9,
      min: 0,
      max: 1,
    },
    // Will store the Cloudinary URL after upload
    imageUrl: {
      type: String,
      default: "/placeholder.svg?height=400&width=600",
      trim: true,
    },
    imageAlt: {
      type: String,
      default: "Summer Sale",
      trim: true,
    },
    layout: {
      type: String,
      enum: ["image-right", "image-left"],
      default: "image-right",
    },
    placement: {
      type: String,
      enum: ["home", "category", "product"],
      default: "home",
    },
    hideOnMobile: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    _id: false, // We manage _id manually (always "1")
  }
);

module.exports = mongoose.model("PromotionalPanel", PromotionalPanelSchema);
