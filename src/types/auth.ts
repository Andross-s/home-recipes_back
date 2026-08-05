export type UserRole = "user" | "admin";

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}
