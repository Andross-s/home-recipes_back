import { Router } from "express";
import * as ingredientController from "../controllers/ingredient.controller";
import { authenticate } from "../middlewares/authenticate";
import { imageUpload } from "../middlewares/imageUpload";
import { isAdmin } from "../middlewares/isAdmin";
import { isValidId } from "../middlewares/isValidId";
import { validateBody } from "../middlewares/validateBody";
import { ingredientSchema, updateIngredientSchema } from "../models/ingredient.schemas";
import { ctrlWrapper } from "../utils/ctrlWrapper";

const router = Router();

router.get("/", ctrlWrapper(ingredientController.getIngredients));
router.post(
  "/",
  authenticate,
  isAdmin,
  imageUpload.single("image"),
  validateBody(ingredientSchema),
  ctrlWrapper(ingredientController.createIngredient),
);
router.patch(
  "/:id",
  authenticate,
  isAdmin,
  isValidId(),
  imageUpload.single("image"),
  validateBody(updateIngredientSchema),
  ctrlWrapper(ingredientController.updateIngredient),
);
router.delete(
  "/:id",
  authenticate,
  isAdmin,
  isValidId(),
  ctrlWrapper(ingredientController.deleteIngredient),
);

export default router;
