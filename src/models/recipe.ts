import { Document, Schema, Types, model } from "mongoose";
import { GROUPS, Group } from "../types/group";

export interface RecipeIngredient {
  ingredient: Types.ObjectId;
  amount: string;
}

export interface IRecipe extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  group: Group;
  category: Types.ObjectId;
  ingredients: RecipeIngredient[];
  steps: string[];
  cookTime?: number;
  imageUrl?: string;
  owner: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const recipeIngredientSchema = new Schema<RecipeIngredient>(
  {
    ingredient: { type: Schema.Types.ObjectId, ref: "Ingredient", required: true },
    amount: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const recipeSchema = new Schema<IRecipe>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    group: { type: String, enum: GROUPS, required: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    ingredients: { type: [recipeIngredientSchema], default: [] },
    steps: { type: [String], default: [] },
    cookTime: { type: Number, min: 1 },
    imageUrl: { type: String },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false },
);

// Matches the most common list filters (GET /api/recipes ?group=&category=).
recipeSchema.index({ group: 1, category: 1 });
// Text index backs a future switch to MongoDB $text search; the current
// title search still uses a regex for substring matching (see recipe.service.ts).
recipeSchema.index({ title: "text" });

export const Recipe = model<IRecipe>("Recipe", recipeSchema);
