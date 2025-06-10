// controllers/admin/customerController.js
const Order = require("../models/order")

// Capitalize the first letter of a field in the aggregation pipeline
function capitalizeExp(field) {
  return {
    $concat: [
      // uppercase first character
      { $toUpper: { $substrCP: [field, 0, 1] } },
      // append the rest of the string (from index 1 to end)
      {
        $substrCP: [
          field,
          1,
          { $subtract: [{ $strLenCP: [field] }, 1] }
        ]
      },
    ],
  }
}

// ── LIST ──
exports.listCustomers = async (req, res) => {
  try {
    const customers = await Order.aggregate([
      // 1) normalize to lowercase for grouping
      {
        $addFields: {
          lcEmail:     { $toLower: "$email" },
          lcFirstName: { $toLower: "$firstName" },
          lcLastName:  { $toLower: "$lastName" },
        },
      },

      // 2) sort so that the order you want as “primary” is first (e.g. newest)
      { $sort: { lcEmail: 1, createdAt: -1 } },

      // 3) group by normalized email, picking the first doc’s _id as idOrder
      {
        $group: {
          _id:           "$lcEmail",
          idOrder:       { $first: "$_id" },         // <-- primary order’s ID
          firstName:     { $first: "$lcFirstName" },
          lastName:      { $first: "$lcLastName" },
          phone:         { $first: "$phone" },
          address:       {
            $first: {
              $concat: ["$address", ", ", "$city", ", ", "$wilaya"],
            },
          },
          createdAt:     { $first: "$createdAt" },   // use the first (newest) createdAt
          lastOrderDate: { $max:   "$createdAt" },
          orderCount:    { $sum:   1 },
          totalSpent:    { $sum:   "$totals.total" },
        },
      },

      // 4) project into the exact shape the front-end wants
      {
        $project: {
          _id:           0,                          // drop default
          email:         "$_id",                     // normalized email
          idOrder:       1,                          // expose the primary order’s _id
          name: {
            $concat: [
              capitalizeExp("$firstName"),
              " ",
              capitalizeExp("$lastName"),
            ],
          },
          phone:         1,
          address:       1,
          createdAt:     1,
          lastOrderDate: 1,
          orderCount:    1,
          totalSpent:    { $round: ["$totalSpent", 2] },
          status:        { $literal: "active" },
        },
      },

      // 5) sort your customer list newest-first
      { $sort: { createdAt: -1 } },
    ])

    res.json(customers)
  } catch (err) {
    console.error("Error listing customers:", err)
    res.status(500).json({ message: "Internal server error" })
  }
}

// ── PROFILE ──
// GET /api/admin/customers/:email
// GET /api/admin/customers/:idOrder
exports.getCustomerById = async (req, res) => {
  try {
    const idOrder = req.params.idOrder

    const order = await Order.findById(idOrder).lean()
    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    const { email, firstName, lastName, phone, address, city, wilaya, createdAt } = order

    const profile = {
      _id: idOrder,
      name: `${capitalize(firstName)} ${capitalize(lastName)}`,
      email,
      phone,
      address: `${address}, ${city}, ${wilaya}`,
      createdAt,
      status: "active",
    }

    res.json({ profile })
  } catch (err) {
    console.error("Error in getCustomerById:", err)
    res.status(500).json({ message: "Internal server error" })
  }
}


// ── ORDERS ──
// GET /api/admin/customers/:email/orders
// GET /api/admin/customers/:idOrder/orders
exports.getCustomerOrders = async (req, res) => {
  try {
    const idOrder = req.params.idOrder
    const baseOrder = await Order.findById(idOrder).lean()

    if (!baseOrder) {
      return res.status(404).json({ message: "Base order not found" })
    }

    const { email, firstName, lastName, address, phone } = baseOrder

    const orders = await Order.find({
      email,
      firstName,
      lastName,
      address,
      phone,
    })
      .sort({ createdAt: -1 })
      .lean()

    const payload = orders.map((o) => ({
      _id:           o._id,
      orderNumber:   o.orderNumber,
      date:          o.createdAt,
      status:        o.status,
      total:         o.totals.total,
      items:         o.items.length,
      paymentMethod: o.paymentMethod,
    }))

    res.json(payload)
  } catch (err) {
    console.error("Error in getCustomerOrders:", err)
    res.status(500).json({ message: "Internal server error" })
  }
}


// ── STATS ──
// GET /api/admin/customers/:email/stats
// GET /api/admin/customers/:idOrder/stats
exports.getCustomerStats = async (req, res) => {
  try {
    const idOrder = req.params.idOrder
    const baseOrder = await Order.findById(idOrder).lean()

    if (!baseOrder) {
      return res.status(404).json({ message: "Base order not found" })
    }

    const { email, firstName, lastName, address, phone } = baseOrder

    const orders = await Order.find({
      email,
      firstName,
      lastName,
      address,
      phone,
    }).lean()

    if (orders.length === 0) {
      return res.json({
        totalOrders:       0,
        totalSpent:        0,
        averageOrderValue: 0,
        firstOrderDate:    null,
        lastOrderDate:     null,
      })
    }

    const totalOrders = orders.length
    const totalSpent = orders.reduce((sum, o) => sum + (o.totals.total || 0), 0)
    const averageOrderValue = Number((totalSpent / totalOrders).toFixed(2))
    const dates = orders.map((o) => o.createdAt).sort((a, b) => a - b)

    res.json({
      totalOrders,
      totalSpent,
      averageOrderValue,
      firstOrderDate: dates[0],
      lastOrderDate: dates[dates.length - 1],
    })
  } catch (err) {
    console.error("Error in getCustomerStats:", err)
    res.status(500).json({ message: "Internal server error" })
  }
}

// helper for capitalizing a JS string
function capitalize(str = "") {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}
