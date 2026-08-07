import { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/HttpError";

// multipart/form-data can only carry flat string fields, so clients sending an
// image alongside array/object fields (ingredients, steps) must JSON-encode
// them. Plain JSON requests already have real arrays here, so this is a no-op
// for those.
export const parseJsonFields =
  (...fields: string[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    for (const field of fields) {
      const value = req.body[field];
      if (typeof value === "string") {
        try {
          req.body[field] = JSON.parse(value);
        } catch {
          next(new HttpError(400, "INVALID_JSON_FIELD", `Field "${field}" must be valid JSON`));
          return;
        }
      }
    }
    next();
  };
