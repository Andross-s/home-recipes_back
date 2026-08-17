import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import * as sessionService from "../services/session.service";
import { HttpError } from "../utils/HttpError";

export const register = async (req: Request, res: Response): Promise<void> => {
  await authService.register(req.body);
  res.status(201).json({
    status: 201,
    message: "Registration successful, please check your email to verify your account",
  });
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params;
  if (!token) {
    throw new HttpError(400, "VERIFICATION_TOKEN_REQUIRED", "Verification token is required");
  }
  await authService.verifyEmail(token);
  res.status(200).json({ status: 200, message: "Email verified successfully" });
};

export const resendVerification = async (req: Request, res: Response): Promise<void> => {
  await authService.resendVerification(req.body.email);
  res.status(200).json({ status: 200, message: "Verification email sent" });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);
  res.status(200).json({
    status: 200,
    data: { user, accessToken, refreshToken },
  });
};

export const loginWithGoogle = async (req: Request, res: Response): Promise<void> => {
  const { user, accessToken, refreshToken } = await authService.loginWithGoogle(req.body.idToken);
  res.status(200).json({
    status: 200,
    data: { user, accessToken, refreshToken },
  });
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const tokens = await sessionService.refreshSession(req.body.refreshToken);
  res.status(200).json({ status: 200, data: tokens });
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  await sessionService.deleteSessionByAccessToken(req.accessToken as string);
  res.status(204).send();
};
