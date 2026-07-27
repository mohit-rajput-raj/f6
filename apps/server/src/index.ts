import express, { type Express } from "express";
import http from "http";
import cors from "cors";
import { config } from "./config/env.js";
import { globalLimiter } from "./middlewares/rate-limiter.js";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler.js";
import apiRoutes from "./routes/index.js";
import { webSocketManager } from "./websocket.js";

const app: Express = express();
const server = http.createServer(app);

// ─── Global Middleware ──────────────────────────────────────
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(globalLimiter);

// ─── API Routes ─────────────────────────────────────────────
app.use("/api/v1", apiRoutes);

// ─── Error Handling ─────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── WebSockets Initialization ─────────────────────────────
webSocketManager.initialize(server);

// ─── Start HTTP Server ──────────────────────────────────────
server.listen(config.port, () => {
  console.log(`[server] ✓ Running on http://localhost:${config.port}`);
  console.log(`[server] ✓ API base: http://localhost:${config.port}/api/v1`);
  console.log(`[server] ✓ WebSockets: ws://localhost:${config.port}/ws`);
  console.log(`[server] ✓ Python server: ${config.pypServerUrl}`);
});

export default app;
