import { Document, Schema, Types, model } from "mongoose";
import { MultilingualName } from "../types/i18n";

export interface IIngredient extends Document {
  _id: Types.ObjectId;
  name: MultilingualName;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const multilingualNameSchema = new Schema<MultilingualName>(
  {
    uk: { type: String, required: true, trim: true },
    en: { type: String, trim: true },
    ka: { type: String, trim: true },
  },
  { _id: false },
);

const ingredientSchema = new Schema<IIngredient>(
  {
    name: { type: multilingualNameSchema, required: true },
    imageUrl: { type: String },
  },
  { timestamps: true, versionKey: false },
);

// Uniqueness is checked against name.uk — the base/fallback locale of the dictionary.
ingredientSchema.index({ "name.uk": 1 }, { unique: true });

export const Ingredient = model<IIngredient>("Ingredient", ingredientSchema);
