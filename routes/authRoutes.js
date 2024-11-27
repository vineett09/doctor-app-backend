const express = require("express");
const { register, login } = require("../controllers/authController");
const {
  validateRegister,
  validateLogin,
} = require("../middleware/validationMiddleware");

const router = express.Router();

// Registration route with validation middleware
router.post("/register", validateRegister, register);

// Login route with validation middleware
router.post("/login", validateLogin, login);

module.exports = router;
