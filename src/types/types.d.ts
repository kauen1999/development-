export interface IUser {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN" | "ORGANIZER";
  photo?: string;
  createdAt: string;
  updatedAt: string;
}
