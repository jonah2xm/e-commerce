// controllers/settingsController.js
const mongoose = require("mongoose");
const Settings = require("../models/settingsModel");
const streamifier = require("streamifier");
const cloudinary = require("cloudinary").v2;

/**
 * Helper: upload a buffer to Cloudinary under "settings/slug[/filename]"
 * resolves with { url, public_id }
 */
function uploadToCloudinary(buffer, slug, filename = "") {
  return new Promise(function (resolve, reject) {
    var folder = "settings/" + slug;
    var public_id = filename
      ? folder + "/" + filename.replace(/\.[^/.]+$/, "")
      : folder;

    var uploadStream = cloudinary.uploader.upload_stream(
      { folder: folder, public_id: public_id, overwrite: true },
      function (err, result) {
        if (err) return reject(err);
        resolve({ url: result.secure_url, public_id: result.public_id });
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

/**
 * Helper: extract Cloudinary public_id from URL
 */
function extractPublicId(url) {
  var parts = url.split("/");
  var last = parts.pop().split(".")[0];
  var folder = parts.slice(-2).join("/");
  return folder + "/" + last;
}

/**
 * GET /api/settings
 */
exports.getSettings = async function (req, res) {
  try {
    var settings = await Settings.findOne();
    if (!settings) {
      settings = await new Settings().save();
    }
    return res.status(200).json({ success: true, data: settings });
  } catch (err) {
    console.error("getSettings error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

/**
 * PATCH /api/settings
 * If no doc exists, creates one from req.body. Otherwise updates the existing doc.
 * Handles optional logo upload to Cloudinary.
 */
exports.updateSettings = async function (req, res) {
  var session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1) Load existing or create new with incoming data
    var settings = await Settings.findOne().session(session);
    var isNew = false;
    if (!settings) {
      settings = new Settings();
      isNew = true;
    }

    // 2) Apply incoming fields
    var body = req.body;
    if (body.storeName !== undefined) settings.storeName = body.storeName;
    if (body.contactEmail !== undefined)
      settings.contactEmail = body.contactEmail;
    if (body.phoneNumber !== undefined) settings.phoneNumber = body.phoneNumber;
    if (body.storeLocation !== undefined)
      settings.storeLocation = body.storeLocation;
    if (body.taxEnabled !== undefined)
      settings.taxEnabled =
        body.taxEnabled === "true" || body.taxEnabled === true;
    if (body.defaultTaxPercentage !== undefined)
      settings.defaultTaxPercentage = parseFloat(body.defaultTaxPercentage);

    // 3) Logo upload if provided
    if (req.file && req.file.buffer) {
      // destroy old
      if (settings.logoPublicId) {
        await cloudinary.uploader
          .destroy(settings.logoPublicId)
          .catch(function () {});
      } else if (settings.logoUrl) {
        try {
          var oldId = extractPublicId(settings.logoUrl);
          await cloudinary.uploader.destroy(oldId);
        } catch (_) {}
      }
      // upload new
      var uploadResult = await uploadToCloudinary(
        req.file.buffer,
        "logo",
        req.file.originalname
      );
      settings.logoUrl = uploadResult.url;
      settings.logoPublicId = uploadResult.public_id;
    }

    // 4) Save (new or updated)
    if (isNew) {
      await settings.save({ session: session });
    } else {
      await settings.save({ session: session });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ success: true, data: settings });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("updateSettings error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};
