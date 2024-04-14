// Sets Variables
require("dotenv").config();
const { google } = require("googleapis");
const admin = require("firebase-admin");
const express = require("express");
const app = express();
const cors = require("cors");

app.use(
  cors({
    origin: "https://craigmwangi.github.io",
  })
);

const oauth2Client = new google.auth.OAuth2(
  "556828166349-jjodibfl9b6g3djt6r0hq93go56qjprr.apps.googleusercontent.com",
  "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",
  "https://craigmwangi.github.io/auth/google/callback"
);

const scopes = ["https://www.googleapis.com/auth/calendar"];

// Generates a URL so the user can give the app permission to access their calendar
app.get("/auth/google", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
  });
  res.redirect(url);
});

// Redirect URI where the user will be sent after authorization
app.get("/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    res.send("Authorization successful. You can now close this page.");
    // Store tokens securely for later use (e.g., in a database)
    console.log(tokens);
  } catch (error) {
    console.error("Error getting tokens:", error);
    res.status(500).send("Authentication failed");
  }
});

// Function to refresh the access token
async function refreshAccessToken() {
  const currentTokens = oauth2Client.credentials;
  if (currentTokens.refresh_token) {
    oauth2Client.setCredentials({
      refresh_token: currentTokens.refresh_token,
    });
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);
    // Update stored tokens with new credentials
    console.log("Access token refreshed:", credentials);
  }
}

// Initialize Firebase Admin
const serviceAccount = require("../gigify-0000a-firebase-adminsdk-pw3hh-1aa2ee7e31.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Initialize Google Calendar API
require("../client_secret_556828166349-jjodibfl9b6g3djt6r0hq93go56qjprr.apps.googleusercontent.com.json")
  .web;
const oAuth2Client = new google.auth.OAuth2(
  "556828166349-jjodibfl9b6g3djt6r0hq93go56qjprr.apps.googleusercontent.com",
  "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",
  redirect_uris[7]
);

// Assuming you have the access token stored in an environment variable or some other secure place
const accessToken = process.env.ACCESS_TOKEN; // You need to implement the logic to obtain this
oAuth2Client.setCredentials({ access_token: accessToken });

const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
