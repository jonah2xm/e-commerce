const mongoose    = require("mongoose");
const HeroBanner  = require("../models/heroBannerModel");
const cloudinary  = require("cloudinary").v2;
const streamifier = require("streamifier");

/**
 * Upload helper (yours)
 */
function uploadToCloudinary(buffer, slug, filename = "") {
  return new Promise((resolve, reject) => {
    const folder    = `hero-banners/${slug}`;
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

/**
 * GET /api/hero-banner
 * Returns the single banner, creating a default if none exists.
 */
exports.getHeroBanner = async function(req, res) {
  try {
    let banner = await HeroBanner.findOne().lean();
    if (!banner) {
      // create default
      banner = await new HeroBanner({
        title: "Welcome to Our Store",
        subtitle: "",
        gradientFrom: "#0d47a1",
        gradientTo: "#1976d2",
        patternEnabled: true,
        patternOpacity: 0.1,
        textAlignment: "left",
        paddingY: "py-20",
        ctas: [],
        imageUrl: "",
        imageAlt: "",
        imageWidth: 800,
        imageHeight: 600,
        imageObjectFit: "cover",
        badge: null,
        isActive: true,
      }).save();
      banner = banner.toObject();
    }
    return res.status(200).json({ success: true, data: banner });
  } catch (err) {
    console.error("getHeroBanner error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

/**
 * PATCH /api/hero-banner
 * Creates or updates the single banner based on payload + optional image upload.
 */
exports.updateHeroBanner = async function(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    let banner = await HeroBanner.findOne().session(session);
    const isNew = !banner;
    if (isNew) {
      banner = new HeroBanner();
    }

    // 1) Apply incoming fields
    const body = req.body;
    console.log('body',body)
    if (body.title)          banner.title          = body.title;
    if (body.subtitle)       banner.subtitle       = body.subtitle;
    if (body.gradientFrom)   banner.gradientFrom   = body.gradientFrom;
    if (body.gradientTo)     banner.gradientTo     = body.gradientTo;
    if (body.patternEnabled!=null)
                              banner.patternEnabled = (body.patternEnabled==="true");
    if (body.patternOpacity) banner.patternOpacity = parseFloat(body.patternOpacity);
    if (body.textAlignment)  banner.textAlignment  = body.textAlignment;
    if (body.paddingY)       banner.paddingY       = body.paddingY;
    if (body.ctas)           banner.ctas           = JSON.parse(body.ctas);
    if (body.imageAlt)       banner.imageAlt       = body.imageAlt;
    if (body.imageWidth)     banner.imageWidth     = Number(body.imageWidth);
    if (body.imageHeight)    banner.imageHeight    = Number(body.imageHeight);
    if (body.imageObjectFit) banner.imageObjectFit = body.imageObjectFit;
    if (body.badge)          banner.badge          = JSON.parse(body.badge);
    if (body.isActive!=null) banner.isActive       = (body.isActive==="true");

    // 2) Handle image upload
    if (req.file && req.file.buffer) {
      // optional: destroy old Cloudinary image here...
      const secureUrl = await uploadToCloudinary(
        req.file.buffer,
        (banner._id||"new").toString(),
        req.file.originalname
      );
      banner.imageUrl = secureUrl;
    }else console.log('no its not working')

    // 3) Save
    await banner.save({ session });
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ success: true, data: banner });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("updateHeroBanner error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};
