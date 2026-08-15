import { Router } from "express";
import * as recipeController from "../controllers/recipe.controller";
import { authenticate } from "../middlewares/authenticate";
import { imageUpload } from "../middlewares/imageUpload";
import { isValidId } from "../middlewares/isValidId";
import { parseJsonFields } from "../middlewares/parseJsonFields";
import { validateBody } from "../middlewares/validateBody";
import { MAX_RECIPE_IMAGES } from "../models/recipe";
import { recipeSchema, updateRecipeSchema } from "../models/recipe.schemas";
import { ctrlWrapper } from "../utils/ctrlWrapper";

const router = Router();

// /own and /favorites* must be registered before /:id, otherwise Express
// would match them as a recipe id.
router.get("/", ctrlWrapper(recipeController.getRecipes));
router.get("/own", authenticate, ctrlWrapper(recipeController.getOwnRecipes));
router.get("/favorites", authenticate, ctrlWrapper(recipeController.getFavoriteRecipes));
router.post(
  "/favorites/:id",
  authenticate,
  isValidId(),
  ctrlWrapper(recipeController.addFavorite),
);
router.delete(
  "/favorites/:id",
  authenticate,
  isValidId(),
  ctrlWrapper(recipeController.removeFavorite),
);
router.get("/:id", isValidId(), ctrlWrapper(recipeController.getRecipeById));
router.post(
  "/",
  authenticate,
  imageUpload.array("images", MAX_RECIPE_IMAGES),
  parseJsonFields("ingredients", "steps"),
  validateBody(recipeSchema),
  ctrlWrapper(recipeController.createRecipe),
);
router.patch(
  "/:id",
  authenticate,
  isValidId(),
  imageUpload.array("images", MAX_RECIPE_IMAGES),
  parseJsonFields("ingredients", "steps", "imagesToDelete", "imageOrder"),
  validateBody(updateRecipeSchema),
  ctrlWrapper(recipeController.updateRecipe),
);
router.delete("/:id", authenticate, isValidId(), ctrlWrapper(recipeController.deleteRecipe));

export default router;
