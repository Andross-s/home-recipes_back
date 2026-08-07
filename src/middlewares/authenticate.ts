import { NextFunction, Request, Response } from "express";
import { Session } from "../models/session";
import { User } from "../models/user";
import { HttpError } from "../utils/HttpError";
import { verifyAccessToken } from "../utils/jwt";

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.get("Authorization");
    const [bearer, accessToken] = authHeader?.split(" ") ?? [];

    if (bearer !== "Bearer" || !accessToken) {
      throw new HttpError(
        401,
        "AUTHORIZATION_HEADER_MISSING",
        "Authorization header is missing or invalid",
      );
    }

    try {
      verifyAccessToken(accessToken);
    } catch {
      throw new HttpError(401, "INVALID_ACCESS_TOKEN", "Access token is invalid or expired");
    }

    // .lean() on both lookups: this runs on every authenticated request and
    // neither result is ever mutated/saved here.
    const session = await Session.findOne({ accessToken }).lean();
    if (!session || session.accessTokenValidUntil < new Date()) {
      throw new HttpError(401, "SESSION_NOT_FOUND", "Session not found or expired");
    }

    // Role is read from the current user document rather than the JWT claim,
    // so a role change or block takes effect immediately, not after re-login.
    const user = await User.findById(session.userId).lean();
    if (!user) {
      throw new HttpError(401, "USER_NOT_FOUND", "User not found");
    }

    if (user.isBlocked) {
      throw new HttpError(403, "ACCOUNT_BLOCKED", "This account has been blocked");
    }

    req.user = { id: user._id.toString(), role: user.role };
    req.accessToken = accessToken;
    next();
  } catch (error) {
    next(error);
  }
};
