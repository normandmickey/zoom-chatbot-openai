import express from "express";
import subscriptionService from "../services/subscription/subscriptionService.js";
import { asyncHandler } from "../utils/errorHandler.js";
import logger from "../utils/logger.js";

const router = express.Router();

router.get(
 "/subscription/:userJid",
 asyncHandler(async (req, res) => {
  const { userJid } = req.params;

  const tier = await subscriptionService.getUserTier(userJid);
  const config = subscriptionService.getTierConfig(tier);

  res.status(200).json({
   success: true,
   data: {
    userJid,
    tier,
    config,
   },
  });
 })
);

router.put(
 "/subscription/:userJid",
 asyncHandler(async (req, res) => {
  const { userJid } = req.params;
  const { tier } = req.body;

  if (!tier || !["free", "mid", "premium"].includes(tier)) {
   return res.status(400).json({
    success: false,
    error: "Invalid tier. Must be 'free', 'mid', or 'premium'",
   });
  }

  await subscriptionService.setUserTier(userJid, tier);

  logger.info("User subscription updated", { userJid, tier });

  res.status(200).json({
   success: true,
   message: "Subscription tier updated successfully",
   data: {
    userJid,
    tier,
   },
  });
 })
);

router.get(
 "/tiers",
 asyncHandler(async (req, res) => {
  const tiers = subscriptionService.getAllTiers();

  res.status(200).json({
   success: true,
   data: tiers,
  });
 })
);

router.get(
 "/subscription/:userJid/features",
 asyncHandler(async (req, res) => {
  const { userJid } = req.params;

  const tier = await subscriptionService.getUserTier(userJid);
  const hasRag = await subscriptionService.hasFeatureAccess(userJid, "rag");
  const hasTools = await subscriptionService.hasFeatureAccess(userJid, "tools");
  const enabledTools = await subscriptionService.getEnabledTools(userJid);
  const description = await subscriptionService.getTierDescription(userJid);

  res.status(200).json({
   success: true,
   data: {
    userJid,
    tier,
    features: {
     rag_enabled: hasRag,
     tools_enabled: hasTools,
     enabled_tools: enabledTools,
    },
    description,
   },
  });
 })
);

export default router;
