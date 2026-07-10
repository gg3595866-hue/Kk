import app from "./app";
import { logger } from "./lib/logger";
import { startTor } from "./lib/tor";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});

// Start Tor in the background — proxy endpoints return 503 until it's ready
startTor().catch((err) => {
  logger.error({ err }, "Tor failed to start — proxy will be unavailable");
});
