import Joi from "joi";

// uk required — used when creating a new curated dictionary entry (Category/Ingredient).
export const multilingualNameSchema = Joi.object({
  uk: Joi.string().trim().min(1).max(100).required(),
  en: Joi.string().trim().max(100).allow(""),
  ka: Joi.string().trim().max(100).allow(""),
});

// All fields optional — lets PATCH add/replace just one locale (e.g. only
// name.ka) without resending the others.
export const multilingualNameUpdateSchema = Joi.object({
  uk: Joi.string().trim().min(1).max(100),
  en: Joi.string().trim().max(100).allow(""),
  ka: Joi.string().trim().max(100).allow(""),
}).min(1);
