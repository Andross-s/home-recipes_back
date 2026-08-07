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

export const getCategories = async (group?: string): Promise<ICategory[]> => {
  const filter = group ? { group } : {};
  // .lean(): read-only list, never saved — skips hydrating full documents.
  return Category.find(filter).sort({ "name.uk": 1 }).lean<ICategory[]>();
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
