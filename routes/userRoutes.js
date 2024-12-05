const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const Doctor = require("../models/Doctor");
const Review = require("../models/Review");
const { createNotification } = require("../middleware/notification");
const Appointment = require("../models/Appointment");

//get all approved appointments for user

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

//get all completed appointments for user
router.get("/completed-appointments", protect, async (req, res) => {
  try {
    const appointments = await Appointment.find({
      user: req.user.id, // Assuming req.user is set by your protect middleware
      status: "completed",
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

// Get appointments by status for user
router.get("/appointments/:status", protect, async (req, res) => {
  try {
    const validStatuses = [
      "pending",
      "approved",
      "completed",
      "cancelled",
      "rescheduled",
    ];
    const { status } = req.params;

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ msg: "Invalid appointment status" });
    }

    const appointments = await Appointment.find({
      user: req.user.id,
      status: status,
    })
      .populate("doctor", "firstName lastName email")
      .sort({ appointmentDate: -1 }); // Sort by date, newest first

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
});

// Get all active appointments (pending, approved, rescheduled)
router.get("/active-appointments", protect, async (req, res) => {
  try {
    const appointments = await Appointment.find({
      user: req.user.id,
      status: { $in: ["pending", "approved", "rescheduled"] },
    })
      .populate("doctor", "firstName lastName email")
      .sort({ appointmentDate: 1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
});

// Get completed appointments
router.get("/completed-appointments", protect, async (req, res) => {
  try {
    const appointments = await Appointment.find({
      user: req.user.id,
      status: "completed",
    })
      .populate("doctor", "firstName lastName email")
      .sort({ completedAt: -1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
});

// Cancel appointment by user
router.patch("/appointments/:id/cancel", protect, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate("doctor", "firstName lastName user");

    if (!appointment) {
      return res.status(404).json({ msg: "Appointment not found" });
    }

    // Check if appointment can be cancelled
    if (["completed", "cancelled"].includes(appointment.status)) {
      return res.status(400).json({
        msg: `Cannot cancel appointment that is already ${appointment.status}`,
      });
    }

    appointment.status = "cancelled";
    await appointment.save();

    // Notify doctor about cancellation
    const notificationMessage = `Appointment scheduled for ${new Date(
      appointment.appointmentDate
    ).toLocaleString()} has been cancelled by the patient.`;

    await createNotification(
      appointment.doctor.user,
      "appointment_cancelled",
      notificationMessage
    );

    res.json({
      msg: "Appointment cancelled successfully",
      appointment,
    });
  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
});

// Request appointment reschedule
router.patch(
  "/appointments/:id/reschedule-request",
  protect,
  async (req, res) => {
    const { newAppointmentDate } = req.body;

    try {
      const appointment = await Appointment.findOne({
        _id: req.params.id,
        user: req.user.id,
      }).populate("doctor", "firstName lastName user");

      if (!appointment) {
        return res.status(404).json({ msg: "Appointment not found" });
      }

      if (["completed", "cancelled"].includes(appointment.status)) {
        return res.status(400).json({
          msg: `Cannot reschedule appointment that is ${appointment.status}`,
        });
      }

      // Update appointment
      appointment.requestedNewDate = newAppointmentDate;
      appointment.status = "reschedule_requested";
      await appointment.save();

      // Notify doctor about reschedule request
      const formattedNewDate = new Date(newAppointmentDate).toLocaleString(
        "en-US",
        {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour24: true,
        }
      );

      await createNotification(
        appointment.doctor.user,
        "reschedule_requested",
        `Patient has requested to reschedule appointment to ${formattedNewDate}`
      );

      res.json({
        msg: "Reschedule request sent successfully",
        appointment,
      });
    } catch (error) {
      res.status(500).json({ msg: "Server error" });
    }
  }
);

module.exports = router;
