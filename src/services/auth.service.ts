import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { IUser, User } from "../models/user";
import { HttpError } from "../utils/HttpError";
import { sendVerificationEmail } from "./email.service";
import { createSession } from "./session.service";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESEND_VERIFICATION_COOLDOWN_MS = 60 * 1000;
const SALT_ROUNDS = 10;

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export const register = async (payload: RegisterPayload): Promise<void> => {
  const existingUser = await User.exists({ email: payload.email });
  if (existingUser) {
    throw new HttpError(409, "EMAIL_ALREADY_EXISTS", "User with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(payload.password, SALT_ROUNDS);
  const verificationToken = crypto.randomBytes(32).toString("hex");

  const user = await User.create({
    name: payload.name,
    email: payload.email,
    password: hashedPassword,
    authProvider: "email",
    verificationToken,
    verificationTokenExpiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
  });

  try {
    await sendVerificationEmail(user, verificationToken);
  } catch (error) {
    // Registration should still succeed if the mail provider is temporarily
    // unavailable — the user can request a new verification email later.
    console.error("Failed to send verification email:", error);
  }
};

export const verifyEmail = async (token: string): Promise<void> => {
  const user = await User.findOne({ verificationToken: token }).select(
    "+verificationToken +verificationTokenExpiresAt",
  );

  if (!user) {
    throw new HttpError(404, "INVALID_VERIFICATION_TOKEN", "Verification token not found");
  }

  if (!user.verificationTokenExpiresAt || user.verificationTokenExpiresAt < new Date()) {
    throw new HttpError(
      400,
      "VERIFICATION_TOKEN_EXPIRED",
      "Verification token has expired, request a new one",
    );
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpiresAt = undefined;
  await user.save();
};

export const resendVerification = async (email: string): Promise<void> => {
  const user = await User.findOne({ email }).select(
    "+verificationToken +lastVerificationEmailSentAt",
  );

  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "User with this email was not found");
  }

  if (user.isVerified) {
    throw new HttpError(409, "EMAIL_ALREADY_VERIFIED", "Email is already verified");
  }

  if (
    user.lastVerificationEmailSentAt &&
    Date.now() - user.lastVerificationEmailSentAt.getTime() < RESEND_VERIFICATION_COOLDOWN_MS
  ) {
    throw new HttpError(
      429,
      "VERIFICATION_EMAIL_RATE_LIMITED",
      "Verification email was already sent recently, try again later",
    );
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  user.verificationToken = verificationToken;
  user.verificationTokenExpiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
  user.lastVerificationEmailSentAt = new Date();
  await user.save();

  await sendVerificationEmail(user, verificationToken);
};

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResult {
  user: IUser;
  accessToken: string;
  refreshToken: string;
}

export const login = async (payload: LoginPayload): Promise<LoginResult> => {
  // Not .lean(): password is explicitly selected for the bcrypt check below,
  // and this document is returned to the client — it must stay hydrated so
  // toJSON's transform strips the password before serialization.
  const user = await User.findOne({ email: payload.email }).select("+password");
  if (!user || !user.password) {
    // !user.password covers Google-only accounts (authProvider: "google")
    // that never set a password — same generic error, so this endpoint never
    // reveals which accounts exist or how they authenticate.
    throw new HttpError(401, "INVALID_CREDENTIALS", "Email or password is invalid");
  }

  const isPasswordCorrect = await bcrypt.compare(payload.password, user.password);
  if (!isPasswordCorrect) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Email or password is invalid");
  }

  if (user.isBlocked) {
    throw new HttpError(403, "ACCOUNT_BLOCKED", "This account has been blocked");
  }

  if (process.env.REQUIRE_EMAIL_VERIFICATION === "true" && !user.isVerified) {
    throw new HttpError(403, "ACCOUNT_NOT_VERIFIED", "Email is not verified yet");
  }

  const { accessToken, refreshToken } = await createSession({
    role: user.role,
    id: user._id.toString(),
  });

  return { user, accessToken, refreshToken };
};

interface GoogleTokenPayload {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

const verifyGoogleIdToken = async (idToken: string): Promise<GoogleTokenPayload> => {
  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  } catch {
    // Signature/audience/expiry check failed — never trust client-supplied
    // claims without this verification.
    throw new HttpError(401, "INVALID_GOOGLE_TOKEN", "Google ID token is invalid or expired");
  }

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new HttpError(
      401,
      "INVALID_GOOGLE_TOKEN",
      "Google ID token payload is missing required fields",
    );
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name ?? payload.email,
    picture: payload.picture,
  };
};

export const loginWithGoogle = async (idToken: string): Promise<LoginResult> => {
  const { googleId, email, name, picture } = await verifyGoogleIdToken(idToken);

  let user = await User.findOne({ googleId });

  if (!user) {
    // Matches on email alone (not `authProvider: "email"`), so this also
    // catches accounts created before authProvider existed as a field —
    // any pre-existing user with this email, of any provider, means we must
    // not silently create a second account (and a second one would violate
    // the unique email index anyway).
    const emailTaken = await User.exists({ email });
    if (emailTaken) {
      throw new HttpError(
        409,
        "EMAIL_REGISTERED_WITH_PASSWORD",
        "This email is already registered with a password — log in with email and password instead",
      );
    }

    user = await User.create({
      authProvider: "google",
      googleId,
      email,
      name,
      avatarUrl: picture,
      // Google has already verified ownership of this email address.
      isVerified: true,
      role: "user",
    });
  }

  if (user.isBlocked) {
    throw new HttpError(403, "ACCOUNT_BLOCKED", "This account has been blocked");
  }

  const { accessToken, refreshToken } = await createSession({
    role: user.role,
    id: user._id.toString(),
  });

  return { user, accessToken, refreshToken };
};
