const mongoose = require("mongoose");
const streamifier = require("streamifier");
const cloudinary = require("cloudinary").v2;
const Product = require("../models/productModel");
const User = require("../models/usersModel");
const { sendWishlistSaleMail } = require("../services/mailService");

// Helper: Upload buffer to Cloudinary
function uploadToCloudinary(buffer, slug, filename = "") {
  return new Promise((resolve, reject) => {
    const folder = `products/${slug}`;
    const public_id = filename
      ? `${folder}/${filename.replace(/\.[^/.]+$/, "")}`
      : folder;

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, public_id, overwrite: true },
      (error, result) => (error ? reject(error) : resolve(result.secure_url))
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

// Helper: Extract Cloudinary public_id from URL
function extractPublicId(url) {
  const parts = url.split("/");
  const last = parts.pop().split(".")[0];
  const folder = parts.slice(-2).join("/");
  return `${folder}/${last}`;
}
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      price,
      salePrice,
      saleStart,
      saleEnd,
      category,
      categoryName,
      categorySlug,
      categoryParent,
      barcode,
      // might come in as JSON‐strings
      features,
      specifications,
    } = req.body;

    // 1) Parse variants
    let variants = [];
    if (req.body.variants) {
      variants = Array.isArray(req.body.variants)
        ? req.body.variants
        : JSON.parse(req.body.variants);
    }

    // 2) Parse features (string → Array<string>)
    let parsedFeatures = [];
    if (features) {
      parsedFeatures = Array.isArray(features)
        ? features
        : JSON.parse(features);
    }

    // 3) Parse specifications (string → Array<{name,value}>)
    let parsedSpecs = [];
    if (specifications) {
      parsedSpecs = Array.isArray(specifications)
        ? specifications
        : JSON.parse(specifications);
    }

    // 4) Format sale dates
    const formattedSaleStart = saleStart ? new Date(saleStart) : null;
    const formattedSaleEnd = saleEnd ? new Date(saleEnd) : null;

    // 5) Build product data
    const productData = {
      name,
      slug,
      description,
      barcode,
      price,
      salePrice: salePrice || null,
      saleStart: formattedSaleStart,
      saleEnd: formattedSaleEnd,
      category: new mongoose.Types.ObjectId(category),
      categoryName,
      categorySlug,
      categoryParent: categoryParent
        ? new mongoose.Types.ObjectId(categoryParent)
        : null,
      variants,
      images: [],
      features: parsedFeatures,
      specifications: parsedSpecs,
    };

    // 6) Save product
    const product = new Product(productData);
    const saved = await product.save();

    // 7) If there are image files, upload them and update
    if (req.files?.images && Array.isArray(req.files.images)) {
      const urls = await Promise.all(
        req.files.images.map((file) =>
          uploadToCloudinary(file.buffer, saved.slug, file.originalname)
        )
      );
      saved.images = urls;
      await saved.save();
    }
    if (saved.salePrice && saved.saleStart && saved.saleEnd) {
      const users = await User.find({ wishlist: saved._id });
      for (const user of users) {
        await sendWishlistSaleMail(user.email, saved);
      }
    }
    return res.status(201).json(saved);
  } catch (err) {
    console.error("createProduct error:", err);
    return res.status(400).json({ message: err.message });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("category", "name slug")
      .populate("categoryParent", "name slug")
      .exec();
    res.json(products);
  } catch (err) {
    console.error("getAllProducts error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findById(id)
      .populate("category", "name slug")
      .populate("categoryParent", "name slug")
      .exec();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    console.error("getProductById error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteProductById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findById(id).exec();
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Delete all product images
    const allUrls = product.images || [];
    for (const url of allUrls) {
      const publicId = extractPublicId(url);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId, { invalidate: true });
        } catch (err) {
          console.warn(`Failed to delete Cloudinary image ${publicId}:`, err);
        }
      }
    }

    await Product.deleteOne({ _id: id });

    res.json({ message: "Product and its images deleted successfully" });
  } catch (err) {
    console.error("deleteProductById error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    // Find existing
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Destructure updatable fields
    const {
      name,
      slug,
      description,
      price,
      salePrice,
      saleStart,
      saleEnd,
      category,
      categoryName,
      categorySlug,
      categoryParent,
      barcode,
    } = req.body;

    // Update simple fields if provided
    if (name !== undefined) product.name = name;
    if (slug !== undefined) product.slug = slug;
    if (description !== undefined) product.description = description;
    if (barcode !== undefined) product.barcode = barcode;
    if (price !== undefined) product.price = price;
    product.salePrice = salePrice || null;
    product.saleStart = saleStart ? new Date(saleStart) : null;
    product.saleEnd = saleEnd ? new Date(saleEnd) : null;

    if (category !== undefined) {
      product.category = new mongoose.Types.ObjectId(category);
    }
    if (categoryName !== undefined) product.categoryName = categoryName;
    if (categorySlug !== undefined) product.categorySlug = categorySlug;
    product.categoryParent = categoryParent
      ? new mongoose.Types.ObjectId(categoryParent)
      : null;

    // Parse & replace variants if provided
    if (req.body.variants) {
      product.variants = Array.isArray(req.body.variants)
        ? req.body.variants
        : JSON.parse(req.body.variants);
    }

    // Handle images: if new ones uploaded, delete old and replace
    if (req.files && Array.isArray(req.files.images)) {
      // delete existing
      for (const url of product.images || []) {
        const publicId = extractPublicId(url);
        if (publicId) {
          try {
            await cloudinary.uploader.destroy(publicId, { invalidate: true });
          } catch (err) {
            console.warn(`Failed to delete old image ${publicId}:`, err);
          }
        }
      }
      // upload new
      const urls = await Promise.all(
        req.files.images.map((file) =>
          uploadToCloudinary(file.buffer, product.slug, file.originalname)
        )
      );
      product.images = urls;
    }

    // Save updated
    const updated = await product.save();
    if (updated.salePrice && updated.saleStart && updated.saleEnd) {
      // Optionally: check if these fields were just set/changed
      const users = await User.find({ wishlist: updated._id });
      for (const user of users) {
        await sendWishlistSaleMail(user.email, updated);
      }
    }
    res.json(updated);
  } catch (err) {
    console.error("updateProduct error:", err);
    res.status(400).json({ message: err.message });
  }
};

exports.getRelatedProducts = async (req, res) => {
  try {
    const { id } = req.params;

    // 1) Fetch the “seed” product
    const seed = await Product.findById(id).lean().exec();
    if (!seed) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 2) Build OR clauses for same category or same parent
    const orClauses = [];
    if (seed.category) orClauses.push({ category: seed.category });
    if (seed.categoryParent)
      orClauses.push({ categoryParent: seed.categoryParent });

    if (!orClauses.length) {
      // no category info → no related products
      return res.json([]);
    }

    // 3) Query other products matching those clauses, excluding the seed
    const related = await Product.find({
      _id: { $ne: seed._id },
      status: "active",
      $or: orClauses,
    })
      .limit(4) // return up to 4 related items
      .lean()
      .exec();

    // 4) Return the related products
    return res.json(related);
  } catch (err) {
    console.error("getRelatedProducts error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// controllers/productController.js
// adjust path to your Product model

/**
 * GET /api/products/barcode/:barcode
 * Finds a product whose variants array contains the given barcode.
 * Returns 404 if not found, or 200 with { product, variant } if found.
 */
exports.getProductByBarCode = async (req, res, next) => {
  const { barcode } = req.params;

  try {
    // Find the first product that has a variant with this barcode
    const product = await Product.findOne({
      "variants.barcode": barcode,
    }).lean();
    if (!product) {
      return res.status(404).json({ message: "Product/variant not found" });
    }

    // Extract just the matching variant
    const variant = product.variants.find((v) => v.barcode === barcode);

    // If for some reason variants array is empty or barcode mismatch
    if (!variant) {
      return res.status(404).json({ message: "Variant not found in product" });
    }

    // Return both the product and the specific variant
    return res.json({ product, variant });
  } catch (err) {
    console.error("getProductByBarCode error:", err);
    next(err); // or res.status(500).json({ message: "Server error" })
  }
};
