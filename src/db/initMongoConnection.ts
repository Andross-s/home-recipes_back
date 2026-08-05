import mongoose from "mongoose";

export const initMongoConnection = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  await mongoose.connect(mongoUri);

  console.log("Mongo connection successfully established");
};
