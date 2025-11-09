import pool from "../../config/database.js";
import logger from "../../utils/logger.js";
import subscriptionTiers from "../../constants/subscriptionTiers.json" with { type: "json" };

class SubscriptionService {
  constructor() {
    this.tiers = subscriptionTiers.tiers;
  }

  /**
   * Initialize the subscriptions table in the database
   */
  async initialize() {
    try {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS user_subscriptions (
          user_jid VARCHAR(255) PRIMARY KEY,
          tier VARCHAR(50) NOT NULL DEFAULT 'free',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_tier ON user_subscriptions(tier);
      `;

      await pool.query(createTableQuery);
      logger.info("Subscriptions table initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize subscriptions table", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get user's subscription tier
   * @param {string} userJid - User's JID
   * @returns {Promise<string>} Tier name (free, mid, premium)
   */
  async getUserTier(userJid) {
    try {
      const query = "SELECT tier FROM user_subscriptions WHERE user_jid = $1";
      const result = await pool.query(query, [userJid]);

      if (result.rows.length === 0) {
        // Default to free tier for new users
        await this.setUserTier(userJid, "free");
        return "free";
      }

      return result.rows[0].tier;
    } catch (error) {
      logger.error("Error getting user tier", {
        userJid,
        error: error.message,
      });
      // Default to free on error
      return "free";
    }
  }

  /**
   * Set user's subscription tier
   * @param {string} userJid - User's JID
   * @param {string} tier - Tier name (free, mid, premium)
   * @returns {Promise<void>}
   */
  async setUserTier(userJid, tier) {
    if (!this.tiers[tier]) {
      throw new Error(`Invalid tier: ${tier}`);
    }

    try {
      const query = `
        INSERT INTO user_subscriptions (user_jid, tier, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (user_jid) 
        DO UPDATE SET tier = $2, updated_at = CURRENT_TIMESTAMP
      `;

      await pool.query(query, [userJid, tier]);

      logger.info("User tier updated", { userJid, tier });
    } catch (error) {
      logger.error("Error setting user tier", {
        userJid,
        tier,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get tier configuration
   * @param {string} tier - Tier name
   * @returns {Object} Tier configuration
   */
  getTierConfig(tier) {
    return this.tiers[tier] || this.tiers.free;
  }

  /**
   * Check if user has access to a specific feature
   * @param {string} userJid - User's JID
   * @param {string} feature - Feature name
   * @returns {Promise<boolean>}
   */
  async hasFeatureAccess(userJid, feature) {
    const tier = await this.getUserTier(userJid);
    const config = this.getTierConfig(tier);

    if (feature === "rag") {
      return config.features.rag_enabled;
    }

    if (feature === "tools") {
      return config.features.enabled_tools.length > 0;
    }

    return config.features[feature] || false;
  }

  /**
   * Get enabled tools for user's tier
   * @param {string} userJid - User's JID
   * @returns {Promise<Array<string>>}
   */
  async getEnabledTools(userJid) {
    const tier = await this.getUserTier(userJid);
    const config = this.getTierConfig(tier);
    return config.features.enabled_tools;
  }

  /**
   * Get feature description for user's tier
   * @param {string} userJid - User's JID
   * @returns {Promise<string>}
   */
  async getTierDescription(userJid) {
    const tier = await this.getUserTier(userJid);
    const config = this.getTierConfig(tier);
    return config.displayMessage;
  }

  /**
   * List all available tiers
   * @returns {Object} All tier configurations
   */
  getAllTiers() {
    return this.tiers;
  }
}

const subscriptionService = new SubscriptionService();
export default subscriptionService;