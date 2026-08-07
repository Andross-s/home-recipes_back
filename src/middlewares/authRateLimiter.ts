import rateLimit from "express-rate-limit";
import { HttpError } from "../utils/HttpError";

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(
      new HttpError(429, "TOO_MANY_REQUESTS", "Too many requests, please try again later"),
    );
  },
});
