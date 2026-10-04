import dotenv from "dotenv";
import Redis from "ioredis";
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  corsOrigin: process.env.CORS_ORIGIN || "*",
  pypServerUrl: process.env.PYP_SERVER_URL || "http://localhost:8000",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecrete: process.env.RAZORPAY_KEY_SECRET,

  smtpHost: process.env.SMTP_HOST,
  smtpPort: parseInt(process.env.SMTP_PORT || "587", 10),
  smtpUser: process.env.SMTP_USER,
  smtpPassword: process.env.SMTP_PASSWORD || process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM,
};

// const redisUrl = process.env.REDIS_URL;

// if (!redisUrl) {
//   console.warn("[server] Warning: REDIS_URL is not defined in environment variables.");
// }

// export const connection = redisUrl
//   ? new Redis(redisUrl, {
//       maxRetriesPerRequest: null,
//       lazyConnect: true,
//       enableReadyCheck: false,
//     })
//   : (null as unknown as Redis);

// if (connection && typeof connection.on === "function") {
//   connection.on("error", (err) => {
//     console.error("[Redis] Connection error:", err.message);
//   });
// }
