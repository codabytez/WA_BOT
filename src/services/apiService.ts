import axios, { AxiosError } from "axios";
import config from "../config";
import { UserData } from "../types";

class ApiService {
  baseUrl: string | undefined;
  client: import("axios").AxiosInstance;

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
  async submitEmail(email: string) {
    try {
      const response = await this.client.post("/submit-email", { email });
      return response.data;
    } catch (error) {
      const err = error as AxiosError;
      console.error(
        "Email submission error:",
        err.response?.data || err.message
      );
      throw err;
    }
  }

  // Verify email with OTP
  async verifyEmail(email: string, token: string) {
    try {
      const response = await this.client.post("/verify-email", {
        email,
        token,
      });
      return response.data;
    } catch (error) {
      const err = error as AxiosError;
      console.error(
        "Email verification error:",
        err.response?.data || err.message
      );
      throw err;
    }
  }

  // Submit complete application entry
  async submitEntry(userData: UserData) {
    try {
      const response = await this.client.post("/submit-entry", {
        ...userData,
        loan_amount: 0,
        address: userData.business_address,
        amount_in_words: userData.loan_amount,
      });
      console.log("Entry submission response:", response);
      return response;
    } catch (error) {
      const err = error as AxiosError;
      console.error(
        "Entry submission error:",
        err.response?.data || err.message
      );
      console.error("Entry submission error response:", err.response);
      throw err;
    }
  }

  // Get payment link after successful submission
  async getPaymentLink(email: string) {
    try {
      const response = await this.client.post("/initiate-payment-link", {
        email,
      });
      return response.data;
    } catch (error) {
      const err = error as AxiosError;
      console.error("Payment link error:", err.response?.data || err.message);
      throw err;
    }
  }

  // Verify payment (if you have a payment verification endpoint)
  async verifyPayment(paymentReference: string, email: string) {
    try {
      const response = await this.client.post("/verify-payment", {
        payment_reference: paymentReference,
        email,
      });
      return response.data;
    } catch (error) {
      const err = error as AxiosError;
      console.error(
        "Payment verification error:",
        err.response?.data || err.message
      );
      throw err;
    }
  }

  // Upload pitch video
  async uploadPitchVideo(email: string, media_id: string) {
    try {
      const response = await this.client.post("/update-video-details", {
        email,
        submission_type: "whatsapp",
        whatsapp_media_id: media_id,
      });
      return response.data;
    } catch (error) {
      const err = error as AxiosError;
      console.error(
        "Pitch video upload error:",
        err.response?.data || err.message
      );
      throw err;
    }
  }
}

export default ApiService;
