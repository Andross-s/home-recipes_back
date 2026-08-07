import { Request, Response } from "express";
import * as adminService from "../services/admin.service";
import { UserRole } from "../types/auth";

const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;

const parsePage = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

const parsePerPage = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_PER_PAGE;
  return Math.min(parsed, MAX_PER_PAGE);
};

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  const { role, search, page, perPage } = req.query;

  const result = await adminService.getUsers({
    role: role === "user" || role === "admin" ? (role as UserRole) : undefined,
    search: typeof search === "string" ? search : undefined,
    page: parsePage(page),
    perPage: parsePerPage(perPage),
  });

  res.status(200).json({ status: 200, data: result });
};

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  const user = await adminService.updateUserRole(req.params.id as string, req.body.role);
  res.status(200).json({ status: 200, data: { user } });
};

export const updateUserBlockStatus = async (req: Request, res: Response): Promise<void> => {
  const user = await adminService.updateUserBlockStatus(
    req.params.id as string,
    req.body.isBlocked,
  );
  res.status(200).json({ status: 200, data: { user } });
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  await adminService.deleteUser(req.params.id as string);
  res.status(204).send();
};
