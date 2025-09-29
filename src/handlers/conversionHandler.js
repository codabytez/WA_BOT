const { USER_STATES, STATUS_MAP } = require("../constants/states");
const {
  isValidEmail,
  isValidPhone,
  isValidName,
} = require("../utils/validators");
const {
  createIndustrySelectionMessage,
  createBusinessDurationSelectionMessage,
  createLoanAmountSelectionMessage,
  getIndustryDisplayName,
  getBusinessDurationDisplayName,
  getLoanAmountDisplayName,
  isValidIndustryId,
  isValidBusinessDurationId,
  isValidLoanAmountId,
} = require("../utils/interactiveMessages");
const WhatsAppService = require("../services/whatsappService");
const ApiService = require("../services/apiService");

class ConversationHandler {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
    this.whatsappService = new WhatsAppService();
    this.apiService = new ApiService();
  }

  // Main method to process user input
  async processUserInput(
    from,
    message,
    username,
    whatsappPhoneNumber,
    messageType = "text",
    interactiveData = null
  ) {
    const userSession = this.sessionManager.getOrCreateSession(
      from,
      whatsappPhoneNumber
    );
    const currentMessage = message.toLowerCase().trim();

    // Handle interactive responses
    if (messageType === "interactive" && interactiveData) {
      await this.handleInteractiveResponse(from, interactiveData, userSession);
      return;
    }

    // Handle global commands
    if (
      await this.handleGlobalCommands(
        from,
        currentMessage,
        userSession,
        username
      )
    ) {
      return;
    }

    // Process based on current state
    await this.handleStateBasedInput(from, message, userSession, username);
  }

  // Handle interactive responses (button/list selections)
  async handleInteractiveResponse(from, interactiveData, userSession) {
    const selectedId = interactiveData.id;

    switch (userSession.state) {
      case USER_STATES.AWAITING_BUSINESS_DURATION:
        if (isValidBusinessDurationId(selectedId)) {
          userSession.data.business_duration =
            getBusinessDurationDisplayName(selectedId);
          await this.whatsappService.sendMessage(
            from,
            "What's your CAC registration number? (Type 'skip' if not registered yet):"
          );
          userSession.state = USER_STATES.AWAITING_CAC_NUMBER;
          this.sessionManager.updateSession(from, userSession);
        }
        break;

      case USER_STATES.AWAITING_LOAN_AMOUNT:
        if (isValidLoanAmountId(selectedId)) {
          userSession.data.loan_amount = getLoanAmountDisplayName(selectedId);
          await this.whatsappService.sendMessage(
            from,
            "What is your business address? (Street, City, State)"
          );
          userSession.state = USER_STATES.AWAITING_BUSINESS_ADDRESS;
          this.sessionManager.updateSession(from, userSession);
        }
        break;

      case USER_STATES.AWAITING_INDUSTRY:
        if (isValidIndustryId(selectedId)) {
          userSession.data.industry = getIndustryDisplayName(selectedId);
          await this.whatsappService.sendMessage(
            from,
            "📱 Please share your social media handles (optional):\n\n" +
              "Format: Twitter: @handle, Instagram: @handle, Facebook: profile, LinkedIn: profile\n\n" +
              "Or type 'skip' to continue:"
          );
          userSession.state = USER_STATES.AWAITING_SOCIAL_MEDIA;
          this.sessionManager.updateSession(from, userSession);
        }
        break;

      default:
        // If we receive an interactive response in an unexpected state, ignore it
        await this.whatsappService.sendMessage(
          from,
          "I didn't expect that selection right now. Please continue with your application."
        );
    }
  }

  // Handle global commands (cancel, help, status, etc.)
  async handleGlobalCommands(from, currentMessage, userSession, username) {
    switch (currentMessage) {
      case "cancel":
      case "stop":
      case "quit":
      case "exit":
        await this.handleCancel(from, userSession);
        return true;

      case "restart":
      case "reset":
        await this.handleRestart(from, userSession, username);
        return true;

      case "help":
      case "menu":
        await this.whatsappService.sendHelpMenu(from);
        return true;

      case "status":
        await this.handleStatus(from, userSession);
        return true;

      default:
        return false;
    }
  }

  // Handle cancel command
  async handleCancel(from, userSession) {
    this.sessionManager.deleteSession(from);
    await this.whatsappService.sendCancellationMessage(from);
  }

  // Handle restart command
  async handleRestart(from, userSession, username) {
    this.sessionManager.deleteSession(from);
    const newSession = this.sessionManager.createSession(from);
    newSession.state = USER_STATES.AWAITING_EMAIL;
    this.sessionManager.updateSession(from, newSession);
    await this.whatsappService.sendWelcomeMessage(from, username);
  }

  // Handle status command
  async handleStatus(from, userSession) {
    const currentStatus = STATUS_MAP[userSession.state] || "Unknown status";
    const progress = Object.values(userSession.data).filter(
      (value) => value !== ""
    ).length;
    const totalFields = Object.keys(userSession.data).length;

    await this.whatsappService.sendStatusMessage(
      from,
      currentStatus,
      progress,
      totalFields
    );
  }

  // Handle state-based input
  async handleStateBasedInput(from, message, userSession, username) {
    switch (userSession.state) {
      case USER_STATES.INITIAL:
        await this.handleInitialState(from, message, userSession, username);
        break;

      case USER_STATES.AWAITING_EMAIL:
        await this.handleEmailState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_OTP:
        await this.handleOTPState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_FIRST_NAME:
        await this.handleFirstNameState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_LAST_NAME:
        await this.handleLastNameState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_PHONE:
        await this.handlePhoneState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_BUSINESS_NAME:
        await this.handleBusinessNameState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_BUSINESS_DURATION:
        await this.handleBusinessDurationState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_CAC_NUMBER:
        await this.handleCACNumberState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_LOAN_AMOUNT:
        await this.handleLoanAmountState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_BUSINESS_ADDRESS:
        await this.handleStateLocationState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_INDUSTRY:
        await this.handleIndustryState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_SOCIAL_MEDIA:
        await this.handleSocialMediaState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_REFERRAL:
        await this.handleReferralState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_PAYMENT:
        await this.handlePaymentState(from, message, userSession);
        break;

      case USER_STATES.AWAITING_PITCH_VIDEO:
        await this.handlePitchVideoState(from, message, userSession);
        break;

      case USER_STATES.COMPLETED:
        await this.handleCompletedState(from);
        break;

      default:
        await this.whatsappService.sendMessage(
          from,
          "I didn't understand that. Type 'start' to begin a new application."
        );
    }
  }

  // Individual state handlers
  async handleInitialState(from, message, userSession, username) {
    const currentMessage = message.toLowerCase().trim();

    if (["hello", "hi", "start"].includes(currentMessage)) {
      await this.whatsappService.sendWelcomeMessage(from, username);
      userSession.state = USER_STATES.AWAITING_EMAIL;
      this.sessionManager.updateSession(from, userSession);
    } else {
      await this.whatsappService.sendMessage(
        from,
        `👋 Hello ${username}! Welcome to our Kiya Loan Bot!\n\n` +
          "Type 'start' to begin your application process.\n" +
          "Type 'help' to see available commands."
      );
    }
  }

  async handleEmailState(from, message, userSession) {
    if (!isValidEmail(message)) {
      await this.whatsappService.sendMessage(
        from,
        "❌ Please enter a valid email address (e.g., john@example.com):"
      );
      return;
    }

    try {
      const response = await this.apiService.submitEmail(message);

      if (response?.status) {
        userSession.data.email = message;
        await this.whatsappService.sendMessage(
          from,
          `✅ Great! I've sent a verification code to ${message}\n\n` +
            "Please enter the 6-digit OTP you received:"
        );
        userSession.state = USER_STATES.AWAITING_OTP;
        this.sessionManager.updateSession(from, userSession);
      } else {
        const errorMsg =
          response?.message ||
          "❌ Something went wrong. Please try again later.";
        await this.whatsappService.sendMessage(from, errorMsg);
      }
    } catch (error) {
      if (error.response?.status === 409) {
        // Already verified → skip OTP
        userSession.data.email = message;
        await this.whatsappService.sendMessage(
          from,
          "✅ This email is already verified!\n\n" +
            "Let's continue your application.\n\n" +
            "What's your first name?"
        );
        userSession.state = USER_STATES.AWAITING_FIRST_NAME;
        this.sessionManager.updateSession(from, userSession);
      } else {
        const errorMsg =
          error.response?.data?.message ||
          "❌ Could not process your request. Please try again later.";
        await this.whatsappService.sendMessage(from, errorMsg);
      }
    }
  }

  async handleOTPState(from, message, userSession) {
    try {
      const response = await this.apiService.verifyEmail(
        userSession.data.email,
        message
      );

      if (response?.status) {
        await this.whatsappService.sendMessage(
          from,
          "✅ Email verified successfully!\n\n" +
            "Now, let's collect your information.\n\n" +
            "What's your first name?"
        );
        userSession.state = USER_STATES.AWAITING_FIRST_NAME;
        this.sessionManager.updateSession(from, userSession);
      } else {
        const errorMsg =
          response?.message ||
          "❌ Invalid OTP. Please enter the 6-digit code sent to your email:";
        await this.whatsappService.sendMessage(from, errorMsg);
      }
    } catch (error) {
      console.error("OTP verification error:", error.response?.data || error);
      const errorMsg =
        error.response?.data?.message ||
        "❌ Could not verify OTP. Please try again later.";
      await this.whatsappService.sendMessage(from, errorMsg);
    }
  }

  async handleFirstNameState(from, message, userSession) {
    if (!isValidName(message)) {
      await this.whatsappService.sendMessage(
        from,
        "Please enter a valid first name (at least 2 characters):"
      );
      return;
    }

    userSession.data.first_name = message;
    await this.whatsappService.sendMessage(from, "What's your last name?");
    userSession.state = USER_STATES.AWAITING_LAST_NAME;
    this.sessionManager.updateSession(from, userSession);
  }

  async handleLastNameState(from, message, userSession) {
    if (!isValidName(message)) {
      await this.whatsappService.sendMessage(
        from,
        "Please enter a valid last name (at least 2 characters):"
      );
      return;
    }

    userSession.data.last_name = message;
    await this.whatsappService.sendMessage(
      from,
      "What's your phone number? (e.g., +2348012345678 or 08012345678):"
    );
    userSession.state = USER_STATES.AWAITING_PHONE;
    this.sessionManager.updateSession(from, userSession);
  }

  async handlePhoneState(from, message, userSession) {
    if (!isValidPhone(message)) {
      await this.whatsappService.sendMessage(
        from,
        "❌ Please enter a valid Nigerian phone number (e.g., +2348012345678 or 08012345678):"
      );
      return;
    }

    userSession.data.phone = message;
    await this.whatsappService.sendMessage(from, "What's your business name?");
    userSession.state = USER_STATES.AWAITING_BUSINESS_NAME;
    this.sessionManager.updateSession(from, userSession);
  }

  async handleBusinessNameState(from, message, userSession) {
    if (!isValidName(message)) {
      await this.whatsappService.sendMessage(
        from,
        "Please enter a valid business name:"
      );
      return;
    }

    userSession.data.business_name = message;

    // Send interactive message for business duration selection
    const interactiveMessage = createBusinessDurationSelectionMessage(from);
    await this.whatsappService.sendInteractiveMessage(from, interactiveMessage);

    userSession.state = USER_STATES.AWAITING_BUSINESS_DURATION;
    this.sessionManager.updateSession(from, userSession);
  }

  async handleBusinessDurationState(from, message, userSession) {
    // Send interactive message for business duration selection
    const interactiveMessage = createBusinessDurationSelectionMessage(from);
    await this.whatsappService.sendInteractiveMessage(from, interactiveMessage);

    // Don't change state yet - wait for interactive response
  }

  async handleCACNumberState(from, message, userSession) {
    userSession.data.cac_number =
      message.toLowerCase() === "skip" ? "" : message;

    // Send interactive message for loan amount selection
    const interactiveMessage = createLoanAmountSelectionMessage(from);
    await this.whatsappService.sendInteractiveMessage(from, interactiveMessage);

    userSession.state = USER_STATES.AWAITING_LOAN_AMOUNT;
    this.sessionManager.updateSession(from, userSession);
  }

  async handleLoanAmountState(from, message, userSession) {
    // Send interactive message for loan amount selection
    const interactiveMessage = createLoanAmountSelectionMessage(from);
    await this.whatsappService.sendInteractiveMessage(from, interactiveMessage);

    // Don't change state yet - wait for interactive response
  }

  async handleStateLocationState(from, message, userSession) {
    userSession.data.business_address = message;

    // Send interactive message for industry selection
    const interactiveMessage = createIndustrySelectionMessage(from);
    await this.whatsappService.sendInteractiveMessage(from, interactiveMessage);

    userSession.state = USER_STATES.AWAITING_INDUSTRY;
    this.sessionManager.updateSession(from, userSession);
  }

  async handleIndustryState(from, message, userSession) {
    // Send interactive message for industry selection
    const interactiveMessage = createIndustrySelectionMessage(from);
    await this.whatsappService.sendInteractiveMessage(from, interactiveMessage);

    // Don't change state yet - wait for interactive response
  }

  async handleSocialMediaState(from, message, userSession) {
    if (message.toLowerCase() !== "skip") {
      // Parse social media handles (basic parsing)
      const handles = message.split(",");
      handles.forEach((handle) => {
        const [platform, url] = handle.split(":").map((s) => s.trim());
        if (platform && url) {
          const platformLower = platform.toLowerCase();
          if (platformLower.includes("twitter")) userSession.data.twitter = url;
          if (platformLower.includes("instagram"))
            userSession.data.instagram = url;
          if (platformLower.includes("facebook"))
            userSession.data.facebook = url;
          if (platformLower.includes("linkedin"))
            userSession.data.linkedin = url;
        }
      });
    }

    await this.whatsappService.sendMessage(
      from,
      "How did you hear about us? (referral name or 'none'):"
    );
    userSession.state = USER_STATES.AWAITING_REFERRAL;
    this.sessionManager.updateSession(from, userSession);
  }

  async handleReferralState(from, message, userSession) {
    userSession.data.referral = message.toLowerCase() === "none" ? "" : message;

    // Tell user it's submitting
    await this.whatsappService.sendMessage(
      from,
      "⏳ Submitting your application details, please wait..."
    );

    try {
      // Submit entry to backend
      const response = await this.apiService.submitEntry(userSession.data);

      if (response.data?.status) {
        // Get payment link
        try {
          const paymentResponse = await this.apiService.getPaymentLink(
            userSession.data.email
          );

          console.log("Payment link response:", paymentResponse);

          //           {
          //   "status": true,
          //   "message": "Payment link initiated successfully",
          //   "data": {
          //     "payment_link": "https://checkout.paystack.com/6m2kesvqz0f6epg"
          //   }
          // }

          if (paymentResponse?.status && paymentResponse?.data?.payment_link) {
            // Send payment details with payment button
            await this.whatsappService.sendPaymentDetails(
              from,
              userSession,
              paymentResponse?.data?.payment_link
            );
          } else {
            // Fallback to an error message
            await this.whatsappService.sendMessage(
              from,
              "❌ Could not generate payment link. Please try again later or contact support."
            );
          }
        } catch (paymentError) {
          console.error("Payment link error:", paymentError);
          // Fallback to an error message
          await this.whatsappService.sendMessage(
            from,
            "❌ Could not generate payment link. Please try again later or contact support."
          );
        }

        userSession.state = USER_STATES.AWAITING_PAYMENT;
        this.sessionManager.updateSession(from, userSession);
      } else {
        if (response.status === 201) {
          //Payment has already been made for this entry
          await this.whatsappService.sendMessage(
            from,
            "✅ Your application has already been submitted and payment received! Please proceed to upload your pitch video.\n\n" +
              "You can upload your pitch video by sending it directly here in this chat."
          );
          userSession.state = USER_STATES.AWAITING_PITCH_VIDEO;
          this.sessionManager.updateSession(from, userSession);
          return;
        }
        const errorMsg =
          response?.message ||
          "❌ Could not submit your application. Please try again later.";
        await this.whatsappService.sendMessage(from, errorMsg);
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        "❌ Something went wrong while submitting. Please try again.";
      await this.whatsappService.sendMessage(from, errorMsg);
    }
  }

  async handlePaymentState(from, message, userSession) {
    // Check if user is providing a transaction reference
    if (message.length > 5) {
      // Assume transaction references are longer than 5 characters
      userSession.data.payment_reference = message;

      await this.whatsappService.sendMessage(
        from,
        "✅ Payment reference received! We're verifying your payment...\n\n" +
          "⏳ This may take a few moments. You'll be notified once payment is confirmed."
      );

      userSession.state = USER_STATES.PAYMENT_PENDING;
      this.sessionManager.updateSession(from, userSession);

      // Here you could add logic to verify payment with your payment processor
      // For now, we'll simulate automatic confirmation after a short delay
      setTimeout(async () => {
        try {
          await this.confirmPayment(from, userSession);
        } catch (error) {
          console.error("Error confirming payment:", error);
        }
      }, 3000); // 3 second delay to simulate processing
    } else {
      await this.whatsappService.sendMessage(
        from,
        "Please provide a valid transaction reference. It should be the reference number you received after making payment.\n\n" +
          "If you haven't paid yet, please use the payment link provided earlier or make a bank transfer and send the reference number."
      );
    }
  }

  // Handle payment pending state
  async handlePaymentPendingState(from, message, userSession) {
    await this.whatsappService.sendMessage(
      from,
      "⏳ Your payment is still being processed. Please wait for confirmation.\n\n" +
        "If you have a new transaction reference, please provide it:"
    );

    // Allow them to provide a new reference
    if (message.length > 5) {
      userSession.data.payment_reference = message;
      this.sessionManager.updateSession(from, userSession);
      await this.whatsappService.sendMessage(
        from,
        "✅ New payment reference received! Verifying payment..."
      );
    }
  }

  async handlePitchVideoState(from, message, userSession) {
    if (message === "video_uploaded" || message === "document_uploaded") {
      await this.whatsappService.sendMessage(
        from,
        "✅ Pitch video received! Thank you for your submission.\n\n" +
          "Our team will review your application and get back to you soon.\n\n" +
          "If you need any assistance, feel free to contact support at helpdesk@kiakia.co."
      );

      userSession.state = USER_STATES.COMPLETED;
      this.sessionManager.updateSession(from, userSession);
    } else {
      await this.whatsappService.sendMessage(
        from,
        "Please upload your pitch video by sending it directly here in this chat.\n\n" +
          "If you need help, type 'help' for assistance."
      );
    }
  }

  // Confirm payment (can be called from webhook or manual confirmation)
  async confirmPayment(from, userSession) {
    // Here you would typically verify the payment with your payment processor
    // For this example, we'll assume the payment is valid if a reference exists

    if (userSession.data.payment_reference) {
      await this.whatsappService.sendMessage(
        from,
        "✅ Payment confirmed! Thank you for your payment.\n\n" +
          "You can now upload your pitch video by sending it directly here in this chat."
      );

      userSession.state = USER_STATES.AWAITING_PITCH_VIDEO;
      this.sessionManager.updateSession(from, userSession);
    } else {
      await this.whatsappService.sendMessage(
        from,
        "❌ No payment reference found. Please provide your transaction reference to confirm payment."
      );
      userSession.state = USER_STATES.AWAITING_PAYMENT;
      this.sessionManager.updateSession(from, userSession);
    }
  }

  // Handle completed state
  async handleCompletedState(from) {
    await this.whatsappService.sendMessage(
      from,
      "Your application has already been submitted. Our team will contact you soon!\n\n" +
        "Need help? Contact support at helpdesk@kiakia.co."
    );
  }
}

module.exports = ConversationHandler;
