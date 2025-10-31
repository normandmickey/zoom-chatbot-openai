import express from "express";
import webhookRouter from "./webhook.js";

const router = express.Router();

router.get("/", (req, res) => {
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

router.use("/openai", webhookRouter);

export default router;
