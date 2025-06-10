const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
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
  },
  description: {
    type: String,
  },
  status: {
    type: String,
    required:true,
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    default: null,
  },
  image: {
    type: String, // image URL or path
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Category =mongoose.model("Category", categorySchema);
module.exports = Category;
