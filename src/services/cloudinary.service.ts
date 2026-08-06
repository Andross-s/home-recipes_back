import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// A deterministic public_id per user means every re-upload overwrites the
// previous avatar in place, so there is no separate old file to track and delete.
export const uploadAvatar = (userId: string, fileBuffer: Buffer): Promise<string> =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: `home-recipes/avatars/${userId}`,
        overwrite: true,
        invalidate: true,
        transformation: [
          { width: 300, height: 300, crop: "fill", gravity: "face" },
          { fetch_format: "auto", quality: "auto" },
        ],
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve(result.secure_url);
      },
    );

    uploadStream.end(fileBuffer);
  });
