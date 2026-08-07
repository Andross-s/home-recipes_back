import Joi from "joi";
import { multilingualNameSchema, multilingualNameUpdateSchema } from "./i18n.schemas";

export const ingredientSchema = Joi.object({
  name: multilingualNameSchema.required(),
});

export const updateIngredientSchema = Joi.object({
  name: multilingualNameUpdateSchema.required(),
});
