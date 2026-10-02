import { pgEnum, pgTable as table } from "drizzle-orm/pg-core";
import * as t from "drizzle-orm/pg-core";
import { timestamps } from "../../core/helpers/columnTimestamps.helper.js";

export const rolesEnum = pgEnum("roles", ["AUDITOR", "JUEZ_TRAMITE", "ADMIN"]);

export const users = table(
  "users",
  {
    id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
    firstName: t.varchar("first_name", { length: 256 }).notNull(),
    lastName: t.varchar("last_name", { length: 256 }).notNull(),
    email: t.varchar().notNull(),
    password: t.varchar().notNull(),
    role: rolesEnum(),
    active: t.boolean().default(true).notNull(),
    ...timestamps
  },
  (table) => [
    t.uniqueIndex("email_idx").on(table.email)
  ]
);

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert