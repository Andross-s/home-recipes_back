import Joi from "joi";

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email().required(),
  // capped at 72 — bcrypt silently ignores bytes beyond that
  password: Joi.string().min(8).max(72).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().required(),
});

export const updateUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
});

export const resendVerificationSchema = Joi.object({
  email: Joi.string().trim().email().required(),
});

export const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

export const updateUserRoleSchema = Joi.object({
  role: Joi.string().valid("user", "admin").required(),
});

export const updateUserBlockSchema = Joi.object({
  isBlocked: Joi.boolean().required(),
});

export const updateUserVerifiedSchema = Joi.object({
  isVerified: Joi.boolean().required(),
});
