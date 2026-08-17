import { Document, Schema, Types, model } from "mongoose";
import { AuthProvider, UserRole } from "../types/auth";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  authProvider: AuthProvider;
  googleId?: string;
  avatarUrl?: string;
  role: UserRole;
  isBlocked: boolean;
  isVerified: boolean;
  verificationToken?: string;
  verificationTokenExpiresAt?: Date;
  lastVerificationEmailSentAt?: Date;
  favorites: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Only email-provider accounts have a password; Google accounts authenticate
    // via verified Google ID tokens instead.
    password: {
      type: String,
      required: function (this: IUser) {
        return this.authProvider === "email";
      },
      select: false,
    },
    authProvider: { type: String, enum: ["email", "google"], required: true, default: "email" },
    // sparse: only email-provider accounts lack a googleId, and sparse keeps
    // the unique index from treating all of those "missing" values as a clash.
    googleId: { type: String, unique: true, sparse: true },
    avatarUrl: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isBlocked: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, select: false },
    verificationTokenExpiresAt: { type: Date, select: false },
    lastVerificationEmailSentAt: { type: Date, select: false },
    // Embedded on User rather than a separate Favorite(userId, recipeId) model:
    // favorites are only ever read/written scoped to one user, so there's no
    // benefit to a join, and $addToSet/$pull give atomic, duplicate-safe toggling
    // without a compound unique index.
    favorites: { type: [Schema.Types.ObjectId], ref: "Recipe", default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => {
        const {
          password: _password,
          verificationToken: _verificationToken,
          verificationTokenExpiresAt: _verificationTokenExpiresAt,
          lastVerificationEmailSentAt: _lastVerificationEmailSentAt,
          ...rest
        } = ret;
        return rest;
      },
    },
  },
);

export const User = model<IUser>("User", userSchema);
