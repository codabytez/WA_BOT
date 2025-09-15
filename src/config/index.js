require("dotenv").config();

const config = {
  server: {
    port: process.env.PORT,
  },
  whatsapp: {
    version: process.env.WHATSAPP_VERSION,
    verifyToken: process.env.VERIFY_TOKEN,
    phoneNumberId: process.env.PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_TOKEN,
  },
  api: {
    baseUrl: process.env.BACKEND_API_URL,
  },
  payment: {
    amount: process.env.PAYMENT_AMOUNT,
    bank: process.env.PAYMENT_BANK,
    account: process.env.PAYMENT_ACCOUNT,
    accountName: process.env.PAYMENT_ACCOUNT_NAME,
  },
  support: {
    email: process.env.SUPPORT_EMAIL,
  },
};

module.exports = config;
