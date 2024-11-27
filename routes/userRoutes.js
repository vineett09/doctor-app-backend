const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const Doctor = require("../models/Doctor");
const Review = require("../models/Review");
const { createNotification } = require("../middleware/notification");
const Appointment = require("../models/Appointment");

router.get("/approved-appointments", protect, async (req, res) => {
  try {
    const appointments = await Appointment.find({
      user: req.user.id, // Assuming req.user is set by your protect middleware
      status: "approved",
    }).populate("doctor", "name"); // Assuming you want to populate doctor's name

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
});

// POST a new review for a doctor
router.post("/submit-reviews/:doctorId", protect, async (req, res) => {
  const { text, rating } = req.body;
  const doctorId = req.params.doctorId;

  if (!text || !rating) {
    return res
      .status(400)
      .json({ message: "Review text and rating are required" });
  }

  try {
    // Create a new review
    const newReview = new Review({
      doctorId,
      userId: req.user.id, // Assuming req.user is populated by authMiddleware
      text,
      rating,
    });

    // Save the review
    const savedReview = await newReview.save();

    // Update the doctor's rating and review count
    const doctor = await Doctor.findById(doctorId);
    doctor.reviewsCount += 1;
    doctor.rating =
      (doctor.rating * (doctor.reviewsCount - 1) + rating) /
      doctor.reviewsCount;
    await doctor.save();

    // Send a notification to the doctor
    await createNotification(
      doctor.user._id, // Doctor's user ID
      "reviews",
      `You have received a new review from ${req.user.email}`,
      {
        email: req.user.email,
        rating,
        text,
      }
    );

    res.status(201).json(savedReview);
  } catch (error) {
    res.status(500).json({ message: "Failed to post review", error });
  }
});

// GET reviews for a specific doctor
router.get("/reviews/:doctorId", async (req, res) => {
  const doctorId = req.params.doctorId;

  try {
    const reviews = await Review.find({ doctorId })
      .populate("userId", "firstName lastName") // Populate user info if needed
      .sort({ createdAt: -1 }); // Sort by most recent

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch reviews", error });
  }
});

module.exports = router;
