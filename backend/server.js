const dotenv = require("dotenv"); // Loads environment variables from .env
const cookieParser = require("cookie-parser");
const express = require("express");
const mongoose = require("mongoose");
const authRoutes = require("./routes/protected/authRoutes");
const categoryRoutes = require("./routes/protected/categoryRoutes");
const productRoutes = require("./routes/protected/poductRoutes");
const ordersRoutes = require("./routes/protected/orderRoutes");
const customerRoutes = require("./routes/protected/customerRoutes");
const inventroyRoutes = require("./routes/protected/inventroyRoutes");
const saleRoutes = require("./routes/protected/saleRoutes");
const settingsRoutes=require('./routes/protected/settingsRoutes')
const heroBannerRoutes=require('./routes/protected/heroBannerRoutes')
const userAddresseRoutes=require('./routes/protected/userAddressRoutes')
const userRoutes = require("./routes/protected/userRoutes");
const wishlistRoutes = require("./routes/protected/wishlistRoutes");
const promotionalPanelRoutes = require("./routes/protected/promotionalPanelRoutes");
// Public routes


const publicCategoryRoutes = require("./routes/public/publicCategoryRoutes");
const publicProductRoutes = require("./routes/public/publicProductRoutes");
const publicOrderRoutes = require("./routes/public/publicOrderRoutes");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
dotenv.config();
app.use(cookieParser());
// Connect to MongoDB using Mongoose

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));
//json
app.use(express.json());
// cors
app.use(
  cors({
    origin: "http://localhost:3000", // frontend domain
    credentials: true,
  })
);
// auth route
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/inventory", inventroyRoutes);
app.use("/api/sales", saleRoutes);
app.use('/api/settings',settingsRoutes)
app.use('/api/heroBanner',heroBannerRoutes)
app.use('/api/userAddress',userAddresseRoutes)
app.use("/api/users", userRoutes);  
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/promotionalPanel", promotionalPanelRoutes);
// Public routes
app.use("/api/public/products", publicProductRoutes);
app.use("/api/public/categories", publicCategoryRoutes);
app.use("/api/public/orders", publicOrderRoutes);
// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
