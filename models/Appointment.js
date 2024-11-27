const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
    required: true,
  },
  appointmentDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  responseStatus: {
    type: String,
    enum: ["approved", "rejected"],
    default: null,
  },
  responseMessage: { type: String, default: "" },
});

module.exports = mongoose.model("Appointment", appointmentSchema);
