import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import compression from "compression";
import cors from "cors";
import mongoSanitize from "express-mongo-sanitize";
import helmet from "helmet";
import mongoose from "mongoose";
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
// Strips keys starting with "$" or containing "." from body/query/params so
// user input can never be interpreted as a Mongo operator (e.g. { $gt: "" }).
// Defense-in-depth: route handlers already only forward typeof === "string"
// query values and Joi-validated (stripUnknown) bodies into queries, but this
// protects any future field that skips that path.
app.use(mongoSanitize());

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

  // Bad ObjectId reaching a query that wasn't pre-checked by isValidId (e.g. a
  // ?category=/?ingredient= filter) — a client input problem, not a server
  // fault, so it gets a clean 400 instead of leaking a Mongoose error message.
  if (error instanceof mongoose.Error.CastError) {
    res.status(400).json({
      status: 400,
      errorCode: "INVALID_ID",
      message: `Parameter "${error.path}" is not a valid id`,
      data: null,
    });
    return;
  }

  // Unexpected errors are logged in full server-side; the client only ever
  // gets a generic message so internal details (stack traces, DB/driver
  // error text, file paths) never leak in the response.
  console.error("Unhandled error:", error);

  res.status(500).json({
    status: 500,
    errorCode: "INTERNAL_SERVER_ERROR",
    message: "Internal Server Error",
    data: null,
  });
});

export default app;
