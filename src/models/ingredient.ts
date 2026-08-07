import { Document, Schema, Types, model } from "mongoose";

export interface IIngredient extends Document {
  _id: Types.ObjectId;
  name: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ingredientSchema = new Schema<IIngredient>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    imageUrl: { type: String },
  },
  { timestamps: true, versionKey: false },
);

export const Ingredient = model<IIngredient>("Ingredient", ingredientSchema);
