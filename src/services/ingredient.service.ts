import { Ingredient, IIngredient } from "../models/ingredient";
import { Recipe } from "../models/recipe";
import { Locale, MultilingualName } from "../types/i18n";
import { escapeRegex } from "../utils/escapeRegex";
import { HttpError } from "../utils/HttpError";
import { uploadImage } from "./cloudinary.service";

interface IngredientPayload {
  name: MultilingualName;
}

export const getIngredients = async (
  search?: string,
  lang: Locale = "uk",
): Promise<IIngredient[]> => {
  const filter = search ? { [`name.${lang}`]: { $regex: escapeRegex(search), $options: "i" } } : {};
  // .lean(): read-only list, never saved — skips hydrating full documents.
  return Ingredient.find(filter).sort({ "name.uk": 1 }).lean<IIngredient[]>();
};

export const createIngredient = async (
  payload: IngredientPayload,
  fileBuffer?: Buffer,
): Promise<IIngredient> => {
  // Uniqueness is enforced on name.uk — the base/fallback locale.
  const existing = await Ingredient.exists({ "name.uk": payload.name.uk });
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

  if (payload.name?.uk && payload.name.uk !== ingredient.name.uk) {
    const existing = await Ingredient.exists({ "name.uk": payload.name.uk });
    if (existing) {
      throw new HttpError(
        409,
        "INGREDIENT_ALREADY_EXISTS",
        "Ingredient with this name already exists",
      );
    }
  }

  // Merge rather than replace `name` so PATCH can set e.g. only name.ka
  // without wiping out the already-translated uk/en values.
  const { name, ...rest } = payload;
  if (name) {
    ingredient.name = { ...ingredient.name, ...name };
  }
  Object.assign(ingredient, rest);

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
