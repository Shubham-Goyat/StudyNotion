const mongoose = require("mongoose");
const mailSender = require("../utils/mailSender");
const emailTemplate = require("../mail/templates/emailVerificationTemplate");
const OTPSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 5, // The document will be automatically deleted after 5 minutes of its creation time
  },
});

/* ORDER OF SENDING A MAIL------------------------------------------------------------->
1. Client submits email → Controller calls OTP.create(otpPayload)                  (Auth.js m otp wala code)
2. Mongoose triggers pre("save") middleware BEFORE database save
3. pre("save") calls sendVerificationEmail() → mailSender() sends OTP via email
4. After email sent, next() called → OTP document saved to database
5. Success response sent to client with OTP (for testing/development)

mtlb OTP.create() → pre("save") middleware triggers → Email sent via mailSender() → Database save → Response to client
*/

// a function to send emails
async function sendVerificationEmail(email, otp) {
  // Create a transporter to send emails

  // Define the email options

  // Send the email
  try {
    const mailResponse = await mailSender(
      email,
      "Verification Email",
      emailTemplate(otp),
    );
    console.log("Email sent successfully: ", mailResponse.response);
  } catch (error) {
    console.log("Error occurred while sending email: ", error);
    throw error;
  }
}

// here next means just goto next middleware when u finished this
// (we can remove next cause we are already using async await)
OTPSchema.pre("save", async function () {
  console.log("New document saved to database");

  // Only send an email when a new document is created
  if (this.isNew) {
    await sendVerificationEmail(this.email, this.otp);
  }
  // next();
});

module.exports = mongoose.model("OTP", OTPSchema);
