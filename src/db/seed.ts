import "dotenv/config";
import mongoose from "mongoose";
import { Category } from "../models/category";
import { Ingredient } from "../models/ingredient";
import { MultilingualName } from "../types/i18n";
import { initMongoConnection } from "./initMongoConnection";

// Minimal starter data so frontend development isn't blocked on an empty DB.
// Subcategories aren't decided yet — keep this short (2-3 per group) and easy
// to edit; it is not meant to be the final category/ingredient list.
// ka (Georgian) translations aren't available yet — name.uk is the required
// fallback locale, so leaving ka empty doesn't block the frontend.
const CATEGORIES: { name: MultilingualName; group: "recipes" | "conservation" }[] = [
  { name: { uk: "Супи", en: "Soups" }, group: "recipes" },
  { name: { uk: "Другі страви", en: "Main Dishes" }, group: "recipes" },
  { name: { uk: "Десерти", en: "Desserts" }, group: "recipes" },
  { name: { uk: "Соління", en: "Pickling" }, group: "conservation" },
  { name: { uk: "Варення", en: "Jams" }, group: "conservation" },
  { name: { uk: "Соуси", en: "Sauces" }, group: "conservation" },
];

const INGREDIENTS: MultilingualName[] = [
  { uk: "Картопля", en: "Potato" },
  { uk: "Цибуля", en: "Onion" },
  { uk: "Помідор", en: "Tomato" },
  { uk: "Цукор", en: "Sugar" },
  { uk: "Сіль", en: "Salt" },
];

const seed = async (): Promise<void> => {
  await initMongoConnection();

  for (const category of CATEGORIES) {
    await Category.findOneAndUpdate(
      { "name.uk": category.name.uk, group: category.group },
      { $setOnInsert: category },
      { upsert: true, new: true },
    );
  }
  console.log(`Seeded ${CATEGORIES.length} categories.`);

  for (const name of INGREDIENTS) {
    await Ingredient.findOneAndUpdate(
      { "name.uk": name.uk },
      { $setOnInsert: { name } },
      { upsert: true, new: true },
    );
  }
  console.log(`Seeded ${INGREDIENTS.length} ingredients.`);

  await mongoose.disconnect();
};

seed()
  .then(() => {
    console.log("Seeding complete.");
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
