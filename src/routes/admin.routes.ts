import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import { authenticate } from "../middlewares/authenticate";
import { isAdmin } from "../middlewares/isAdmin";
import { isValidId } from "../middlewares/isValidId";
import { validateBody } from "../middlewares/validateBody";
import { updateUserBlockSchema, updateUserRoleSchema } from "../models/user.schemas";
import { ctrlWrapper } from "../utils/ctrlWrapper";

const router = Router();

router.use(authenticate, isAdmin);

router.get("/users", ctrlWrapper(adminController.getUsers));
router.patch(
  "/users/:id/role",
  isValidId(),
  validateBody(updateUserRoleSchema),
  ctrlWrapper(adminController.updateUserRole),
);
router.patch(
  "/users/:id/block",
  isValidId(),
  validateBody(updateUserBlockSchema),
  ctrlWrapper(adminController.updateUserBlockStatus),
);
router.delete("/users/:id", isValidId(), ctrlWrapper(adminController.deleteUser));

export default router;
