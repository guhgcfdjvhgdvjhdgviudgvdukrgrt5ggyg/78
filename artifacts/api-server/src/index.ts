import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];
const _smtpUser = process.env["SMTP_USER"];
const _smtpPass = process.env["SMTP_PASS"];
const _apiBaseUrl = process.env["API_BASE_URL"];

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
