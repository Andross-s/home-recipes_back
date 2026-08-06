import { NextFunction, Request, Response } from "express";
import { ObjectSchema } from "joi";
import { HttpError } from "../utils/HttpError";

export const validateBody =
  (schema: ObjectSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details.map((detail) => detail.message).join("; ");
      next(new HttpError(400, "VALIDATION_ERROR", message));
      return;
    }

    req.body = value;
    next();
  };
