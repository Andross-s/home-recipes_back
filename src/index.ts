import "dotenv/config";
import app from "./app";
import { initMongoConnection } from "./db/initMongoConnection";

const PORT = process.env.PORT ?? 3000;

const startServer = async (): Promise<void> => {
  await initMongoConnection();

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer().catch((error: unknown) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
