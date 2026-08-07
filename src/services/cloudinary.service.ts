import { UploadApiOptions, v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const DEFAULT_TRANSFORMATION: UploadApiOptions["transformation"] = [
  { fetch_format: "auto", quality: "auto" },
];

// A deterministic public_id per entity means every re-upload overwrites the
// previous image in place, so there is no separate old file to track and delete.
export const uploadImage = (
  publicId: string,
  fileBuffer: Buffer,
  transformation: UploadApiOptions["transformation"] = DEFAULT_TRANSFORMATION,
): Promise<string> =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        overwrite: true,
        invalidate: true,
        transformation,
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
