const express = require("express");
const router = express.Router();
const Appointment = require("../models/Appointment");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");
const Doctor = require("../models/Doctor");
const mongoose = require("mongoose");
const { createNotification } = require("../middleware/notification");
const { sendAppointmentEmail } = require("../server/services");

// Fetch only approved doctors
router.get("/doctors", async (req, res) => {
  try {
    const approvedDoctors = await Doctor.find({ approved: true }).populate(
      "user",
      "email"
    );
    if (!approvedDoctors.length) {
      return res.status(404).json({ msg: "No approved doctors found" });
    }
    res.json(approvedDoctors);
  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
});

// Book an appointment
router.post("/book", protect, async (req, res) => {
  const { doctorId, appointmentDate } = req.body;
  try {
    // Check if the doctor exists and is approved
    const doctor = await Doctor.findById(doctorId);
    if (!doctor || !doctor.approved) {
      return res.status(400).json({ msg: "Invalid or unapproved doctor" });
    }

    // Create the appointment
    const appointment = new Appointment({
      user: req.user._id,
      doctor: doctor._id,
      appointmentDate,
    });
    await appointment.save();

    // Send email notifications to both the user and doctor
    await sendAppointmentEmail(
      req.user.email, // User's email
      doctor.firstName, // Doctor's name (assuming `name` is a field in Doctor schema)
      appointmentDate, // Appointment date
      req.user.email // User's name (assuming `name` is a field in User schema)
    );

    // Notify the doctor via your notification system
    await createNotification(
      doctor.user,
      "appointment",
      `New appointment request from user ${req.user.email}`
    );

    // Notify the user about the appointment request
    await createNotification(
      req.user._id,
      "appointment",
      "Your appointment request has been sent."
    );

    // Return response to the frontend
    res.json({ msg: "Appointment booked successfully", appointment });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get a specific doctor's profile by ID
router.get("/:id", async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Update doctor's profile
router.put("/:id", protect, async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ msg: "Doctor not found" });
    }

    const updates = req.body;
    Object.assign(doctor, updates);
    await doctor.save();

    res.json({ msg: "Profile updated successfully", doctor });
  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
});

// Get appointments for a specific doctor
router.get("/doctor/:id", protect, async (req, res) => {
  try {
    const appointments = await Appointment.find({
      doctor: req.params.id,
      status: "pending",
    }).populate("user", "email");
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
});

//Get appointments data from approved appointment

router.get("/doctor/approved-appointments/:id", protect, async (req, res) => {
  try {
    const appointments = await Appointment.find({
      doctor: req.params.id,
      responseStatus: "approved",
    }).populate("user", "email");
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
});

// Doctor approves or rejects an appointment
router.patch("/respond/:id", protect, async (req, res) => {
  const { status, message } = req.body;
  try {
    const appointment = await Appointment.findById(req.params.id).populate(
      "user",
      "email"
    );
    if (!appointment) {
      return res.status(404).json({ msg: "Appointment not found" });
    }
    appointment.responseStatus = status;
    appointment.responseMessage = message;
    appointment.status = status === "approved" ? "approved" : "rejected";
    await appointment.save();

    // Format the appointment date to remove time zone information
    const formattedDate = new Date(appointment.appointmentDate).toLocaleString(
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

    // Notify the user
    await createNotification(
      appointment.user._id,
      "appointment",
      `Your appointment request for ${formattedDate} has been ${status}. Response message: ${message}`
    );

    res.json({ msg: "Appointment updated", appointment });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Mark appointment as completed
router.patch("/appointment/:id/complete", protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    appointment.status = "completed";
    appointment.completedAt = new Date();
    await appointment.save();

    // Notify user about completion
    await createNotification(
      appointment.user,
      "appointment_completed",
      `Your appointment scheduled for ${new Date(
        appointment.appointmentDate
      ).toLocaleString()} has been marked as completed.`
    );

    res.json({ message: "Appointment marked as completed", appointment });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get completed appointments for a doctor
router.get("/doctor/completed-appointments/:id", protect, async (req, res) => {
  try {
    const appointments = await Appointment.find({
      doctor: req.params.id,
      status: "completed",
    }).populate("user", "email");
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
});

// Cancel appointment
router.patch("/appointment/:id/cancel", protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    appointment.status = "cancelled";
    await appointment.save();

    // Notify user about cancellation
    await createNotification(
      appointment.user,
      "appointment_cancelled",
      `Your appointment scheduled for has been cancelled for some reasons.`
    );

    res.json({ message: "Appointment cancelled successfully", appointment });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get cancelled appointments for a doctor
router.get("/doctor/cancelled-appointments/:id", protect, async (req, res) => {
  try {
    const appointments = await Appointment.find({
      doctor: req.params.id,
      status: "cancelled",
    }).populate("user", "email");
    res.json(appointments);
  } catch (error) {
    console.error("Error fetching cancelled appointments:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Reschedule appointment
router.patch("/appointments/:id/reschedule", protect, async (req, res) => {
  const { newAppointmentDate } = req.body;

  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    appointment.appointmentDate = newAppointmentDate;
    appointment.status = "rescheduled";
    await appointment.save();

    // Notify user about rescheduling
    await createNotification(
      appointment.user,
      "appointment_rescheduled",
      `Your appointment has been rescheduled to ${new Date(
        newAppointmentDate
      ).toLocaleString()}.`
    );

    res.json({ message: "Appointment rescheduled successfully", appointment });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
// Get rescheduled appointments for a doctor
router.get(
  "/doctor/rescheduled-appointments/:id",
  protect,
  async (req, res) => {
    try {
      const appointments = await Appointment.find({
        doctor: req.params.id,
        status: "rescheduled",
      }).populate("user", "email");
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching cancelled appointments:", error);
      res.status(500).json({ msg: "Server error" });
    }
  }
);
// Get appointments by status
router.get("/doctor/:id/appointments/:status", protect, async (req, res) => {
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
      doctor: req.params.id,
      status: status,
    })
      .populate("user", "email")
      .sort({ appointmentDate: -1 }); // Sort by date, newest first

    res.json(appointments);
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
