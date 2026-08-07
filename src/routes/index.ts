import { Router } from "express";
import authRouter from "./auth.routes";
import categoryRouter from "./category.routes";
import ingredientRouter from "./ingredient.routes";
import userRouter from "./user.routes";

const router = Router();

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/categories", categoryRouter);
router.use("/ingredients", ingredientRouter);

export default router;
