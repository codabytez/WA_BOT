const axios = require("axios");
const config = require("../config");

class ApiService {
  constructor() {
    this.baseUrl = config.api.baseUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  // Submit email for verification
  async submitEmail(email) {
    try {
      const response = await this.client.post("/submit-email", { email });
      return response.data;
    } catch (error) {
      console.error(
        "Email submission error:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // Verify email with OTP
  async verifyEmail(email, token) {
    try {
      const response = await this.client.post("/verify-email", {
        email,
        token,
      });
      return response.data;
    } catch (error) {
      console.error(
        "Email verification error:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // Submit complete application entry
  async submitEntry(userData) {
    try {
      const response = await this.client.post("/submit-entry", {
        ...userData,
        loan_amount: 0,
        amount_in_words: userData.loan_amount,
      });
      console.log("Entry submission response:", response);
      return response;
    } catch (error) {
      console.error(
        "Entry submission error:",
        error.response?.data || error.message
      );
      console.error("Entry submission error response:", error.response);
      throw error;
    }
  }

  // Get payment link after successful submission
  async getPaymentLink(email) {
    try {
      const response = await this.client.post("/initiate-payment-link", {
        email,
      });
      return response.data;
    } catch (error) {
      console.error(
        "Payment link error:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // Verify payment (if you have a payment verification endpoint)
  async verifyPayment(paymentReference, email) {
    try {
      const response = await this.client.post("/verify-payment", {
        payment_reference: paymentReference,
        email,
      });
      return response.data;
    } catch (error) {
      console.error(
        "Payment verification error:",
        error.response?.data || error.message
      );
      throw error;
    }
  }
}

module.exports = ApiService;
