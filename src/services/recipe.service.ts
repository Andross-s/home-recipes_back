import { FilterQuery } from "mongoose";
import { Category } from "../models/category";
import { Ingredient } from "../models/ingredient";
import { IRecipe, Recipe } from "../models/recipe";
import { User } from "../models/user";
import { Group } from "../types/group";
import { escapeRegex } from "../utils/escapeRegex";
import { HttpError } from "../utils/HttpError";
import { uploadImage } from "./cloudinary.service";

interface RecipeIngredientInput {
  ingredient: string;
  amount: string;
}

interface RecipePayload {
  title: string;
  description?: string;
  group: Group;
  category: string;
  ingredients?: RecipeIngredientInput[];
  steps: string[];
  cookTime?: number;
}

interface RecipeListFilter {
  group?: string;
  category?: string;
  ingredient?: string;
  search?: string;
  page: number;
  perPage: number;
}

interface RecipeListResult {
  data: IRecipe[];
  page: number;
  perPage: number;
  totalItems: number;
}

const assertCategoryMatchesGroup = async (categoryId: string, group: Group): Promise<void> => {
  const category = await Category.findById(categoryId).lean();
  if (!category) {
    throw new HttpError(404, "CATEGORY_NOT_FOUND", "Category not found");
  }
  if (category.group !== group) {
    throw new HttpError(
      400,
      "CATEGORY_GROUP_MISMATCH",
      "Category does not belong to the same group as the recipe",
    );
  }
};

const assertIngredientsExist = async (ingredients: RecipeIngredientInput[]): Promise<void> => {
  if (ingredients.length === 0) return;

  const ids = ingredients.map((item) => item.ingredient);
  const count = await Ingredient.countDocuments({ _id: { $in: ids } });
  if (count !== new Set(ids).size) {
    throw new HttpError(404, "INGREDIENT_NOT_FOUND", "One or more ingredients were not found");
  }
};

const assertCanModify = (recipe: IRecipe, userId: string, role: string): void => {
  if (recipe.owner.toString() !== userId && role !== "admin") {
    throw new HttpError(403, "RECIPE_ACCESS_DENIED", "You can only modify your own recipes");
  }
};

export const getRecipes = async (filter: RecipeListFilter): Promise<RecipeListResult> => {
  const query: FilterQuery<IRecipe> = {};
  if (filter.group) query.group = filter.group;
  if (filter.category) query.category = filter.category;
  if (filter.ingredient) query["ingredients.ingredient"] = filter.ingredient;
  if (filter.search) query.title = { $regex: escapeRegex(filter.search), $options: "i" };

  const [data, totalItems] = await Promise.all([
    Recipe.find(query)
      .sort({ createdAt: -1 })
      .skip((filter.page - 1) * filter.perPage)
      .limit(filter.perPage)
      .lean<IRecipe[]>(),
    Recipe.countDocuments(query),
  ]);

  return { data, page: filter.page, perPage: filter.perPage, totalItems };
};

export const getRecipeById = async (id: string): Promise<IRecipe> => {
  const recipe = await Recipe.findById(id)
    .populate("category")
    .populate("ingredients.ingredient")
    .populate("owner", "name")
    .lean<IRecipe>();
  if (!recipe) {
    throw new HttpError(404, "RECIPE_NOT_FOUND", "Recipe not found");
  }
  return recipe;
};

export const createRecipe = async (
  ownerId: string,
  payload: RecipePayload,
  fileBuffer?: Buffer,
): Promise<IRecipe> => {
  await assertCategoryMatchesGroup(payload.category, payload.group);
  await assertIngredientsExist(payload.ingredients ?? []);

  const recipe = await Recipe.create({ ...payload, owner: ownerId });

  if (fileBuffer) {
    recipe.imageUrl = await uploadImage(`home-recipes/recipes/${recipe._id}`, fileBuffer);
    await recipe.save();
  }

  return recipe;
};

export const updateRecipe = async (
  id: string,
  userId: string,
  role: string,
  payload: Partial<RecipePayload>,
  fileBuffer?: Buffer,
): Promise<IRecipe> => {
  const recipe = await Recipe.findById(id);
  if (!recipe) {
    throw new HttpError(404, "RECIPE_NOT_FOUND", "Recipe not found");
  }
  assertCanModify(recipe, userId, role);

  if (payload.group || payload.category) {
    const nextGroup = payload.group ?? recipe.group;
    const nextCategory = payload.category ?? recipe.category.toString();
    await assertCategoryMatchesGroup(nextCategory, nextGroup);
  }
  if (payload.ingredients) {
    await assertIngredientsExist(payload.ingredients);
  }

  Object.assign(recipe, payload);

  if (fileBuffer) {
    recipe.imageUrl = await uploadImage(`home-recipes/recipes/${recipe._id}`, fileBuffer);
  }

  await recipe.save();
  return recipe;
};

export const deleteRecipe = async (id: string, userId: string, role: string): Promise<void> => {
  const recipe = await Recipe.findById(id);
  if (!recipe) {
    throw new HttpError(404, "RECIPE_NOT_FOUND", "Recipe not found");
  }
  assertCanModify(recipe, userId, role);

  await recipe.deleteOne();
  // Keeps every user's favorites list free of dangling references once the
  // recipe they point to is gone.
  await User.updateMany({ favorites: id }, { $pull: { favorites: id } });
};

export const getOwnRecipes = async (
  ownerId: string,
  page: number,
  perPage: number,
): Promise<RecipeListResult> => {
  const query = { owner: ownerId };
  const [data, totalItems] = await Promise.all([
    Recipe.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean<IRecipe[]>(),
    Recipe.countDocuments(query),
  ]);
  return { data, page, perPage, totalItems };
};

export const getFavoriteRecipes = async (userId: string): Promise<IRecipe[]> => {
  const user = await User.findById(userId)
    .populate({
      path: "favorites",
      populate: [{ path: "category" }, { path: "owner", select: "name" }],
    })
    .lean<{ favorites: IRecipe[] }>();
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }
  return user.favorites;
};

export const addFavorite = async (userId: string, recipeId: string): Promise<void> => {
  const recipeExists = await Recipe.exists({ _id: recipeId });
  if (!recipeExists) {
    throw new HttpError(404, "RECIPE_NOT_FOUND", "Recipe not found");
  }
  await User.updateOne({ _id: userId }, { $addToSet: { favorites: recipeId } });
};

export const removeFavorite = async (userId: string, recipeId: string): Promise<void> => {
  await User.updateOne({ _id: userId }, { $pull: { favorites: recipeId } });
};
