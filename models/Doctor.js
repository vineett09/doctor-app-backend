const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  specialty: { type: String, required: true },
  availability: { type: [String], required: true },
  qualifications: { type: [String], required: true },
  experience: { type: Number, required: true },
  fullAddress: { type: String, required: true },
  clinicAddress: { type: String, required: true },
  clinicCity: { type: String, required: true },
  clinicPinCode: { type: Number, required: true },
  state: { type: String, required: true },
  city: { type: String, required: true },
  pinCode: { type: Number, required: true },
  timings: {
    start: { type: String, required: true },
    end: { type: String, required: true },
  },
  approved: { type: Boolean, default: false }, // Changed default to false
  PhoneNo: { type: Number, required: true },
  profilePic: { type: String }, // New field for profile picture URL
  rating: { type: Number, default: 0 },
  reviewsCount: { type: Number, default: 0 },

  // New field for consultation fee
  consultationFee: { type: Number, required: true },

  // New field for consultation mode (online, offline, or both)
  consultationMode: {
    type: String,
    enum: ["online", "offline", "both"],
    default: "offline", // Default is offline if not specified
  },
});

module.exports = mongoose.model("Doctor", doctorSchema);
