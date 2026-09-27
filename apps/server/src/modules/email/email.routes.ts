import { Router } from "express";
import { asyncHandler } from "../../middlewares/error-handler.js";
import { emailController } from "./email.controller.js";

const router: Router = Router();

// POST /api/v1/email/send-batch
router.post("/send-batch", asyncHandler(emailController.sendBatch.bind(emailController)));

// POST /api/v1/email/test-smtp
router.post("/test-smtp", asyncHandler(emailController.testSmtp.bind(emailController)));

export default router;
