import { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/HttpError";

export const isAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.user?.role !== "admin") {
    next(new HttpError(403, "ADMIN_ACCESS_REQUIRED", "This action requires admin privileges"));
    return;
  }
  next();
};
