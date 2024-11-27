// services/emailService.js
const nodemailer = require("nodemailer");
require("dotenv").config();

// Create the transport using Mailtrap credentials
const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST,
  port: process.env.MAILTRAP_PORT,
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
});

// Function to send appointment confirmation email
const sendAppointmentEmail = async (
  userEmail,
  doctorName,
  appointmentDate,
  userName
) => {
  // Email to user (patient)
  const userMailOptions = {
    from: "clinic@example.com",
    to: userEmail,
    subject: "Appointment Confirmation",
    text: `
      Dear ${userName},

      Your appointment with Dr. ${doctorName} has been successfully booked for:
      Date: ${appointmentDate}

      Thank you for using our service. We look forward to seeing you!

      Best regards,
      Your Clinic Team
    `,
  };

  // Email to doctor
  const doctorMailOptions = {
    from: "clinic@example.com",
    to: "doctor@example.com", // You can fetch this dynamically from the doctor's profile
    subject: "New Appointment Request",
    text: `
      Hello Dr. ${doctorName},

      You have a new appointment request from ${userName} (email: ${userEmail}). 
      The appointment is scheduled for ${appointmentDate}.

      Please review the request and confirm.

      Best regards,
      Your Clinic Team
    `,
  };

  try {
    // Send emails to both user and doctor
    await transporter.sendMail(userMailOptions);
    await transporter.sendMail(doctorMailOptions);
    console.log("Appointment emails sent!");
  } catch (error) {
    console.error("Error sending emails:", error);
  }
};

module.exports = { sendAppointmentEmail };
