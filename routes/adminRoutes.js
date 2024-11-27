const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");
const Doctor = require("../models/Doctor");
const isAdmin = require("../middleware/admin");
const upload = require("../middleware/upload");
const { createNotification } = require("../middleware/notification");

// Doctor request route
router.post(
  "/request",
  [protect, upload.single("profilePic")],
  async (req, res) => {
    const {
      firstName,
      lastName,
      specialty,
      availability,
      qualifications,
      experience,
      fullAddress,
      clinicAddress,
      clinicCity,
      clinicPinCode,
      state,
      city,
      pinCode,
      timings,
      PhoneNo,
      consultationFee,
      consultationMode,
    } = req.body;

    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ msg: "User not found" });

      if (user.role === "doctor") {
        return res.status(400).json({ msg: "You are already a doctor" });
      }

      const newDoctor = new Doctor({
        user: user._id,
        firstName,
        lastName,
        specialty,
        availability,
        qualifications,
        experience,
        fullAddress,
        clinicAddress,
        clinicCity,
        clinicPinCode,
        state,
        city,
        pinCode,
        timings,
        PhoneNo,
        consultationFee,
        consultationMode,
        approved: false,
        profilePic: req.file ? req.file.path : null,
      });

      await newDoctor.save();

      // Notify admin about new doctor request
      const admins = await User.find({ role: "admin" });
      admins.forEach((admin) => {
        createNotification(
          admin._id,
          "doctor_request",
          `New doctor request has arrived from ${user.email}.`,
          {
            email: user.email,
          }
        );
      });

      res.json({ msg: "Doctor request submitted successfully." });
    } catch (error) {
      console.error("Error submitting doctor request:", error);
      res.status(500).json({ msg: "Server error", error: error.message });
    }
  }
);

// Admin gets list of doctor requests
router.get("/requests", [protect, isAdmin], async (req, res) => {
  try {
    const doctorRequests = await Doctor.find({ approved: false }).populate(
      "user",
      "email firstName lastName"
    );

    if (!doctorRequests.length) {
      return res.status(404).json({ msg: "No doctor requests found" });
    }

    res.json(doctorRequests);
  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
});

// Admin approves or rejects a request
router.post(
  "/requests/:doctorId/approve",
  [protect, isAdmin],
  async (req, res) => {
    try {
      const doctor = await Doctor.findById(req.params.doctorId).populate(
        "user"
      );
      if (!doctor)
        return res.status(404).json({ msg: "Doctor request not found" });

      const { approved } = req.body;

      if (approved) {
        doctor.approved = true;
        await doctor.save();

        const user = doctor.user;
        user.role = "doctor";
        user.doctorProfile.approved = true;
        await user.save();

        // Notify the user
        await createNotification(
          user._id,
          "doctor_request",
          "Your doctor request has been approved.",
          {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
          }
        );

        res.json({ msg: "Doctor request approved successfully." });
      } else {
        await Doctor.findByIdAndDelete(doctor._id);

        // Notify the user
        await createNotification(
          doctor.user._id,
          "doctor_request",
          "Your doctor request has been rejected.",
          {
            firstName: doctor.user.firstName,
            lastName: doctor.user.lastName,
            email: doctor.user.email,
          }
        );

        res.json({ msg: "Doctor request has been rejected." });
      }
    } catch (error) {
      res.status(500).json({ msg: "Server error" });
    }
  }
);

router.get("/doctors/stats", [protect, isAdmin], async (req, res) => {
  try {
    const stats = await Doctor.aggregate([
      {
        $group: {
          _id: null,
          totalDoctors: { $sum: 1 },
          approvedDoctors: {
            $sum: { $cond: [{ $eq: ["$approved", true] }, 1, 0] },
          },
          pendingApprovals: {
            $sum: { $cond: [{ $eq: ["$approved", false] }, 1, 0] },
          },
          specialties: { $addToSet: "$specialty" },
        },
      },
      {
        $project: {
          _id: 0,
          totalDoctors: 1,
          approvedDoctors: 1,
          pendingApprovals: 1,
          specialtiesCount: { $size: "$specialties" },
        },
      },
    ]);

    res.json(
      stats[0] || {
        totalDoctors: 0,
        approvedDoctors: 0,
        pendingApprovals: 0,
        specialtiesCount: 0,
      }
    );
  } catch (error) {
    console.error("Error fetching doctor statistics:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
});

// Then the approved doctors route
router.get("/doctors/approved", [protect, isAdmin], async (req, res) => {
  try {
    const approvedDoctors = await Doctor.find({ approved: true })
      .populate("user", "email firstName lastName")
      .select("-__v")
      .sort({ createdAt: -1 });

    if (!approvedDoctors.length) {
      return res.status(404).json({ msg: "No approved doctors found" });
    }

    res.json({
      count: approvedDoctors.length,
      doctors: approvedDoctors,
    });
  } catch (error) {
    console.error("Error fetching approved doctors:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
});

// Finally the specific doctor route
router.get("/doctors/:doctorId", [protect, isAdmin], async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.doctorId)
      .populate("user", "email firstName lastName")
      .select("-__v");

    if (!doctor) {
      return res.status(404).json({ msg: "Doctor not found" });
    }

    res.json(doctor);
  } catch (error) {
    console.error("Error fetching doctor details:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
});

module.exports = router;
