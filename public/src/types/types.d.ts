export interface IUser {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN" | "ORGANIZER";
  photo?: string | null;
  createdAt: string;
  updatedAt: string;
}
