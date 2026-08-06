import { Request, Response } from "express";
import * as userService from "../services/user.service";
import { HttpError } from "../utils/HttpError";

export const getMe = async (req: Request, res: Response): Promise<void> => {
  const user = await userService.getMe(req.user!.id);
  res.status(200).json({ status: 200, data: { user } });
};

export const updateMe = async (req: Request, res: Response): Promise<void> => {
  const user = await userService.updateName(req.user!.id, req.body.name);
  res.status(200).json({ status: 200, data: { user } });
};

export const updateAvatar = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    throw new HttpError(400, "AVATAR_FILE_REQUIRED", "Avatar file is required");
  }

  const user = await userService.updateAvatar(req.user!.id, req.file.buffer);
  res.status(200).json({ status: 200, data: { user } });
};
