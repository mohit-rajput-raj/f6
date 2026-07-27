import app from "./src/index.js";
import { createLogger } from "./logger.js";

const logger = createLogger();
logger.info("Server loaded via index.ts entry point");

export default app;
