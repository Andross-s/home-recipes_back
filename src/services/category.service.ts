import { Types } from "mongoose";
import { Category, ICategory } from "../models/category";
import { Recipe } from "../models/recipe";
import { Group } from "../types/group";
import { MultilingualName } from "../types/i18n";
import { HttpError } from "../utils/HttpError";
import { uploadImage } from "./cloudinary.service";

interface CategoryPayload {
  name: MultilingualName;
  group: Group;
}

// Plain shape (not `extends ICategory`) since these come from `.lean()` —
// a lean result isn't a Mongoose Document and doesn't have its methods.
export interface CategoryWithRecipeCount {
  _id: Types.ObjectId;
  name: MultilingualName;
  group: Group;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  recipeCount: number;
}

export const getCategories = async (group?: string): Promise<CategoryWithRecipeCount[]> => {
  const filter = group ? { group } : {};
  // .lean(): read-only list, never saved — skips hydrating full documents.
  // recipeCount comes from a single grouped aggregation rather than one
  // countDocuments() per category, so the list stays a fixed two queries
  // regardless of how many categories exist.
  const [categories, counts] = await Promise.all([
    Category.find(filter).sort({ "name.uk": 1 }).lean<ICategory[]>(),
    Recipe.aggregate<{ _id: unknown; count: number }>([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
  ]);

  const recipeCountByCategoryId = new Map(counts.map((entry) => [String(entry._id), entry.count]));
  return categories.map((category) => ({
    ...category,
    recipeCount: recipeCountByCategoryId.get(String(category._id)) ?? 0,
  }));
};

export const createCategory = async (
  payload: CategoryPayload,
  fileBuffer?: Buffer,
): Promise<ICategory> => {
  const category = await Category.create(payload);

  if (fileBuffer) {
    category.imageUrl = await uploadImage(`home-recipes/categories/${category._id}`, fileBuffer);
    await category.save();
  }

  return category;
};

export const updateCategory = async (
  id: string,
  payload: Partial<CategoryPayload>,
  fileBuffer?: Buffer,
): Promise<ICategory> => {
  const category = await Category.findById(id);
  if (!category) {
    throw new HttpError(404, "CATEGORY_NOT_FOUND", "Category not found");
  }

  // Merge rather than replace `name` so PATCH can set e.g. only name.ka
  // without wiping out the already-translated uk/en values.
  const { name, ...rest } = payload;
  if (name) {
    category.name = { ...category.name, ...name };
  }
  Object.assign(category, rest);

  if (fileBuffer) {
    category.imageUrl = await uploadImage(`home-recipes/categories/${category._id}`, fileBuffer);
  }

  await category.save();
  return category;
};

export const deleteCategory = async (id: string): Promise<void> => {
  const category = await Category.findById(id);
  if (!category) {
    throw new HttpError(404, "CATEGORY_NOT_FOUND", "Category not found");
  }

  const recipesUsingCategory = await Recipe.countDocuments({ category: id });
  if (recipesUsingCategory > 0) {
    throw new HttpError(
      409,
      "CATEGORY_IN_USE",
      "Category cannot be deleted because recipes reference it",
    );
  }

  await category.deleteOne();
};
