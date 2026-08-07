import "dotenv/config";
import mongoose from "mongoose";
import { Category } from "../models/category";
import { Ingredient } from "../models/ingredient";
import { initMongoConnection } from "./initMongoConnection";

// Minimal starter data so frontend development isn't blocked on an empty DB.
// Subcategories aren't decided yet — keep this short (2-3 per group) and easy
// to edit; it is not meant to be the final category/ingredient list.
const CATEGORIES: { name: string; group: "recipes" | "conservation" }[] = [
  { name: "Soups", group: "recipes" },
  { name: "Main Dishes", group: "recipes" },
  { name: "Desserts", group: "recipes" },
  { name: "Pickling", group: "conservation" },
  { name: "Jams", group: "conservation" },
  { name: "Sauces", group: "conservation" },
];

const INGREDIENTS: string[] = ["Potato", "Onion", "Tomato", "Sugar", "Salt"];

const seed = async (): Promise<void> => {
  await initMongoConnection();

  for (const category of CATEGORIES) {
    await Category.findOneAndUpdate(
      { name: category.name, group: category.group },
      { $setOnInsert: category },
      { upsert: true, new: true },
    );
  }
  console.log(`Seeded ${CATEGORIES.length} categories.`);

  for (const name of INGREDIENTS) {
    await Ingredient.findOneAndUpdate(
      { name },
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
