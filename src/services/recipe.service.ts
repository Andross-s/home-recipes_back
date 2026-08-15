import crypto from "node:crypto";
import { FilterQuery, Types } from "mongoose";
import { Category } from "../models/category";
import { Ingredient } from "../models/ingredient";
import { IRecipe, MAX_RECIPE_IMAGES, Recipe, RecipeImage } from "../models/recipe";
import { User } from "../models/user";
import { Group } from "../types/group";
import { escapeRegex } from "../utils/escapeRegex";
import { HttpError } from "../utils/HttpError";
import { deleteImage, uploadImage } from "./cloudinary.service";

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

interface UpdateRecipePayload extends Partial<RecipePayload> {
  imagesToDelete?: string[];
  imageOrder?: string[];
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

const assertImageCountWithinLimit = (count: number): void => {
  if (count > MAX_RECIPE_IMAGES) {
    throw new HttpError(
      400,
      "TOO_MANY_IMAGES",
      `A recipe can have at most ${MAX_RECIPE_IMAGES} images`,
    );
  }
};

const uploadRecipeImage = async (recipeId: Types.ObjectId, buffer: Buffer): Promise<RecipeImage> => {
  // Random suffix (not just recipeId) so multiple images on the same recipe
  // never collide/overwrite each other in Cloudinary.
  const publicId = `home-recipes/recipes/${recipeId}/${crypto.randomBytes(8).toString("hex")}`;
  const url = await uploadImage(publicId, buffer);
  return { url, publicId };
};

// Applies imagesToDelete (removing files from Cloudinary too) and imageOrder
// to the current images array. Images without a publicId (legacy, migrated
// from the old imageUrl field) can't be individually targeted by either
// operation — they keep their relative order and are appended at the end.
const applyImageDeleteAndOrder = async (
  images: RecipeImage[],
  imagesToDelete?: string[],
  imageOrder?: string[],
): Promise<RecipeImage[]> => {
  let surviving = images;

  if (imagesToDelete && imagesToDelete.length > 0) {
    const toDelete = new Set(imagesToDelete);
    const removed = surviving.filter((img) => img.publicId && toDelete.has(img.publicId));
    surviving = surviving.filter((img) => !(img.publicId && toDelete.has(img.publicId)));

    await Promise.all(
      removed.map(async (img) => {
        try {
          await deleteImage(img.publicId as string);
        } catch (error) {
          console.error(`Failed to delete Cloudinary image ${img.publicId}:`, error);
        }
      }),
    );
  }

  if (imageOrder && imageOrder.length > 0) {
    const addressable = surviving.filter((img) => img.publicId);
    const unaddressable = surviving.filter((img) => !img.publicId);
    const byPublicId = new Map(addressable.map((img) => [img.publicId as string, img]));

    const ordered: RecipeImage[] = [];
    for (const publicId of imageOrder) {
      const match = byPublicId.get(publicId);
      if (match) {
        ordered.push(match);
        byPublicId.delete(publicId);
      }
    }
    // Anything not mentioned in imageOrder keeps its relative order and is
    // appended after the explicitly-ordered images, so nothing is silently
    // dropped if the client's order list is incomplete.
    surviving = [...ordered, ...byPublicId.values(), ...unaddressable];
  }

  return surviving;
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
  fileBuffers: Buffer[],
): Promise<IRecipe> => {
  await assertCategoryMatchesGroup(payload.category, payload.group);
  await assertIngredientsExist(payload.ingredients ?? []);
  assertImageCountWithinLimit(fileBuffers.length);

  const recipe = await Recipe.create({ ...payload, owner: ownerId });

  if (fileBuffers.length > 0) {
    recipe.images = await Promise.all(
      fileBuffers.map((buffer) => uploadRecipeImage(recipe._id, buffer)),
    );
    await recipe.save();
  }

  return recipe;
};

export const updateRecipe = async (
  id: string,
  userId: string,
  role: string,
  payload: UpdateRecipePayload,
  fileBuffers: Buffer[],
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

  const { imagesToDelete, imageOrder, ...recipeFields } = payload;
  Object.assign(recipe, recipeFields);

  let images = await applyImageDeleteAndOrder(recipe.images, imagesToDelete, imageOrder);
  assertImageCountWithinLimit(images.length + fileBuffers.length);

  if (fileBuffers.length > 0) {
    const uploaded = await Promise.all(
      fileBuffers.map((buffer) => uploadRecipeImage(recipe._id, buffer)),
    );
    images = [...images, ...uploaded];
  }

  recipe.images = images;

  await recipe.save();
  return recipe;
};

export const deleteRecipe = async (id: string, userId: string, role: string): Promise<void> => {
  const recipe = await Recipe.findById(id);
  if (!recipe) {
    throw new HttpError(404, "RECIPE_NOT_FOUND", "Recipe not found");
  }
  assertCanModify(recipe, userId, role);

  await Promise.all(
    recipe.images
      .filter((img) => img.publicId)
      .map(async (img) => {
        try {
          await deleteImage(img.publicId as string);
        } catch (error) {
          console.error(`Failed to delete Cloudinary image ${img.publicId}:`, error);
        }
      }),
  );

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
