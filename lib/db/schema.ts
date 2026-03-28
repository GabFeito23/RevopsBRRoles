import {
  pgTable, serial, varchar, text, date, timestamp, index,
} from "drizzle-orm/pg-core";

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  externalId: varchar("external_id", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  company: varchar("company", { length: 255 }).notNull(),
  location: varchar("location", { length: 500 }).default(""),
  description: text("description").default(""),
  url: varchar("url", { length: 2000 }).notNull(),
  source: varchar("source", { length: 50 }).notNull(),
  roleCategory: varchar("role_category", { length: 50 }).notNull(),
  seniority: varchar("seniority", { length: 50 }).notNull(),
  workEnvironment: varchar("work_environment", { length: 50 }).notNull(),
  techStack: text("tech_stack").default(""),
  contractType: varchar("contract_type", { length: 50 }).default("CLT"),
  state: varchar("state", { length: 10 }).default(""),
  industry: varchar("industry", { length: 50 }).default("Other"),
  status: varchar("status", { length: 20 }).default("Aberta"),
  dateFound: date("date_found").defaultNow(),
  lastVerified: date("last_verified").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_jobs_status").on(table.status),
  index("idx_jobs_external_id").on(table.externalId),
  index("idx_jobs_role_category").on(table.roleCategory),
  index("idx_jobs_source").on(table.source),
]);

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
