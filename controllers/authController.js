const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Doctor = require("../models/Doctor"); // Import the Doctor model
// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userExisting = await User.findOne({ email });
    if (userExisting) {
      return res
        .status(400)
        .json({ message: "User already exists", success: false });
    }

    const newUser = new User({ email, password });
    await newUser.save();
    res.status(201).json({ message: "Registered successfully", success: true });
  } catch (error) {
    // Fixed: Replace this toast with proper backend error response
    res.status(500).json({ message: "Registration failed", success: false });
    console.error("Registration failed", error);
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token and send it as response
    const token = generateToken(user._id);
    const doctor = await Doctor.findOne({ user: user._id });
    // Include user data in the response
    res.status(200).json({
      token,
      user: { id: user._id, email: user.email, role: user.role }, // Send user id and email
      doctor,
      message: "Login successful",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
