import { NewUser, User } from "./userEntity.js";

export interface IUserRepository{
  create(user: NewUser): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
}