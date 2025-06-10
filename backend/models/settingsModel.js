// models/Settings.js
const mongoose = require("mongoose");
const { Schema, model, models } = mongoose;

const SettingsSchema = new Schema({
  storeName:            { type: String, required: true },
  logoUrl:              { type: String, default: null },   // serves `/uploads/...`
  contactEmail:         { type: String, required: true },
  phoneNumber:          { type: String, required: true },
  storeLocation:        { type: String, required: true },
  taxEnabled:           { type: Boolean, default: false },
  defaultTaxPercentage: { type: Number, default: 0, min: 0, max: 100 },
}, {
  timestamps: true
});

// Avoid model recompilation in dev
module.exports = models.Settings || model("Settings", SettingsSchema);
