import Joi, { CustomHelpers } from "joi";
import { isValidObjectId } from "mongoose";

export const objectId = Joi.string().custom((value: string, helpers: CustomHelpers) => {
  if (!isValidObjectId(value)) {
    return helpers.error("any.invalid");
  }
  return value;
}, "Mongo ObjectId validation");
