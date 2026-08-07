import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import multer from "multer";
import swaggerUi from "swagger-ui-express";
import { swaggerDocument } from "./docs/swagger";
import { HttpError } from "./utils/HttpError";
import router from "./routes";

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
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

// No DB access — stays fast even mid cold-start, for external keep-alive pings.
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: 200, message: "OK" });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/api", router);

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: 404,
    errorCode: "ROUTE_NOT_FOUND",
    message: "Route not found",
    data: null,
  });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      status: error.status,
      errorCode: error.errorCode,
      message: error.message,
      data: null,
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    res.status(400).json({
      status: 400,
      errorCode: error.code === "LIMIT_FILE_SIZE" ? "FILE_TOO_LARGE" : "FILE_UPLOAD_ERROR",
      message: error.message,
      data: null,
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Internal Server Error";

  res.status(500).json({
    status: 500,
    errorCode: "INTERNAL_SERVER_ERROR",
    message,
    data: null,
  });
});

export default app;
