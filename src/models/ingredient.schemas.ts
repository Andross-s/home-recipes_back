import Joi from "joi";

export const ingredientSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
});

export const updateIngredientSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
});
