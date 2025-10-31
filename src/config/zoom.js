import * as dotenv from "dotenv";

dotenv.config();

const zoomConfig = {
 clientId: process.env.ZOOM_CLIENT_ID,
 clientSecret: process.env.ZOOM_CLIENT_SECRET,
 botJid: process.env.ZOOM_BOT_JID,
 webhookSecret: process.env.ZOOM_WEBHOOK_SECRET_TOKEN,
 verificationCode: process.env.ZOOM_VERIFICATION_CODE,

 oauth: {
  tokenUrl: "https://zoom.us/oauth/token?grant_type=client_credentials",
 },
 api: {
  baseUrl: "https://api.zoom.us/v2",
  chatMessagesUrl: "https://api.zoom.us/v2/im/chat/messages",
 },
};

export function validateZoomConfig() {
 const required = ["clientId", "clientSecret", "botJid"];
 const missing = required.filter((key) => !zoomConfig[key]);

 if (missing.length > 0) {
  throw new Error(`Missing required Zoom configuration: ${missing.join(", ")}`);
 }
}

export default zoomConfig;
