import { pgTable, text, serial, integer, timestamp, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const wbsNodes = pgTable('wbs_nodes', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  parentId: integer('parent_id'),
  name: text('name').notNull(),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const activities = pgTable('activities', {
  id: serial('id').primaryKey(),
  wbsNodeId: integer('wbs_node_id').references(() => wbsNodes.id, { onDelete: 'cascade' }).notNull(),
  code: text('code').notNull(),
  description: text('description').notNull(),
  manHours: decimal('man_hours', { precision: 10, scale: 2 }).default('0'),
  progress: decimal('progress', { precision: 5, scale: 2 }).default('0'),
  startDate: timestamp('start_date'),
  finishDate: timestamp('finish_date'),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const projectsRelations = relations(projects, ({ many }) => ({
  wbsNodes: many(wbsNodes),
}));

export const wbsNodesRelations = relations(wbsNodes, ({ one, many }) => ({
  project: one(projects, {
    fields: [wbsNodes.projectId],
    references: [projects.id],
  }),
  parent: one(wbsNodes, {
    fields: [wbsNodes.parentId],
    references: [wbsNodes.id],
    relationName: 'parent_child',
  }),
  children: many(wbsNodes, {
    relationName: 'parent_child',
  }),
  activities: many(activities),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  wbsNode: one(wbsNodes, {
    fields: [activities.wbsNodeId],
    references: [wbsNodes.id],
  }),
}));

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type WbsNode = typeof wbsNodes.$inferSelect;
export type NewWbsNode = typeof wbsNodes.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;