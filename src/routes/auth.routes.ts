import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { authenticate } from "../middlewares/authenticate";
import { validateBody } from "../middlewares/validateBody";
import {
  loginSchema,
  refreshSchema,
  registerSchema,
  resendVerificationSchema,
} from "../models/user.schemas";
import { ctrlWrapper } from "../utils/ctrlWrapper";

const router = Router();

router.post("/register", validateBody(registerSchema), ctrlWrapper(authController.register));
router.get("/verify-email/:token", ctrlWrapper(authController.verifyEmail));
router.post(
  "/resend-verification",
  validateBody(resendVerificationSchema),
  ctrlWrapper(authController.resendVerification),
);
router.post("/login", validateBody(loginSchema), ctrlWrapper(authController.login));
router.post("/refresh", validateBody(refreshSchema), ctrlWrapper(authController.refresh));
router.post("/logout", authenticate, ctrlWrapper(authController.logout));

export default router;
