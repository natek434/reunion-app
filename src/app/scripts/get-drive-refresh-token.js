// node scripts/get-drive-refresh-token.js
import { google } from "googleapis";
import http from "http";
import open from "open";

const CLIENT_ID = process.env.GOOGLE_CLIENT_TOKEN_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_TOKEN_SECRET;
const REDIRECT = "http://localhost:5555/oauth2callback";

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT);
const SCOPES = ["https://www.googleapis.com/auth/drive", "openid", "email", "profile"];
const url = oauth2.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: SCOPES,
});
console.log("Opening browser for Google consent…");
await open(url);

http.createServer(async (req, res) => {
  if (!req.url?.startsWith("/oauth2callback")) return;
  const u = new URL(req.url, REDIRECT);
  const code = u.searchParams.get("code");
  const { tokens } = await oauth2.getToken(code);
  console.log("GOOGLE_DRIVE_ADMIN_REFRESH_TOKEN =", tokens.refresh_token);
  res.end("Linked! Copy the refresh token from your terminal.");
  process.exit(0);
}).listen(5555, () => console.log("Listening on 5555"));
