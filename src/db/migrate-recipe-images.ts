import "dotenv/config";
import mongoose from "mongoose";
import { initMongoConnection } from "./initMongoConnection";

// One-off migration: recipes used to store a single `imageUrl: String`. The
// current schema stores `images: [{ url, publicId }]` instead. publicId is
// set to null for migrated entries — the original Cloudinary public_id for
// pre-migration images is unknown (some weren't even uploaded through our
// own Cloudinary account), so we can display them but can't manage/delete
// them via the Cloudinary API later.
// Safe to re-run: only touches documents that still have a non-empty
// `imageUrl` and an empty/missing `images` array.
const migrate = async (): Promise<void> => {
  await initMongoConnection();

  const db = mongoose.connection.db;
  if (!db) throw new Error("Mongo connection has no db handle");

  const collection = db.collection("recipes");

  const candidates = await collection
    .find({
      imageUrl: { $exists: true, $type: "string", $ne: "" },
      $or: [{ images: { $exists: false } }, { images: { $size: 0 } }],
    })
    .toArray();

  console.log(`Found ${candidates.length} recipe(s) with a legacy imageUrl to migrate.`);

  for (const doc of candidates) {
    await collection.updateOne(
      { _id: doc._id },
      {
        $set: { images: [{ url: doc.imageUrl, publicId: null }] },
        $unset: { imageUrl: "" },
      },
    );
    console.log(`Migrated "${doc.title}" (${doc._id}).`);
  }

  console.log("Migration complete.");
  await mongoose.disconnect();
};

migrate().catch((error: unknown) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
