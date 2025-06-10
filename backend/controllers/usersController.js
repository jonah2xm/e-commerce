const User = require("../models/usersModel.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  sendWelcomeEmail,
  sendResetPasswordEmail,
} = require("../services/mailService");
const crypto = require("crypto");
// Register user
exports.registerUser = async (req, res) => {
  console.log("req.body", req.body);
  try {
    const { firstName, lastName, email, password, role = "user" } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
    });
    //email sending
    await sendWelcomeEmail(email, firstName);
    // Create token
    const token = jwt.sign(
      {
        userId: newUser._id,
        role: newUser.role,
        isSuperAdmin: newUser.isSuperAdmin,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Set HttpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Login user
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id, role: user.role, isSuperAdmin: user.isSuperAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful",
      userId: user._id,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get current user
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
exports.logoutUser = (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logged out successfully" });
};

exports.handleForgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ message: "No account found with that email." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Save token & expiry to user
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 30; // 30 mins
    await user.save();

    // Send mail
    const resetUrl = `http://localhost:3000/account/reset-password/${resetToken}`; // Frontend link
    await sendResetPasswordEmail(user.email, resetUrl);

    return res.status(200).json({ message: "Reset link sent to email" });

    // Optional: Check if account is verified
    // if (!user.emailVerified) {
    //   return res.status(403).json({ message: "Please verify your email first." });
    // }

    return res
      .status(200)
      .json({ message: "Email is valid. Proceed with reset." });
  } catch (err) {
    console.error("Error verifying email:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  console.log("req.body", token);
  if (!token || !password) {
    return res
      .status(400)
      .json({ message: "Token and new password are required." });
  }

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user by token and ensure it's not expired
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Clear reset token and expiry
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    res.status(200).json({ message: "Password reset successful." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Something went wrong." });
  }
};

exports.createUserAddress = async function (req, res) {
  try {
    const id = req.user.userId;
    const addressData = req.body;
    // e.g. { firstName, lastName, address, apartment, city, state, zipCode, wilaya, commune, phone }

    // 1) Find the user
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // 2) Push the new address sub‐document
    user.addresses.push(addressData);
    await user.save();

    // 3) Return the newly added address (last element)
    const newAddr = user.addresses[user.addresses.length - 1];
    return res.status(201).json({ success: true, data: newAddr });
  } catch (err) {
    console.error("createUserAddress error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deleteUserAddress = async function (req, res) {
  try {
    const { addressId } = req.params;
    const id = req.user.userId;

    // 1) Pull the address subdoc
    const user = await User.findByIdAndUpdate(
      id,
      { $pull: { addresses: { _id: addressId } } },
      { new: true }
    );
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, data: user.addresses });
  } catch (err) {
    console.error("deleteUserAddress error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getUserAddress = async (req, res) => {
  try {
    console.log("req.boddy", req.body);
    const userId = req.user.userId; // Assumes authentication middleware adds `req.user`

    const user = await User.findById(userId).select("addresses"); // Only select addresses

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ addresses: user.addresses });
  } catch (error) {
    console.error("Error fetching user address:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.setUserDefaultAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { addressId } = req.params;

    // 1) Load user with addresses
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2) Ensure the address belongs to this user
    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    // 3) Flip defaults: target = true, others = false
    user.addresses.forEach((addr) => {
      addr.isDefault = addr._id.equals(addressId);
    });

    // 4) Save and return
    await user.save();
    return res.status(200).json({ addresses: user.addresses });
  } catch (error) {
    console.error("Error setting default address:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.changePassword = async (req, res) => {
  console.log("req.body", req.body);
  try {
    const userId = req.user.userId; // from your auth middleware
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // 1. Basic validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required." });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New passwords do not match." });
    }
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters." });
    }

    // 2. Load user
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // 3. Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }

    // 4. Hash and set new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // 5. Save user
    await user.save();

    return res
      .status(200)
      .json({ success: true, message: "Password changed successfully." });
  } catch (err) {
    console.error("Error in changePassword:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { firstName, lastName, email } = req.body;

    // Basic validation
    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        message: "firstName, lastName, and email are all required.",
      });
    }

    // Check if email is already taken by another user (optional but recommended)
    const emailTaken = await User.findOne({ email, _id: { $ne: userId } });
    if (emailTaken) {
      return res.status(409).json({ message: "Email is already in use." });
    }

    // Find user by ID and update only the allowed fields
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, email },
      { new: true, runValidators: true }
    ).select("-password"); // omit password from response (if you store it)

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({
      message: "User updated successfully.",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Error in updateUser:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};
