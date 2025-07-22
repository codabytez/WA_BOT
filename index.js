const express = require("express");
const body_parser = require("body-parser");
const axios = require("axios");
const dotenv = require("dotenv");

const app = express().use(body_parser.json());

app.listen(process.env.PORT || 8000, () => {
  console.log("Server is running on port 8000");
});

// Verify the callback URL from dashboard side -
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

app.post("/webhook", (req, res) => {
  const body = req.body;

  console.log("Received webhook event:", JSON.stringify(body, null, 2));

  if (body.object) {
    if (body.entry && body.entry[0].changes) {
      const changes = body.entry[0].changes;
      const phone_no_id =
        body.entry[0].changes[0].value.metadata.phone_number_id;
      const from = body.entry[0].changes[0].value.messages[0].from;
      const msg_body = body.entry[0].changes[0].value.messages[0].text.body;

      axios({
        method: "POST",
        url: `https://graph.facebook.com/${PROCESS.env.VERSION}/${phone_no_id}/messages`,
        data: {
          messaging_product: "whatsapp",
          to: from,
          text: { body: `You sent: ${msg_body}` },
        },
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
        },
      })
        .then((response) => {
          console.log("Message sent successfully:", response.data);
        })
        .catch((error) => {
          console.error("Error sending message:", error);
        });

      //   changes.forEach((change) => {
      //     const value = change.value;
      //     const messages = value.messages;

      //     if (messages && messages.length > 0) {
      //       messages.forEach((message) => {
      //         // Process each message
      //         console.log("Received message:", message);
      //       });
      //     }
      //   });
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

app.get("/", (req, res) => {
  res.status(200).send("Welcome to the WhatsApp Bot Server!");
});
