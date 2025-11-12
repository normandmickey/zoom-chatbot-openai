import express from "express";
import webhookRouter from "./webhook.js";
import adminRouter from "./admin.js";

const router = express.Router();

router.get("/test", (req, res) => {
 res.status(200).json({
  status: "ok",
  message: "Zoom RAG Chatbot API",
  timestamp: new Date().toISOString(),
 });
});

router.get("/health", (req, res) => {
 res.status(200).json({
  status: "healthy",
  timestamp: new Date().toISOString(),
 });
});

router.use("/webhook", webhookRouter);

router.use("/admin", adminRouter);

export default router;