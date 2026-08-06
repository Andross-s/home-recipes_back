import jwt from "jsonwebtoken";
import { JwtPayload } from "../types/auth";

export const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 15 * 60);
export const REFRESH_TOKEN_TTL_SECONDS = Number(
  process.env.JWT_REFRESH_TTL_SECONDS ?? 30 * 24 * 60 * 60,
);

const getSecret = (secret: string | undefined, name: string): string => {
  if (!secret) {
    throw new Error(`${name} is not defined in environment variables`);
  }
  return secret;
};

export const signAccessToken = (payload: JwtPayload): string =>
  jwt.sign(payload, getSecret(process.env.JWT_ACCESS_SECRET, "JWT_ACCESS_SECRET"), {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });

export const signRefreshToken = (payload: JwtPayload): string =>
  jwt.sign(payload, getSecret(process.env.JWT_REFRESH_SECRET, "JWT_REFRESH_SECRET"), {
    expiresIn: REFRESH_TOKEN_TTL_SECONDS,
  });

export const verifyAccessToken = (token: string): JwtPayload =>
  jwt.verify(token, getSecret(process.env.JWT_ACCESS_SECRET, "JWT_ACCESS_SECRET")) as JwtPayload;

export const verifyRefreshToken = (token: string): JwtPayload =>
  jwt.verify(token, getSecret(process.env.JWT_REFRESH_SECRET, "JWT_REFRESH_SECRET")) as JwtPayload;
