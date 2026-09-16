import { Router } from "express";
import { asyncHandler } from "../../../middlewares/error-handler.js";
import { usersController } from "./users.controller.js";
const router: Router = Router();
router.get("/users/", asyncHandler(usersController.getUsers));
router.get("/user/:id", asyncHandler(usersController.getUserById));
export default router;
