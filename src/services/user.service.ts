import { IUser, User } from "../models/user";
import { HttpError } from "../utils/HttpError";
import { uploadAvatar as uploadAvatarToCloudinary } from "./cloudinary.service";

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
  const avatarUrl = await uploadAvatarToCloudinary(userId, fileBuffer);

  const user = await User.findByIdAndUpdate(userId, { avatarUrl }, { new: true });
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }
  return user;
};
