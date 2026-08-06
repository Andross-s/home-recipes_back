import multer from "multer";
import { HttpError } from "../utils/HttpError";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(
        new HttpError(400, "INVALID_FILE_TYPE", "Only JPEG, PNG or WEBP images are allowed"),
      );
      return;
    }
    callback(null, true);
  },
});
