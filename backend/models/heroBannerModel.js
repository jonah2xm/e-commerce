const mongoose = require("mongoose");
const { Schema, model, models } = mongoose;

const CtaSchema = new Schema({
  text: { type: String, required: true },
  href:   { type: String, required: true },
  variant: { type: String, enum: ["solid","secondary","outline"], default: "solid" },
});

const BadgeSchema = new Schema({
  text:       { type: String, required: true },
  color:      { type: String, default: "#FFD700" },
  background: { type: String, default: "#FFF8DC" },
});

const HeroBannerSchema = new Schema({
  title:           { type: String, required: true },
  subtitle:        { type: String, default: "" },
  gradientFrom:    { type: String, default: "#0d47a1" },
  gradientTo:      { type: String, default: "#1976d2" },
  patternEnabled:  { type: Boolean, default: true },
  patternOpacity:  { type: Number, min: 0, max: 1, default: 0.1 },
  textAlignment:   { type: String, enum: ["left","center","right"], default: "left" },
  paddingY:        { type: String, default: "py-20" },
  ctas:            { type: [CtaSchema], default: [] },
  imageUrl:        { type: String, default: "" },
  imageAlt:        { type: String, default: "" },
  imageWidth:      { type: Number, default: 800 },
  imageHeight:     { type: Number, default: 600 },
  imageObjectFit:  { type: String, enum: ["cover","contain","fill"], default: "cover" },
  badge:           { type: BadgeSchema, default: null },
  isActive:        { type: Boolean, default: true },
}, {
  timestamps: true,
});

module.exports = models.HeroBanner || model("HeroBanner", HeroBannerSchema);
