import createApp from "./src/app.js";
import logger from "./src/utils/logger.js";
import settings from "./src/constants/settings.json" assert { type: "json" };

const port = process.env.PORT || settings.app.port || 8000;

async function startServer() {
 try {
  const app = createApp();

  app.listen(port, () => {
   logger.info(`${settings.app.name} listening on port ${port}`, {
    environment: process.env.NODE_ENV || settings.app.environment,
    version: settings.app.version,
   });
   console.log(`Server running on http://localhost:${port}`);
  });
 } catch (error) {
  logger.error("Failed to start server", { error: error.message });
  process.exit(1);
 }
}

process.on("uncaughtException", (error) => {
 logger.error("Uncaught Exception", {
  error: error.message,
  stack: error.stack,
 });
 process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
 logger.error("Unhandled Rejection", {
  reason,
  promise,
 });
 process.exit(1);
});

process.on("SIGTERM", () => {
 logger.info("SIGTERM signal received: closing HTTP server");
 process.exit(0);
});

process.on("SIGINT", () => {
 logger.info("SIGINT signal received: closing HTTP server");
 process.exit(0);
});

startServer();
