import { Router } from "express";
import * as userController from "../controllers/user.controller";
import { authenticate } from "../middlewares/authenticate";
import { avatarUpload } from "../middlewares/avatarUpload";
import { validateBody } from "../middlewares/validateBody";
import { updateUserSchema } from "../models/user.schemas";
import { ctrlWrapper } from "../utils/ctrlWrapper";

const router = Router();

router.get("/me", authenticate, ctrlWrapper(userController.getMe));
router.patch(
  "/me",
  authenticate,
  validateBody(updateUserSchema),
  ctrlWrapper(userController.updateMe),
);
router.patch(
  "/me/avatar",
  authenticate,
  avatarUpload.single("avatar"),
  ctrlWrapper(userController.updateAvatar),
);

export default router;
