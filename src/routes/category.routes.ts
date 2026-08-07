import { Router } from "express";
import * as categoryController from "../controllers/category.controller";
import { authenticate } from "../middlewares/authenticate";
import { imageUpload } from "../middlewares/imageUpload";
import { isAdmin } from "../middlewares/isAdmin";
import { isValidId } from "../middlewares/isValidId";
import { parseJsonFields } from "../middlewares/parseJsonFields";
import { validateBody } from "../middlewares/validateBody";
import { categorySchema, updateCategorySchema } from "../models/category.schemas";
import { ctrlWrapper } from "../utils/ctrlWrapper";

const router = Router();

router.get("/", ctrlWrapper(categoryController.getCategories));
router.post(
  "/",
  authenticate,
  isAdmin,
  imageUpload.single("image"),
  parseJsonFields("name"),
  validateBody(categorySchema),
  ctrlWrapper(categoryController.createCategory),
);
router.patch(
  "/:id",
  authenticate,
  isAdmin,
  isValidId(),
  imageUpload.single("image"),
  parseJsonFields("name"),
  validateBody(updateCategorySchema),
  ctrlWrapper(categoryController.updateCategory),
);
router.delete(
  "/:id",
  authenticate,
  isAdmin,
  isValidId(),
  ctrlWrapper(categoryController.deleteCategory),
);

export default router;
