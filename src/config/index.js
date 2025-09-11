require("dotenv").config();

const config = {
  server: {
    port: process.env.PORT || 8000,
  },
  whatsapp: {
    version: process.env.WHATSAPP_VERSION || "v22.0",
    verifyToken: process.env.VERIFY_TOKEN,
    phoneNumberId: process.env.PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_TOKEN,
  },
  api: {
    baseUrl:
      process.env.BACKEND_API_URL || "https://backend.kiya.ng/api/v1/kiya",
  },
  payment: {
    amount: process.env.PAYMENT_AMOUNT || "1000",
    bank: process.env.PAYMENT_BANK || "ALAT By Wema",
    account: process.env.PAYMENT_ACCOUNT || "0000000000",
    accountName: process.env.PAYMENT_ACCOUNT_NAME || "Lisan al Gaib",
  },
  support: {
    email: process.env.SUPPORT_EMAIL || "helpdesk@kiakia.co",
  },
};

module.exports = config;
