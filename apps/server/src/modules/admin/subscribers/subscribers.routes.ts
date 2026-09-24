import { Router } from "express";
import { asyncHandler } from "../../../middlewares/error-handler.js";
import { subscribersController } from "./subscribers.controller.js";

const router: Router = Router();

router.get("/", asyncHandler(subscribersController.getSubscribers));
router.get("/:id", asyncHandler(subscribersController.getSubscriberById));

export default router;
