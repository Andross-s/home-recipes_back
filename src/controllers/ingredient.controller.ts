import { Request, Response } from "express";
import * as ingredientService from "../services/ingredient.service";

export const getIngredients = async (req: Request, res: Response): Promise<void> => {
  const { search } = req.query;
  const ingredients = await ingredientService.getIngredients(
    typeof search === "string" ? search : undefined,
  );
  res.status(200).json({ status: 200, data: { ingredients } });
};

export const createIngredient = async (req: Request, res: Response): Promise<void> => {
  const ingredient = await ingredientService.createIngredient(req.body, req.file?.buffer);
  res.status(201).json({ status: 201, data: { ingredient } });
};

export const updateIngredient = async (req: Request, res: Response): Promise<void> => {
  // isValidId middleware guarantees params.id is present and a valid ObjectId
  const ingredient = await ingredientService.updateIngredient(
    req.params.id as string,
    req.body,
    req.file?.buffer,
  );
  res.status(200).json({ status: 200, data: { ingredient } });
};

export const deleteIngredient = async (req: Request, res: Response): Promise<void> => {
  await ingredientService.deleteIngredient(req.params.id as string);
  res.status(204).send();
};
