import { Ingredient, IIngredient } from "../models/ingredient";
import { Recipe } from "../models/recipe";
import { HttpError } from "../utils/HttpError";
import { uploadImage } from "./cloudinary.service";

interface IngredientPayload {
  name: string;
}

export const getIngredients = async (search?: string): Promise<IIngredient[]> => {
  const filter = search ? { name: { $regex: search, $options: "i" } } : {};
  return Ingredient.find(filter).sort({ name: 1 });
};

export const createIngredient = async (
  payload: IngredientPayload,
  fileBuffer?: Buffer,
): Promise<IIngredient> => {
  const existing = await Ingredient.findOne({ name: payload.name });
  if (existing) {
    throw new HttpError(
      409,
      "INGREDIENT_ALREADY_EXISTS",
      "Ingredient with this name already exists",
    );
  }

  const ingredient = await Ingredient.create(payload);

  if (fileBuffer) {
    ingredient.imageUrl = await uploadImage(
      `home-recipes/ingredients/${ingredient._id}`,
      fileBuffer,
    );
    await ingredient.save();
  }

  return ingredient;
};

export const updateIngredient = async (
  id: string,
  payload: Partial<IngredientPayload>,
  fileBuffer?: Buffer,
): Promise<IIngredient> => {
  const ingredient = await Ingredient.findById(id);
  if (!ingredient) {
    throw new HttpError(404, "INGREDIENT_NOT_FOUND", "Ingredient not found");
  }

  if (payload.name && payload.name !== ingredient.name) {
    const existing = await Ingredient.findOne({ name: payload.name });
    if (existing) {
      throw new HttpError(
        409,
        "INGREDIENT_ALREADY_EXISTS",
        "Ingredient with this name already exists",
      );
    }
  }

  Object.assign(ingredient, payload);

  if (fileBuffer) {
    ingredient.imageUrl = await uploadImage(
      `home-recipes/ingredients/${ingredient._id}`,
      fileBuffer,
    );
  }

  await ingredient.save();
  return ingredient;
};

export const deleteIngredient = async (id: string): Promise<void> => {
  const ingredient = await Ingredient.findById(id);
  if (!ingredient) {
    throw new HttpError(404, "INGREDIENT_NOT_FOUND", "Ingredient not found");
  }

  const recipesUsingIngredient = await Recipe.countDocuments({
    "ingredients.ingredient": id,
  });
  if (recipesUsingIngredient > 0) {
    throw new HttpError(
      409,
      "INGREDIENT_IN_USE",
      "Ingredient cannot be deleted because recipes reference it",
    );
  }

  await ingredient.deleteOne();
};
