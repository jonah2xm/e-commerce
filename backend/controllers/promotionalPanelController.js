// controllers/promotionalPanelController.js

const mongoose = require("mongoose");
const PromotionalPanel = require("../models/promotionalPanelModel");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");


function uploadToCloudinary(buffer, slug, filename = "") {
  return new Promise((resolve, reject) => {
    const folder = `promotional-panels/${slug}`;
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


// Default data used if no PromotionalPanel document exists yet
const DEFAULT_PANEL_DATA = {
  _id: "1",
  title: "Summer Sale Up To 50% Off",
  description: "Take advantage of our biggest sale of the season. Limited time offer on selected items.",
  buttonText: "Shop the Sale",
  buttonLink: "/sale",
  gradientFrom: "#0d47a1",
  gradientTo: "#1976d2",
  gradientOpacity: 0.9,
  imageUrl: "/placeholder.svg?height=400&width=600",
  imageAlt: "Summer Sale",
  layout: "image-right",
  placement: "home",
  hideOnMobile: false,
  isActive: true,
};

/**
 * GET /api/promotional-panel
 * Returns the single PromotionalPanel document (creates default if none exists).
 */
exports.getPromotionalPanel = async  (req, res)=> {

  try {
    // Try to find the single document; since _id is always "1", we can do findById
    let panel = await PromotionalPanel.findById("1").lean();
    if (!panel) {
      // No document yet → create with default data
      const created = await PromotionalPanel.create(DEFAULT_PANEL_DATA);
      panel = created.toObject();
    }
    return res.status(200).json({ success: true, data: panel });
  } catch (err) {
    console.error("getPromotionalPanel error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

/**
 * PATCH /api/promotional-panel
 * Updates the single PromotionalPanel (or creates it if missing), including optional image upload.
 *
 * Expects multipart/form-data if uploading an image; otherwise, regular JSON fields.
 * - Text fields in req.body (all as strings; we cast booleans/numbers as needed)
 * - Optional file in req.file (.buffer)
 */
exports.updatePromotionalPanel = async  (req, res)=> {
  console.log("updatePromotionalPanel called with body:", req.body);
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // 1) Fetch existing panel (if any)
    let panel = await PromotionalPanel.findById("1").session(session);
    const isNew = !panel;
    if (isNew) {
      panel = new PromotionalPanel({ _id: "1" });
    }

    // 2) Parse and assign incoming body fields (all come in as strings)
    const body = req.body;

    if (body.title)           panel.title           = body.title;
    if (body.description)     panel.description     = body.description;
    if (body.buttonText)      panel.buttonText      = body.buttonText;
    if (body.buttonLink)      panel.buttonLink      = body.buttonLink;
    if (body.gradientFrom)    panel.gradientFrom    = body.gradientFrom;
    if (body.gradientTo)      panel.gradientTo      = body.gradientTo;
    if (body.gradientOpacity) panel.gradientOpacity = parseFloat(body.gradientOpacity);
    if (body.imageAlt)        panel.imageAlt        = body.imageAlt;
    if (body.layout)          panel.layout          = body.layout;
    if (body.placement)       panel.placement       = body.placement;

    // Cast boolean-like strings ("true"/"false") to actual booleans
    if (body.hideOnMobile != null) {
      panel.hideOnMobile = body.hideOnMobile === "true";
    }
    if (body.isActive != null) {
      panel.isActive = body.isActive === "true";
    }

    // 3) If an image file was included, upload to Cloudinary and set imageUrl
    if (req.file && req.file.buffer) {
      // (Optional) If you want to delete the old image from Cloudinary,
      // you could parse the previous URL etc. Here we simply overwrite.
      const secureUrl = await uploadToCloudinary(
        req.file.buffer,
        (panel._id || "1").toString(),
        req.file.originalname
      );
      panel.imageUrl = secureUrl;
    }else console.log("No image file provided, keeping existing imageUrl:", panel.imageUrl);

    // 4) Save within transaction
    await panel.save({ session });
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ success: true, data: panel.toObject() });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("updatePromotionalPanel error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};
