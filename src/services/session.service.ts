import { Session } from "../models/session";
import { HttpError } from "../utils/HttpError";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { JwtPayload } from "../types/auth";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export const createSession = async (payload: JwtPayload): Promise<TokenPair> => {
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await Session.create({
    userId: payload.id,
    accessToken,
    refreshToken,
    accessTokenValidUntil: new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000),
    refreshTokenValidUntil: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
  });

  return { accessToken, refreshToken };
};

export const refreshSession = async (refreshToken: string): Promise<TokenPair> => {
  let payload: JwtPayload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new HttpError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
  }

  const session = await Session.findOne({ refreshToken });
  if (!session || session.refreshTokenValidUntil < new Date()) {
    throw new HttpError(401, "SESSION_NOT_FOUND", "Session not found or expired");
  }

  await Session.deleteOne({ _id: session._id });

  return createSession({ role: payload.role, id: payload.id });
};

export const deleteSessionByAccessToken = async (accessToken: string): Promise<void> => {
  await Session.deleteOne({ accessToken });
};
