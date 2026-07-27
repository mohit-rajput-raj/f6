import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  corsOrigin: process.env.CORS_ORIGIN || "*",
  pypServerUrl: process.env.PYP_SERVER_URL || "http://localhost:8000",
};
