import { NextFunction, Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { HttpError } from "../utils/HttpError";

export const isValidId =
  (paramName = "id") =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!isValidObjectId(req.params[paramName])) {
      next(new HttpError(400, "INVALID_ID", `Parameter "${paramName}" is not a valid id`));
      return;
    }
    next();
  };
