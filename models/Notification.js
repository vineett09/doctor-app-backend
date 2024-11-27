const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: ["appointment", "doctor_request", "general", "reviews"],
    required: true,
  },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  userDetails: {
    email: { type: String },
  }, // Include user details
});

module.exports = mongoose.model("Notification", notificationSchema);
