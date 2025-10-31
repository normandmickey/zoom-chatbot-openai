import express from "express";
import zoomWebhookService from "../services/zoom/webhookService.js";
import {
 validateZoomWebhook,
 validateRequestBody,
} from "../middleware/validation.js";
import { asyncHandler } from "../utils/errorHandler.js";

const router = express.Router();

router.post(
 "/",
 validateRequestBody,
 validateZoomWebhook,
 asyncHandler(async (req, res) => {
  await zoomWebhookService.handleWebhook(req, res);
 })
);

export default router;
