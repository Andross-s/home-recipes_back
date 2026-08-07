import { IUser, User } from "../models/user";
import { HttpError } from "../utils/HttpError";
import { uploadImage } from "./cloudinary.service";

// Square crop centered on the face keeps avatars consistent and light
// regardless of the aspect ratio of the uploaded photo.
const AVATAR_TRANSFORMATION = [
  { width: 300, height: 300, crop: "fill" as const, gravity: "face" as const },
  { fetch_format: "auto" as const, quality: "auto" as const },
];

export const getMe = async (userId: string): Promise<IUser> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }
  return user;
};

export const updateName = async (userId: string, name: string): Promise<IUser> => {
  const user = await User.findByIdAndUpdate(userId, { name }, { new: true });
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }
  return user;
};

export const updateAvatar = async (userId: string, fileBuffer: Buffer): Promise<IUser> => {
  const avatarUrl = await uploadImage(
    `home-recipes/avatars/${userId}`,
    fileBuffer,
    AVATAR_TRANSFORMATION,
  );

  const user = await User.findByIdAndUpdate(userId, { avatarUrl }, { new: true });
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }
  return user;
};
