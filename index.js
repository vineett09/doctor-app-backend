const express = require("express");
const http = require("http");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const cloudinary = require("./cloudinaryConfig"); // Path to your Cloudinary config

dotenv.config(); // Load environment variables

const doctorRoutes = require("./routes/doctorRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const searchRoutes = require("./routes/searchRoutes");
const notificationRoutes = require("./routes/notificationRoutes"); // Import notification routes

const userRoutes = require("./routes/userRoutes"); // Import review routes

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "profile_pics", // Folder name in Cloudinary
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const upload = multer({ storage });
const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json()); // Middleware to parse JSON
app.use(bodyParser.json());

// Routes
app.use("/api/appointments", doctorRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/doctor-requests", adminRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/notifications", notificationRoutes); // Add notification routes
app.use("/api/reviews", userRoutes); // Add review routes

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message });
});

// Define image upload route
app.post("/api/upload-profile-pic", upload.single("image"), (req, res) => {
  res.status(200).json({
    message: "Image uploaded successfully",
    url: req.file.path, // URL of the uploaded image
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
