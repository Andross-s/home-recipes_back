import { NextFunction, Request, Response } from "express";

type AsyncController = (req: Request, res: Response) => Promise<void>;

export const ctrlWrapper =
  (controller: AsyncController) =>
  (req: Request, res: Response, next: NextFunction): void => {
    controller(req, res).catch(next);
  };
