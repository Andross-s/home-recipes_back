import Joi from "joi";
import { GROUPS } from "../types/group";

export const categorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  group: Joi.string()
    .valid(...GROUPS)
    .required(),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  group: Joi.string().valid(...GROUPS),
}).min(1);
