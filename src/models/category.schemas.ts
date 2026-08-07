import Joi from "joi";
import { multilingualNameSchema, multilingualNameUpdateSchema } from "./i18n.schemas";
import { GROUPS } from "../types/group";

export const categorySchema = Joi.object({
  name: multilingualNameSchema.required(),
  group: Joi.string()
    .valid(...GROUPS)
    .required(),
});

export const updateCategorySchema = Joi.object({
  name: multilingualNameUpdateSchema,
  group: Joi.string().valid(...GROUPS),
}).min(1);
