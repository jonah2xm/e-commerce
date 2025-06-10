// controllers/salesController.js

const Sale = require("../models/saleModel");

/**
 * POST /api/sales
 * Body should be your `saleData` object:
 * {
 *   items: [...],
 *   paymentMethod,
 *   subtotal,
 *   discountedSubtotal,
 *   taxAmount,
 *   total,
 *   amountTendered?,
 *   changeDue?,
 *   timestamp
 * }
 */
exports.createSale = async (req, res) => {
  try {
    const data = req.body;
    const now = new Date();

    // 1) Build month‐seq saleNumber
    const year = now.getFullYear();
    const monthIndex = now.getMonth();
    const monthNum = String(monthIndex + 1).padStart(2, "0");
    const startOfMonth = new Date(year, monthIndex, 1);
    const startOfNext = new Date(year, monthIndex + 1, 1);
    const countThisMonth = await Sale.countDocuments({
      createdAt: { $gte: startOfMonth, $lt: startOfNext },
    });
    const orderNumber = `${year}-${monthNum}-${countThisMonth + 1}`;

    // 2) Assemble & save sale document
    const sale = new Sale({
      saleNumber: orderNumber,
      items: data.items,               // expects [{ variantId, quantity, ...}, …]
      paymentMethod: data.paymentMethod,
      subtotal: data.subtotal,
      discountedSubtotal: data.discountedSubtotal,
      taxAmount: data.taxAmount,
      total: data.total,
      amountTendered: data.amountTendered,
      changeDue: data.changeDue,
      timestamp: data.timestamp || now,
      status: "completed",             // or default from model
    });

    // 3) Decrement stock for each item
    await Promise.all(data.items.map(async (item) => {
      const { variantId, quantity } = item;
      if (!variantId || !quantity) return;
      const variant = await ProductVariant.findById(variantId);
      if (!variant) {
        throw new Error(`Variant ${variantId} not found`);
      }
      if (variant.stock < quantity) {
        throw new Error(`Insufficient stock for variant ${variantId}`);
      }
      variant.stock -= quantity;
      await variant.save();
    }));

    // 4) Finally save the sale
    await sale.save();

    // 5) Respond
    return res.status(201).json({
      success: true,
      orderNumber,
      timestamp: sale.timestamp.toISOString(),
      sale,
    });
  } catch (err) {
    console.error("createSale failed:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message });
  }
};

/**
 * GET /api/sales/:id
 * Retrieve one sale by ID
 */
exports.getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).lean();
    if (!sale) {
      return res.status(404).json({ success: false, error: "Sale not found" });
    }
    return res.json(sale);
  } catch (err) {
    console.error("getSaleById failed:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * (Optional) GET /api/sales
 * List recent sales, with pagination
 */
exports.listSales = async (req, res) => {
  try {
    const { page = 1, limit = 25 } = req.query;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Sale.find().sort({ timestamp: -1 }).skip(skip).limit(+limit).lean(),
      Sale.countDocuments(),
    ]);
    return res.json({
      success: true,
      sales: items,
      meta: { total, page: +page, limit: +limit },
    });
  } catch (err) {
    console.error("listSales failed:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAllSales = async (req, res) => {
  try {
    const sales = await Sale.find().sort({ createdAt: -1 }); // Most recent first
    res.status(200).json(sales);
  } catch (error) {
    console.error("Error fetching sales:", error);
    res.status(500).json({ message: "Failed to fetch sales" });
  }
};

exports.updateSaleStatus = async (req, res) => {
  const { id } = req.params;
  const { status: newStatus } = req.body;

  // Validate new status
  if (!newStatus || !ALLOWED_STATUSES.includes(newStatus)) {
    return res.status(400).json({
      message: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}`,
    });
  }

  try {
    // 1) Find the existing sale
    const sale = await Sale.findById(id);
    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }
    const oldStatus = sale.status;

    // 2) If no change, nothing to do
    if (oldStatus === newStatus) {
      return res.json(sale);
    }

    // 3) If moving to "refunded", add quantities back to stock
    if (newStatus === "refunded" && oldStatus !== "refunded") {
      await Promise.all(sale.items.map(async (item) => {
        const variant = await ProductVariant.findById(item.variantId);
        if (!variant) {
          console.warn(`Variant ${item.variantId} not found for refund`);
          return;
        }
        variant.stock += item.quantity;
        await variant.save();
      }));
    }

    // 4) If moving *away* from refunded to something else, re-decrement stock
    //    (e.g. from "refunded" back to "completed")
    if (oldStatus === "refunded" && newStatus !== "refunded") {
      await Promise.all(sale.items.map(async (item) => {
        const variant = await ProductVariant.findById(item.variantId);
        if (!variant) {
          console.warn(`Variant ${item.variantId} not found to re-deduct`);
          return;
        }
        // Ensure we don't go negative
        variant.stock = Math.max(0, variant.stock - item.quantity);
        await variant.save();
      }));
    }

    // 5) Update status and save
    sale.status = newStatus;
    await sale.save();

    // 6) Return updated sale
    return res.json(sale);
  } catch (err) {
    console.error("Error updating sale status:", err);
    return res.status(500).json({ message: "Server error" });
  }
};