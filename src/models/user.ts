import { Document, Schema, Types, model } from "mongoose";
import { UserRole } from "../types/auth";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  avatarUrl?: string;
  role: UserRole;
  isBlocked: boolean;
  isVerified: boolean;
  verificationToken?: string;
  verificationTokenExpiresAt?: Date;
  lastVerificationEmailSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    avatarUrl: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isBlocked: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, select: false },
    verificationTokenExpiresAt: { type: Date, select: false },
    lastVerificationEmailSentAt: { type: Date, select: false },
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
