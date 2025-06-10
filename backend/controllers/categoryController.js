const Category = require("../models/categoryModel");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const cloudinary = require("../utils/cloudinary");
const streamifier = require("streamifier");
// GET /api/categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().populate("parentCategory", "name");
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/categories
exports.createCategory = async (req, res) => {
  try {
    const { name, slug, description, status, parentCategory } = req.body;

    let imageUrl = null;

    if (req.file) {
      const result = await cloudinary.uploader.upload_stream(
        { folder: "categories" },
        async (error, result) => {
          if (error) throw error;

          const newCategory = new Category({
            name,
            slug,
            description,
            status,
            parentCategory: mongoose.Types.ObjectId.isValid(parentCategory)
              ? parentCategory
              : null,
            image: result.secure_url,
          });

          const savedCategory = await newCategory.save();
          res.status(201).json(savedCategory);
        }
      );

      // Pipe the buffer to Cloudinary

      streamifier.createReadStream(req.file.buffer).pipe(result);
    } else {
      const newCategory = new Category({
        name,
        slug,
        description,
        status,
        parentCategory: mongoose.Types.ObjectId.isValid(parentCategory)
          ? parentCategory
          : null,
        image: null,
      });

      const savedCategory = await newCategory.save();
      res.status(201).json(savedCategory);
    }
  } catch (err) {
    console.error(err.message);
    res.status(400).json({ message: err.message });
  }
};

exports.getCategoryById = async (req, res) => {
  const { id } = req.params;

  try {
    const category = await Category.findById(id).populate(
      "parentCategory",
      "name"
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json(category);
  } catch (error) {
    console.error("Error fetching category by ID:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateCategory = async (req, res) => {
  const { id } = req.params;
  try {
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Update scalar fields
    const { name, slug, description, status, parentCategory } = req.body;
    if (name) category.name = name;
    if (slug) category.slug = slug;
    if (description) category.description = description;
    if (status) category.status = status;
    if (parentCategory && mongoose.Types.ObjectId.isValid(parentCategory)) {
      category.parentCategory = parentCategory;
    } else {
      category.parentCategory = null;
    }

    // Handle image update via Cloudinary
    if (req.file) {
      // Remove old image from Cloudinary if exists
      if (category.image) {
        try {
          // Extract public_id from existing URL: assume stored like https://res.cloudinary.com/<...>/image/upload/v<version>/folder/subfolder/<public_id>.<ext>
          const segments = category.image.split("/");
          const fileName = segments.pop().split(".")[0];
          const folder = segments.slice(segments.indexOf("upload") + 1).join("/");
          const publicId = `${folder}/${fileName}`;
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.warn("Could not delete old image from Cloudinary:", err);
        }
      }

      // Upload new image
      const uploadStream = (buffer) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "categories" },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          streamifier.createReadStream(buffer).pipe(stream);
        });
      };

      const result = await uploadStream(req.file.buffer);
      category.image = result.secure_url;
    }

    const updatedCategory = await category.save();
    res.status(200).json(updatedCategory);
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// controllers/categoryController.js

function extractPublicId(url) {
  const [, afterUpload] = url.split("/upload/");
  if (!afterUpload) return null;

  // remove version (v1234567890/) if present
  const withoutVersion = afterUpload.replace(/^v\d+\//, "");

  // strip the extension
  return withoutVersion.substring(0, withoutVersion.lastIndexOf("."));
}

exports.deleteCategory = async (req, res) => {
  const { id } = req.params;
  try {
    const categoriesToDelete = await Category.find({
      $or: [{ _id: id }, { parentCategory: id }],
    });
    if (categoriesToDelete.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    for (const cat of categoriesToDelete) {
      if (cat.image) {
        const publicId = extractPublicId(cat.image);
        if (publicId) {
          console.log(`Deleting Cloudinary image: ${publicId}`);
          try {
            // invalidate:true will also clear cached versions if you need it
            await cloudinary.uploader.destroy(publicId, { invalidate: true });
          } catch (err) {
            console.warn(`Cloudinary destroy failed for ${publicId}:`, err);
          }
        }
      }
    }

    const ids = categoriesToDelete.map((c) => c._id);
    await Category.deleteMany({ _id: { $in: ids } });

    res
      .status(200)
      .json({ message: "Category and its subcategories deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ message: "Server error" });
  }
};


exports.getParentCategories = async (req, res) => {
  try {
    const parents = await Category
      .find({ parentCategory: null })
      .select('name slug image')  // only return fields you need
      .lean()

    return res.status(200).json(parents)
  } catch (error) {
    console.error('Error fetching parent categories:', error)
    return res
      .status(500)
      .json({ message: 'Failed to fetch parent categories' })
  }
}