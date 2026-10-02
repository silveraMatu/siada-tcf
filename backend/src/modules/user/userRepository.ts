import {IUserRepository} from "./userRepository.types.js"
import {db} from "../../core/database/index.js"
import { NewUser, User, users } from "./userEntity.js";
import { eq } from "drizzle-orm";

export class UserRepository implements IUserRepository{
  constructor(private readonly database = db){}

  async create(data: NewUser): Promise<User> {
    const [createdUser] = await this.database
    .insert(users)
    .values({
      ...data,
      email: data.email.trim().toLowerCase()
    })
    .returning()
    
    return createdUser!;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.database
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1)
    
    return user ?? null;
  }
}  