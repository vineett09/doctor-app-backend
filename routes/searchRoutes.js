// routes/appointmentRoutes.js
const express = require("express");
const router = express.Router();
const Doctor = require("../models/Doctor");

router.get("/search-doctors", async (req, res) => {
  const { specialty, clinicCity } = req.query;

  try {
    const doctors = await Doctor.find({
      specialty: { $regex: specialty, $options: "i" }, // Case-insensitive match for specialty
      clinicCity: { $regex: clinicCity, $options: "i" }, // Case-insensitive match for clinicCity
      approved: true, // Only approved doctors
    });

    res.json(doctors);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
});

module.exports = router;
