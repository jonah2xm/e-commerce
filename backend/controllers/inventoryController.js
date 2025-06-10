const StockEntry = require("../models/stockEntryModel")
const Product    = require("../models/productModel")   // your existing Product model
const User       = require("../models/usersModel")
// Helper to build next reference: "YYYY-MM-N"
async function getNextReference(date) {
  const year  = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const prefix = `${year}-${month}`

  const last = await StockEntry.findOne({ reference: new RegExp(`^${prefix}-\\d+$`) })
    .sort({ reference: -1 })
    .lean()

  let nextSeq = 1
  if (last) {
    const parts = last.reference.split("-")
    const seq = parseInt(parts[2], 10)
    if (!isNaN(seq)) nextSeq = seq + 1
  }

  return `${prefix}-${nextSeq}`
}

// POST /api/admin/inventory
exports.createStockEntry = async (req, res) => {
  const session = await StockEntry.startSession()
  session.startTransaction()

  try {
    const { date: dateStr, notes, items,createdBy } = req.body
    const entryDate = new Date(dateStr)
    if (isNaN(entryDate)) {
      await session.abortTransaction()
      return res.status(400).json({ message: "Invalid date" })
    }
    
    // 1) generate reference
    const reference = await getNextReference(entryDate)

    // 2) create the stock entry
    const newEntry = await StockEntry.create([{
      reference,
      date:      entryDate,
      notes,
      items,
      createdBy,
    }], { session })

    // 3) for each item, update the product variant's stock
    for (const item of items) {
      await Product.updateOne(
        { _id: item.productId, "variants._id": item.variantId },
        {
          $set: { "variants.$.stock": item.newStock }
        },
        { session }
      )
    }

    await session.commitTransaction()
    session.endSession()

    res.status(201).json(newEntry[0])
  } catch (err) {
    await session.abortTransaction()
    session.endSession()

    console.error("Error creating stock entry:", err)
    if (err.code === 11000 && err.keyPattern?.reference) {
      return res.status(409).json({ message: "Reference conflict, please retry" })
    }
    res.status(500).json({ message: "Internal server error" })
  }
}

// GET /api/admin/inventory


exports.listStockEntries = async (req, res) => {
  try {
    // 1) Fetch entries, populating createdBy → { firstName, lastName }
    const entries = await StockEntry.find()
      .sort({ date: -1 })
      .populate({
        path: "createdBy",
        select: "firstName lastName",       // only these two fields
      })
      .lean()

    // 2) Project each entry so createdBy becomes { firstName, lastName } instead of the full user object
    const result = entries.map((e) => ({
      ...e,
      createdByFirstName: e.createdBy?.firstName || null,
      createdByLastName:  e.createdBy?.lastName  || null,
      // If you prefer to keep createdBy as an object:
      // createdBy: {
      //   firstName: e.createdBy?.firstName,
      //   lastName:  e.createdBy?.lastName,
      // },
    }))

    res.json(result)
  } catch (err) {
    console.error("Error listing stock entries:", err)
    res.status(500).json({ message: "Internal server error" })
  }
}

exports.updateStockEntry = async (req, res) => {
  const session = await StockEntry.startSession();
  session.startTransaction();

  try {
    const entryId = req.params.id;
    const { date: dateStr, notes, items } = req.body;
    const entryDate = new Date(dateStr);

    if (isNaN(entryDate)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Invalid date" });
    }

    // 1) Load the existing entry (with its old items)
    const existing = await StockEntry.findById(entryId).session(session);
    if (!existing) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Stock entry not found" });
    }

    // 2) Revert stock for each old item back to its previousStock
    for (const oldItem of existing.items) {
      await Product.updateOne(
        { _id: oldItem.productId, "variants._id": oldItem.variantId },
        { $set: { "variants.$.stock": oldItem.previousStock } },
        { session }
      );
    }

    // 3) Update entry fields
    existing.date  = entryDate;
    existing.notes = notes;
    existing.items = items;      // items must include: productId, variantId, previousStock, quantity, newStock, etc.
    await existing.save({ session });

    // 4) Apply new stock for each new item
    for (const newItem of items) {
      await Product.updateOne(
        { _id: newItem.productId, "variants._id": newItem.variantId },
        { $set: { "variants.$.stock": newItem.newStock } },
        { session }
      );
    }

    // 5) Commit & return
    await session.commitTransaction();
    session.endSession();

    // Optionally, populate createdBy here if you want to return that info:
    const updatedEntry = await StockEntry.findById(entryId)
      .populate({ path: "createdBy", select: "firstName lastName" })
      .lean();

    res.json(updatedEntry);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    console.error("Error updating stock entry:", err);
    // Handle unique-reference conflicts if you allow updating reference separately
    if (err.code === 11000 && err.keyPattern?.reference) {
      return res.status(409).json({ message: "Reference conflict, please retry" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};
// GET /api/admin/inventory/:id
exports.getStockEntryById = async (req, res) => {
  try {
    // 1) Fetch the entry by ID, populate createdBy with just firstName & lastName
    const entry = await StockEntry.findById(req.params.id)
      .populate({
        path: "createdBy",
        select: "firstName lastName"
      })
      .lean();

    if (!entry) {
      return res.status(404).json({ message: "Stock entry not found" });
    }

    // 2) Project the populated createdBy into simple fields
    const result = {
      ...entry,
      createdByFirstName: entry.createdBy?.firstName || null,
      createdByLastName:  entry.createdBy?.lastName  || null,
      // If you’d rather keep createdBy as an object:
      // createdBy: {
      //   firstName: entry.createdBy?.firstName || null,
      //   lastName:  entry.createdBy?.lastName  || null,
      // },
    };

    res.json(result);
  } catch (err) {
    console.error("Error fetching stock entry:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};


exports.deleteStockEntry = async (req, res) => {
  const session = await StockEntry.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    // 1) Load the entry (with items) within the transaction
    const entry = await StockEntry.findById(id).session(session);
    if (!entry) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Stock entry not found" });
    }
    console.log('entry',entry)
    // 2) Revert each item's stock on its product variant
    for (const item of entry.items) {
      console.log(item)
      await Product.updateOne(
        { _id: item.productId, "variants._id": item.variantId },
        { $inc: { "variants.$.stock": -item.quantity } },
        { session }
      );
    }

    // 3) Delete the stock entry
    await StockEntry.findByIdAndDelete(id).session(session);

    // 4) Commit
    await session.commitTransaction();
    session.endSession();

    res.json({ message: "Deleted successfully and stock reverted" });
  } catch (err) {
    // abort on error
    await session.abortTransaction();
    session.endSession();

    console.error("Error deleting stock entry:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};