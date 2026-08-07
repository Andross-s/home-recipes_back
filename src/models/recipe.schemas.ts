import Joi from "joi";
import { GROUPS } from "../types/group";
import { objectId } from "../utils/joiObjectId";

const recipeIngredientSchema = Joi.object({
  ingredient: objectId.required(),
  amount: Joi.string().trim().min(1).max(100).required(),
});

export const recipeSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200).required(),
  description: Joi.string().trim().max(2000).allow(""),
  group: Joi.string()
    .valid(...GROUPS)
    .required(),
  category: objectId.required(),
  ingredients: Joi.array().items(recipeIngredientSchema).default([]),
  steps: Joi.array().items(Joi.string().trim().min(1)).min(1).required(),
  cookTime: Joi.number().integer().positive(),
});

export const updateRecipeSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200),
  description: Joi.string().trim().max(2000).allow(""),
  group: Joi.string().valid(...GROUPS),
  category: objectId,
  ingredients: Joi.array().items(recipeIngredientSchema),
  steps: Joi.array().items(Joi.string().trim().min(1)).min(1),
  cookTime: Joi.number().integer().positive(),
}).min(1);
