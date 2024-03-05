require("dotenv").config();
const { google } = require("googleapis");
const admin = require("firebase-admin");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const scopes = ["https://www.googleapis.com/auth/calendar.readonly"];

// Generate a URL so the user can give the app permission to access their calendar
app.get("/auth/google", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
  });
  res.redirect(url);
});

// The redirect URI where the user will be sent after authorization
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
const serviceAccount = require("./path-to-your-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Initialize Google Calendar API
const { client_secret, client_id, redirect_uris } =
  require("./credentials.json").web;
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

// Assuming you have the access token stored in an environment variable or some other secure place
const accessToken = process.env.ACCESS_TOKEN; // You need to implement the logic to obtain this
oAuth2Client.setCredentials({ access_token: accessToken });

const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
