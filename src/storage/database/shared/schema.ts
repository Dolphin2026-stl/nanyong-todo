import { pgTable, serial, timestamp, varchar, text, integer, boolean, jsonb, index, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod";

export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 用户档案表（补充 auth.users 表的业务字段）
export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid("id").primaryKey().default(sql`auth.uid()`),
    nickname: varchar("nickname", { length: 64 }),
    avatar_url: varchar("avatar_url", { length: 512 }),
    school: varchar("school", { length: 128 }),
    theme_config: jsonb("theme_config"),
    settings: jsonb("settings"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

// 任务表
export const tasks = pgTable(
  "tasks",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid("user_id").notNull().default(sql`auth.uid()`),
    title: varchar("title", { length: 256 }).notNull(),
    description: text("description"),
    task_type: varchar("task_type", { length: 20 }).notNull().default("personal"), // course, activity, homework, exam, personal
    priority: varchar("priority", { length: 20 }).notNull().default("medium"), // low, medium, high, urgent
    importance: varchar("importance", { length: 20 }).notNull().default("normal"), // normal, important, very_important
    start_time: timestamp("start_time", { withTimezone: true }),
    end_time: timestamp("end_time", { withTimezone: true }),
    is_completed: boolean("is_completed").notNull().default(false),
    completed_at: timestamp("completed_at", { withTimezone: true }),
    recurrence: jsonb("recurrence"), // 重复规则
    metadata: jsonb("metadata"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("tasks_user_id_idx").on(table.user_id),
    index("tasks_user_end_time_idx").on(table.user_id, table.end_time),
    index("tasks_user_type_idx").on(table.user_id, table.task_type),
    index("tasks_user_priority_idx").on(table.user_id, table.priority),
    index("tasks_user_completed_idx").on(table.user_id, table.is_completed),
  ]
);

// 标签表
export const tags = pgTable(
  "tags",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid("user_id").notNull().default(sql`auth.uid()`),
    name: varchar("name", { length: 64 }).notNull(),
    color: varchar("color", { length: 32 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("tags_user_id_idx").on(table.user_id),
  ]
);

// 任务-标签关联表
export const taskTags = pgTable(
  "task_tags",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    task_id: varchar("task_id", { length: 36 }).notNull().references(() => tasks.id, { onDelete: "cascade" }),
    tag_id: varchar("tag_id", { length: 36 }).notNull().references(() => tags.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("task_tags_task_id_idx").on(table.task_id),
    index("task_tags_tag_id_idx").on(table.tag_id),
  ]
);

const { createInsertSchema: createCoercedInsertSchema } = createSchemaFactory({ coerce: { date: true } });

export const insertTaskSchema = createCoercedInsertSchema(tasks).pick({
  title: true,
  description: true,
  task_type: true,
  priority: true,
  importance: true,
  start_time: true,
  end_time: true,
});

export const insertTagSchema = createCoercedInsertSchema(tags).pick({
  name: true,
  color: true,
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
