import { Recipe } from "../models/recipe";
import { Session } from "../models/session";
import { IUser, User } from "../models/user";
import { UserRole } from "../types/auth";
import { HttpError } from "../utils/HttpError";

interface UserListFilter {
  role?: UserRole;
  search?: string;
  page: number;
  perPage: number;
}

interface UserListResult {
  data: IUser[];
  page: number;
  perPage: number;
  totalItems: number;
}

const assertNotLastAdmin = async (user: IUser): Promise<void> => {
  if (user.role !== "admin") return;

  const adminCount = await User.countDocuments({ role: "admin" });
  if (adminCount <= 1) {
    throw new HttpError(
      409,
      "LAST_ADMIN_PROTECTED",
      "This is the last admin in the system, the action would leave it without an admin",
    );
  }
};

export const getUsers = async (filter: UserListFilter): Promise<UserListResult> => {
  const query: Record<string, unknown> = {};
  if (filter.role) query.role = filter.role;
  if (filter.search) {
    query.$or = [
      { name: { $regex: filter.search, $options: "i" } },
      { email: { $regex: filter.search, $options: "i" } },
    ];
  }

  const [data, totalItems] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip((filter.page - 1) * filter.perPage)
      .limit(filter.perPage),
    User.countDocuments(query),
  ]);

  return { data, page: filter.page, perPage: filter.perPage, totalItems };
};

export const updateUserRole = async (id: string, role: UserRole): Promise<IUser> => {
  const user = await User.findById(id);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }

  if (user.role === "admin" && role === "user") {
    await assertNotLastAdmin(user);
  }

  user.role = role;
  await user.save();
  return user;
};

export const updateUserBlockStatus = async (id: string, isBlocked: boolean): Promise<IUser> => {
  const user = await User.findById(id);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }

  // No extra session cleanup needed here: authenticate() re-reads isBlocked
  // from the User document on every request, so already-issued access tokens
  // stop working immediately, not just after they naturally expire.
  user.isBlocked = isBlocked;
  await user.save();
  return user;
};

export const deleteUser = async (id: string): Promise<void> => {
  const user = await User.findById(id);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }

  // Deleting an admin removes their admin role as a side effect, so it must
  // respect the same "never leave the system without an admin" invariant as
  // the explicit role-demotion endpoint above.
  await assertNotLastAdmin(user);

  // Recipes are cascade-deleted rather than orphaned (owner: null): `owner`
  // is a required ref used throughout (permission checks, "my recipes",
  // populate), so supporting a nullable/"deleted user" owner would need
  // schema and read-path changes everywhere recipes are touched — for a case
  // (admin removing an account) where removing their content along with it
  // is the expected outcome anyway.
  const ownedRecipeIds = await Recipe.find({ owner: id }).distinct("_id");
  await Recipe.deleteMany({ owner: id });
  if (ownedRecipeIds.length > 0) {
    await User.updateMany(
      { favorites: { $in: ownedRecipeIds } },
      { $pull: { favorites: { $in: ownedRecipeIds } } },
    );
  }

  await Session.deleteMany({ userId: id });
  await user.deleteOne();
};
