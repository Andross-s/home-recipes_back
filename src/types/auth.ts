export type UserRole = "user" | "admin";

export interface JwtPayload {
  role: UserRole;
  id: string;
}

export interface AuthenticatedUser {
  role: UserRole;
  id: string;
}
