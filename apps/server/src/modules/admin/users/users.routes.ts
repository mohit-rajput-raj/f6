import {Router} from "express"
import { asyncHandler } from "../../../middlewares/error-handler"
import { usersController } from "./users.controller";
const router:Router = Router();
router.get("/users/" , asyncHandler(usersController.getUsers));
router.get("/user/:id" , asyncHandler(usersController.getUserById));
export default router