import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import compression from "compression";
import { HttpError } from "./utils/HttpError";

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new HttpError(403, "CORS_NOT_ALLOWED", `Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ status: 200, message: "Home Recipes API is up and running" });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: 404,
    errorCode: "ROUTE_NOT_FOUND",
    message: "Route not found",
  });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      status: error.status,
      errorCode: error.errorCode,
      message: error.message,
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Internal Server Error";

  res.status(500).json({
    status: 500,
    errorCode: "INTERNAL_SERVER_ERROR",
    message,
  });
});

export default app;
