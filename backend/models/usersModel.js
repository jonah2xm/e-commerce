// models/userModel.js
const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    address: { type: String, required: true },
    apartment: { type: String }, // optional
    wilaya: { type: String, required: true },
    commune: { type: String, required: true },
    city: { type: String, required: true },
    zipCode: { type: String, required: true },
    phone: { type: String }, // optional—validate format in your service layer
    isDefault: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  {
    _id: true, // each address gets its own ID
    timestamps: false, // we’re only using createdAt here
  }
);

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isSuperAdmin: { type: Boolean, default: false },
    resetPasswordToken: String,
    resetPasswordExpires: Date,

    // ← NEW addresses field
    addresses: [addressSchema],
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
