import express from "express";
import rateLimit from "express-rate-limit";
import { createLogger } from "./logger.js";
const logger = createLogger();
const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
});

app.use(limiter);

app.get("/", (req: any, res: any) => {
  res.send("Hello World!");
});

app.listen(3000, () => {
  logger.info("Server started on port 3000");
});
