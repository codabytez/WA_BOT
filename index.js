const express = require("express");
const body_parser = require("body-parser");
const axios = require("axios");
require("dotenv").config();

const app = express().use(body_parser.json());

// In-memory storage for user sessions (use Redis/Database in production)
const userSessions = new Map();

// User states for conversation flow
const USER_STATES = {
  INITIAL: "initial",
  AWAITING_EMAIL: "awaiting_email",
  AWAITING_OTP: "awaiting_otp",
  AWAITING_FIRST_NAME: "awaiting_first_name",
  AWAITING_LAST_NAME: "awaiting_last_name",
  AWAITING_PHONE: "awaiting_phone",
  AWAITING_BUSINESS_NAME: "awaiting_business_name",
  AWAITING_BUSINESS_DURATION: "awaiting_business_duration",
  AWAITING_CAC_NUMBER: "awaiting_cac_number",
  AWAITING_LOAN_AMOUNT: "awaiting_loan_amount",
  AWAITING_STATE: "awaiting_state",
  AWAITING_INDUSTRY: "awaiting_industry",
  AWAITING_SOCIAL_MEDIA: "awaiting_social_media",
  AWAITING_REFERRAL: "awaiting_referral",
  AWAITING_PAYMENT: "awaiting_payment",
  AWAITING_PITCH_VIDEO: "awaiting_pitch_video",
  COMPLETED: "completed",
};

// Sample OTP storage (use proper service like Twilio Verify in production)
const otpStorage = new Map();

app.listen(process.env.PORT || 8000, () => {
  console.log("Server is running on port 8000");
});

// Verify the callback URL from dashboard side
app.get("/webhook", (req, res) => {
  let mode = req.query["hub.mode"];
  let challenge = req.query["hub.challenge"];
  let token = req.query["hub.verify_token"];

  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// Helper function to send WhatsApp message
async function sendWhatsAppMessage(
  phone_no_id,
  to,
  message,
  messageType = "text"
) {
  try {
    const data =
      messageType === "text"
        ? { messaging_product: "whatsapp", to, text: { body: message } }
        : message; // For interactive messages

    const response = await axios({
      method: "POST",
      url: `https://graph.facebook.com/${process.env.VERSION}/${phone_no_id}/messages`,
      data,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
      },
    });

    console.log("Message sent successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error sending message:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Generate and send OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Simulate sending OTP via email (integrate with your email service)
async function sendOTPEmail(email, otp) {
  // TODO: Integrate with your email service (SendGrid, Mailgun, etc.)
  console.log(`Sending OTP ${otp} to email: ${email}`);
  // For now, just store it
  otpStorage.set(email, { otp, timestamp: Date.now() });
  return true;
}

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone number
function isValidPhone(phone) {
  const phoneRegex = /^(\+234|0)[7-9][0-1]\d{8}$/;
  return phoneRegex.test(phone);
}

// Process user input based on current state
async function processUserInput(from, message, phone_no_id) {
  let userSession = userSessions.get(from);

  // Initialize new user session
  if (!userSession) {
    userSession = {
      state: USER_STATES.INITIAL,
      data: {
        email: "",
        first_name: "",
        last_name: "",
        phone: "",
        business_name: "",
        business_duration: "",
        cac_number: "",
        referral: "",
        loan_amount: "",
        state_id: "",
        industry: "",
        twitter: "",
        instagram: "",
        facebook: "",
        linkedin: "",
      },
      step: 0,
    };
    userSessions.set(from, userSession);
  }

  const currentMessage = message.toLowerCase().trim();

  switch (userSession.state) {
    case USER_STATES.INITIAL:
      if (
        currentMessage === "hello" ||
        currentMessage === "hi" ||
        currentMessage === "start"
      ) {
        await sendWhatsAppMessage(
          phone_no_id,
          from,
          "🌟 Welcome to our Business Loan Application Bot! 🌟\n\n" +
            "I'm here to help you apply for a business loan quickly and easily.\n\n" +
            "To get started, please provide your email address:"
        );
        userSession.state = USER_STATES.AWAITING_EMAIL;
      } else {
        await sendWhatsAppMessage(
          phone_no_id,
          from,
          "👋 Hello! Welcome to our Business Loan Application Bot!\n\n" +
            "Type 'hello' or 'start' to begin your application process."
        );
      }
      break;

    case USER_STATES.AWAITING_EMAIL:
      if (isValidEmail(message)) {
        userSession.data.email = message;
        const otp = generateOTP();
        await sendOTPEmail(message, otp);

        await sendWhatsAppMessage(
          phone_no_id,
          from,
          `✅ Great! I've sent a verification code to ${message}\n\n` +
            "Please enter the 6-digit OTP you received:"
        );
        userSession.state = USER_STATES.AWAITING_OTP;
      } else {
        await sendWhatsAppMessage(
          phone_no_id,
          from,
          "❌ Please enter a valid email address (e.g., john@example.com):"
        );
      }
      break;

    case USER_STATES.AWAITING_OTP:
      const storedOTP = otpStorage.get(userSession.data.email);
      if (
        storedOTP &&
        storedOTP.otp === message &&
        Date.now() - storedOTP.timestamp < 300000
      ) {
        // 5 minutes
        otpStorage.delete(userSession.data.email);
        await sendWhatsAppMessage(
          phone_no_id,
          from,
          "✅ Email verified successfully!\n\n" +
            "Now, let's collect your information.\n\n" +
            "What's your first name?"
        );
        userSession.state = USER_STATES.AWAITING_FIRST_NAME;
      } else {
        await sendWhatsAppMessage(
          phone_no_id,
          from,
          "❌ Invalid or expired OTP. Please enter the correct 6-digit code:"
        );
      }
      break;

    case USER_STATES.AWAITING_FIRST_NAME:
      if (message.length >= 2) {
        userSession.data.first_name = message;
        await sendWhatsAppMessage(phone_no_id, from, "What's your last name?");
        userSession.state = USER_STATES.AWAITING_LAST_NAME;
      } else {
        await sendWhatsAppMessage(
          phone_no_id,
          from,
          "Please enter a valid first name (at least 2 characters):"
        );
      }
      break;

    case USER_STATES.AWAITING_LAST_NAME:
      if (message.length >= 2) {
        userSession.data.last_name = message;
        await sendWhatsAppMessage(
          phone_no_id,
          from,
          "What's your phone number? (e.g., +2348012345678 or 08012345678):"
        );
        userSession.state = USER_STATES.AWAITING_PHONE;
      } else {
        await sendWhatsAppMessage(
          phone_no_id,
          from,
          "Please enter a valid last name (at least 2 characters):"
        );
      }
      break;

    case USER_STATES.AWAITING_PHONE:
      if (isValidPhone(message)) {
        userSession.data.phone = message;
        await sendWhatsAppMessage(
          phone_no_id,
          from,
          "What's your business name?"
        );
        userSession.state = USER_STATES.AWAITING_BUSINESS_NAME;
      } else {
        await sendWhatsAppMessage(
          phone_no_id,
          from,
          "❌ Please enter a valid Nigerian phone number (e.g., +2348012345678 or 08012345678):"
        );
      }
      break;

    case USER_STATES.AWAITING_BUSINESS_NAME:
      if (message.length >= 2) {
        userSession.data.business_name = message;
        await sendWhatsAppMessage(
          phone_no_id,
          from,
          "How long has your business been operating? (e.g., '2 years', '6 months'):"
        );
        userSession.state = USER_STATES.AWAITING_BUSINESS_DURATION;
      } else {
        await sendWhatsAppMessage(
          phone_no_id,
          from,
          "Please enter a valid business name:"
        );
      }
      break;

    case USER_STATES.AWAITING_BUSINESS_DURATION:
      userSession.data.business_duration = message;
      await sendWhatsAppMessage(
        phone_no_id,
        from,
        "What's your CAC registration number? (Type 'skip' if not registered yet):"
      );
      userSession.state = USER_STATES.AWAITING_CAC_NUMBER;
      break;

    case USER_STATES.AWAITING_CAC_NUMBER:
      userSession.data.cac_number =
        message.toLowerCase() === "skip" ? "" : message;
      await sendWhatsAppMessage(
        phone_no_id,
        from,
        "How much loan amount are you applying for? (e.g., ₦500,000):"
      );
      userSession.state = USER_STATES.AWAITING_LOAN_AMOUNT;
      break;

    case USER_STATES.AWAITING_LOAN_AMOUNT:
      userSession.data.loan_amount = message;
      await sendWhatsAppMessage(
        phone_no_id,
        from,
        "Which state is your business located in? (e.g., Lagos, Abuja, Kano):"
      );
      userSession.state = USER_STATES.AWAITING_STATE;
      break;

    case USER_STATES.AWAITING_STATE:
      userSession.data.state_id = message;
      await sendWhatsAppMessage(
        phone_no_id,
        from,
        "What industry is your business in? (e.g., Technology, Agriculture, Retail):"
      );
      userSession.state = USER_STATES.AWAITING_INDUSTRY;
      break;

    case USER_STATES.AWAITING_INDUSTRY:
      userSession.data.industry = message;
      await sendWhatsAppMessage(
        phone_no_id,
        from,
        "📱 Please share your social media handles (optional):\n\n" +
          "Format: Twitter: @handle, Instagram: @handle, Facebook: profile, LinkedIn: profile\n\n" +
          "Or type 'skip' to continue:"
      );
      userSession.state = USER_STATES.AWAITING_SOCIAL_MEDIA;
      break;

    case USER_STATES.AWAITING_SOCIAL_MEDIA:
      if (message.toLowerCase() !== "skip") {
        // Parse social media handles (basic parsing)
        const handles = message.split(",");
        handles.forEach((handle) => {
          const [platform, url] = handle.split(":").map((s) => s.trim());
          if (platform && url) {
            const platformLower = platform.toLowerCase();
            if (platformLower.includes("twitter"))
              userSession.data.twitter = url;
            if (platformLower.includes("instagram"))
              userSession.data.instagram = url;
            if (platformLower.includes("facebook"))
              userSession.data.facebook = url;
            if (platformLower.includes("linkedin"))
              userSession.data.linkedin = url;
          }
        });
      }

      await sendWhatsAppMessage(
        phone_no_id,
        from,
        "How did you hear about us? (referral name or 'none'):"
      );
      userSession.state = USER_STATES.AWAITING_REFERRAL;
      break;

    case USER_STATES.AWAITING_REFERRAL:
      userSession.data.referral =
        message.toLowerCase() === "none" ? "" : message;

      // Show summary and proceed to payment
      const summary =
        `📋 Application Summary:\n\n` +
        `Name: ${userSession.data.first_name} ${userSession.data.last_name}\n` +
        `Email: ${userSession.data.email}\n` +
        `Phone: ${userSession.data.phone}\n` +
        `Business: ${userSession.data.business_name}\n` +
        `Duration: ${userSession.data.business_duration}\n` +
        `Loan Amount: ${userSession.data.loan_amount}\n` +
        `State: ${userSession.data.state_id}\n` +
        `Industry: ${userSession.data.industry}\n\n` +
        `💳 To proceed with your application, please make a payment of ₦5,000.\n\n` +
        `Payment Details:\n` +
        `Bank: GTBank\n` +
        `Account: 0123456789\n` +
        `Name: Business Loans Ltd\n\n` +
        `After payment, please send your transaction reference:`;

      await sendWhatsAppMessage(phone_no_id, from, summary);
      userSession.state = USER_STATES.AWAITING_PAYMENT;
      break;

    case USER_STATES.AWAITING_PAYMENT:
      // Verify payment (implement your payment verification logic)
      userSession.data.payment_reference = message;

      await sendWhatsAppMessage(
        phone_no_id,
        from,
        "✅ Payment received! Thank you.\n\n" +
          "🎥 Final step: Please upload your pitch video.\n\n" +
          "Record a 2-3 minute video explaining:\n" +
          "• Your business idea\n" +
          "• How you'll use the loan\n" +
          "• Why you should be selected\n\n" +
          "Upload the video now:"
      );
      userSession.state = USER_STATES.AWAITING_PITCH_VIDEO;
      break;

    case USER_STATES.AWAITING_PITCH_VIDEO:
      // Handle video upload (check if message contains video)
      await sendWhatsAppMessage(
        phone_no_id,
        from,
        "🎉 Congratulations! Your loan application has been submitted successfully!\n\n" +
          "📧 You'll receive a confirmation email shortly.\n" +
          "⏰ We'll review your application within 3-5 business days.\n" +
          "📞 Our team will contact you if additional information is needed.\n\n" +
          "Thank you for choosing us! 🙏"
      );

      // Save to database here
      console.log("Complete application:", userSession.data);

      userSession.state = USER_STATES.COMPLETED;
      // Clean up session after some time or keep for support
      break;

    case USER_STATES.COMPLETED:
      await sendWhatsAppMessage(
        phone_no_id,
        from,
        "Your application has already been submitted. Our team will contact you soon!\n\n" +
          "Need help? Contact support at support@businessloans.com"
      );
      break;

    default:
      await sendWhatsAppMessage(
        phone_no_id,
        from,
        "I didn't understand that. Type 'start' to begin a new application."
      );
  }

  // Update session
  userSessions.set(from, userSession);
}

app.post("/webhook", async (req, res) => {
  const body = req.body;

  console.log("Received webhook event:", JSON.stringify(body, null, 2));

  if (body.object) {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0].value.messages
    ) {
      const phone_no_id =
        body.entry[0].changes[0].value.metadata.phone_number_id;
      const from = body.entry[0].changes[0].value.messages[0].from;
      const message = body.entry[0].changes[0].value.messages[0];

      // Handle different message types
      let messageText = "";
      if (message.type === "text") {
        messageText = message.text.body;
      } else if (message.type === "video") {
        messageText = "video_uploaded";
      } else if (message.type === "document") {
        messageText = "document_uploaded";
      } else {
        messageText = message.type; // Handle other types
      }

      try {
        await processUserInput(from, messageText, phone_no_id);
      } catch (error) {
        console.error("Error processing user input:", error);
        await sendWhatsAppMessage(
          phone_no_id,
          from,
          "Sorry, I encountered an error. Please try again or contact support."
        );
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

app.get("/", (req, res) => {
  res.status(200).send("Welcome to the WhatsApp Business Loan Bot Server!");
});

// Admin endpoint to view user sessions (for debugging)
app.get("/admin/sessions", (req, res) => {
  const sessions = Array.from(userSessions.entries()).map(
    ([phone, session]) => ({
      phone,
      state: session.state,
      data: session.data,
    })
  );
  res.json(sessions);
});

// Admin endpoint to clear sessions
app.post("/admin/clear-sessions", (req, res) => {
  userSessions.clear();
  otpStorage.clear();
  res.json({ message: "All sessions cleared" });
});
