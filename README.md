# Kiya WhatsApp Loan Bot

A WhatsApp chatbot for processing loan applications with email verification, data collection, and payment processing.

## 🚀 Features

- **WhatsApp Integration**: Full WhatsApp Business API integration
- **Email Verification**: OTP-based email verification system
- **State Management**: Robust conversation flow management
- **Data Collection**: Comprehensive loan application data gathering
- **Payment Processing**: Payment reference collection and verification
- **Admin Panel**: Administrative endpoints for session management
- **Error Handling**: Comprehensive error handling and user-friendly messages
- **Modular Architecture**: Clean, maintainable code structure

## 📁 Project Structure

```JS
kiya-whatsapp-bot/
├── src/
│   ├── config/
│   │   └── index.js              # Configuration management
│   ├── constants/
│   │   └── states.js             # User states and status mapping
│   ├── handlers/
│   │   ├── conversationHandler.js # Main conversation logic
│   │   └── webhookHandler.js     # Webhook event handling
│   ├── routes/
│   │   └── adminRoutes.js        # Admin API endpoints
│   ├── services/
│   │   ├── apiService.js         # Backend API integration
│   │   ├── sessionManager.js     # Session storage management
│   │   └── whatsappService.js    # WhatsApp messaging service
│   └── utils/
│       └── validators.js         # Input validation utilities
├── .env                          # Environment variables
├── .gitignore                    # Git ignore rules
├── package.json                  # Dependencies and scripts
├── README.md                     # Project documentation
└── server.js                     # Main application entry point
```

## 🛠️ Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd kiya-whatsapp-bot
   ```

1. **Install dependencies**

   ```bash
   npm install
   ```

1. **Environment Setup**

   - Copy the `.env` file and update with your actual values:

   ```bash
   cp .env .env.local
   ```

   - Update the following variables in `.env`:
     - `WHATSAPP_TOKEN`: Your WhatsApp Business API token
     - `VERIFY_TOKEN`: Your webhook verification token
     - `PHONE_NUMBER_ID`: Your WhatsApp phone number ID
     - `BACKEND_API_URL`: Your backend API URL

1. **Start the server**

   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## 🔧 Configuration

### Environment Variables

| Variable               | Description                |
| ---------------------- | -------------------------- |
| `PORT`                 | Server port                |
| `WHATSAPP_VERSION`     | WhatsApp API version       |
| `VERIFY_TOKEN`         | Webhook verification token |
| `PHONE_NUMBER_ID`      | WhatsApp phone number ID   |
| `WHATSAPP_TOKEN`       | WhatsApp access token      |
| `BACKEND_API_URL`      | Backend API base URL       |
| `PAYMENT_AMOUNT`       | Payment amount             |
| `PAYMENT_BANK`         | Payment bank name          |
| `PAYMENT_ACCOUNT`      | Payment account number     |
| `PAYMENT_ACCOUNT_NAME` | Payment account name       |
| `SUPPORT_EMAIL`        | Support email              |

### WhatsApp Business API Setup

1. Create a Meta Developer account
2. Set up WhatsApp Business API
3. Get your access token and phone number ID
4. Configure webhook URL: `https://your-domain.com/webhook`
5. Set verification token in your environment variables

## 📱 Bot Commands

Users can interact with the bot using these commands:

- `start` - Begin new application
- `restart` - Start over from beginning
- `cancel` / `stop` - Cancel current application
- `help` - Show available commands
- `status` - Check application progress

## 🎯 Interactive Features

## 🔄 Enhanced Conversation Flow

1. **Initial Greeting** - Welcome message and start command
2. **Email Collection** - Email address input and verification
3. **OTP Verification** - Email verification with OTP
4. **Personal Information** - First name, last name, phone number
5. **Business Information** - Business name, duration, CAC number
6. **Loan Details** - Loan amount, state, industry
7. **Social Media** - Optional social media handles
8. **Referral** - Referral source information
9. **Payment** - Payment processing and reference
10. **Pitch Video** - Video upload for final submission
11. **Completion** - Application submitted successfully

## 🎯 API Endpoints

### Webhook Endpoints

- `GET /webhook` - Webhook verification
- `POST /webhook` - Receive WhatsApp messages

### Admin Endpoints

- `GET /admin/sessions` - Get all user sessions
- `GET /admin/sessions/:phoneNumber` - Get specific session
- `DELETE /admin/sessions/:phoneNumber` - Delete specific session
- `GET /admin/stats` - Get session statistics
- `POST /admin/clear-sessions` - Clear all sessions

### Utility Endpoints

- `GET /` - API information
- `GET /health` - Health check and server stats

## 📊 Admin Panel Usage

Monitor and manage bot sessions through the admin endpoints:

```bash
# Get all sessions
curl http://localhost:8000/admin/sessions

# Get session statistics
curl http://localhost:8000/admin/stats

# Health check
curl http://localhost:8000/health
```

## 🛡️ Error Handling

The bot includes comprehensive error handling:

- **Network Errors**: API call failures are gracefully handled
- **Validation Errors**: Input validation with user-friendly error messages
- **State Management**: Session corruption recovery
- **Rate Limiting**: Built-in protection against spam
- **Graceful Shutdown**: Proper server shutdown handling

## 🧪 Development

### Running in Development Mode

```bash
npm run dev
```

### Testing Webhook Locally

Use ngrok to expose your local server:

```bash
npx ngrok http 8000
```

Then update your webhook URL in Meta Developer Console to the ngrok URL.

## 🚀 Deployment

### Prerequisites

- Node.js 20+
- Environment variables configured
- WhatsApp Business API setup
- Backend API running

### Deployment Steps

1. Set up your production server
2. Configure environment variables
3. Install dependencies: `npm install --production`
4. Start the application: `npm start`
5. Configure webhook URL in Meta Developer Console

<!-- ### Production Considerations

- Use a process manager like PM2
- Set up proper logging
- Use Redis for session storage in production
- Implement proper security headers
- Set up SSL/HTTPS -->

## 📝 Logging

The application includes comprehensive logging:

- Incoming webhook events
- API responses and errors
- Session state changes
- Application submissions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

[Add your license information here]

## 🆘 Support

For support, email <helpdesk@kiakia.co> or create an issue in the repository.

## 🔗 Related Links

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Meta Developer Console](https://developers.facebook.com/)
- [Node.js Documentation](https://nodejs.org/docs/)
