import { pgEnum, pgTable as table } from "drizzle-orm/pg-core";
import * as t from "drizzle-orm/pg-core";
import { timestamps } from "../../core/helpers/columnTimestamps.helper.js";

export const rolesEnum = pgEnum("roles", ["auditor", "juez_tramite", "admin"]);

export const users = table(
  "users",
  {
    id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
    firstName: t.varchar("first_name", { length: 256 }).notNull(),
    lastName: t.varchar("last_name", { length: 256 }).notNull(),
    email: t.varchar().notNull(),
    role: rolesEnum(),
    ...timestamps
  },
  (table) => [
    t.uniqueIndex("email_idx").on(table.email)
  ]
);