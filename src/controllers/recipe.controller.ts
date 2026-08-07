import { Request, Response } from "express";
import * as recipeService from "../services/recipe.service";

const DEFAULT_PER_PAGE = 12;
const MAX_PER_PAGE = 50;

const parsePage = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

const parsePerPage = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_PER_PAGE;
  return Math.min(parsed, MAX_PER_PAGE);
};

export const getRecipes = async (req: Request, res: Response): Promise<void> => {
  const { group, category, ingredient, search, page, perPage } = req.query;

  const result = await recipeService.getRecipes({
    group: typeof group === "string" ? group : undefined,
    category: typeof category === "string" ? category : undefined,
    ingredient: typeof ingredient === "string" ? ingredient : undefined,
    search: typeof search === "string" ? search : undefined,
    page: parsePage(page),
    perPage: parsePerPage(perPage),
  });

  res.status(200).json({ status: 200, data: result });
};

export const getRecipeById = async (req: Request, res: Response): Promise<void> => {
  const recipe = await recipeService.getRecipeById(req.params.id as string);
  res.status(200).json({ status: 200, data: { recipe } });
};

export const createRecipe = async (req: Request, res: Response): Promise<void> => {
  const recipe = await recipeService.createRecipe(req.user!.id, req.body, req.file?.buffer);
  res.status(201).json({ status: 201, data: { recipe } });
};

export const updateRecipe = async (req: Request, res: Response): Promise<void> => {
  const recipe = await recipeService.updateRecipe(
    req.params.id as string,
    req.user!.id,
    req.user!.role,
    req.body,
    req.file?.buffer,
  );
  res.status(200).json({ status: 200, data: { recipe } });
};

export const deleteRecipe = async (req: Request, res: Response): Promise<void> => {
  await recipeService.deleteRecipe(req.params.id as string, req.user!.id, req.user!.role);
  res.status(204).send();
};

export const getOwnRecipes = async (req: Request, res: Response): Promise<void> => {
  const { page, perPage } = req.query;
  const result = await recipeService.getOwnRecipes(
    req.user!.id,
    parsePage(page),
    parsePerPage(perPage),
  );
  res.status(200).json({ status: 200, data: result });
};

export const getFavoriteRecipes = async (req: Request, res: Response): Promise<void> => {
  const recipes = await recipeService.getFavoriteRecipes(req.user!.id);
  res.status(200).json({ status: 200, data: { recipes } });
};

export const addFavorite = async (req: Request, res: Response): Promise<void> => {
  await recipeService.addFavorite(req.user!.id, req.params.id as string);
  res.status(200).json({ status: 200, message: "Recipe added to favorites" });
};

export const removeFavorite = async (req: Request, res: Response): Promise<void> => {
  await recipeService.removeFavorite(req.user!.id, req.params.id as string);
  res.status(204).send();
};
