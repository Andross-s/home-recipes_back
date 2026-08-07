import { Request, Response } from "express";
import * as categoryService from "../services/category.service";

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  const { group } = req.query;
  const categories = await categoryService.getCategories(
    typeof group === "string" ? group : undefined,
  );
  res.status(200).json({ status: 200, data: { categories } });
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  const category = await categoryService.createCategory(req.body, req.file?.buffer);
  res.status(201).json({ status: 201, data: { category } });
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  // isValidId middleware guarantees params.id is present and a valid ObjectId
  const category = await categoryService.updateCategory(
    req.params.id as string,
    req.body,
    req.file?.buffer,
  );
  res.status(200).json({ status: 200, data: { category } });
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  await categoryService.deleteCategory(req.params.id as string);
  res.status(204).send();
};
