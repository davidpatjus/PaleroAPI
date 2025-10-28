import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  pgEnum,
  jsonb,
  decimal,
  date,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums

export const userRoleEnum = pgEnum('user_role', [
  'ADMIN',
  'TEAM_MEMBER',
  'CLIENT',
  'FAST_CLIENT',
]);
export const clientStatusEnum = pgEnum('client_status', [
  'PROSPECT',
  'ACTIVE',
  'IN_PROJECT',
  'COMPLETED',
  'ARCHIVED',
]);
export const projectStatusEnum = pgEnum('project_status', [
  'PENDING',
  'IN_PROGRESS',
  'REVIEW',
  'COMPLETED',
  'ARCHIVED',
]);
export const taskStatusEnum = pgEnum('task_status', [
  'TODO',
  'IN_PROGRESS',
  'REVIEW',
  'DONE',
]);
export const taskPriorityEnum = pgEnum('task_priority', [
  'LOW',
  'MEDIUM',
  'HIGH',
]);
export const fileEntityTypeEnum = pgEnum('file_entity_type', [
  'PROJECT',
  'TASK',
  'CLIENT_DOCUMENT',
  'PROFILE_IMAGE',
]);
export const invoiceStatusEnum = pgEnum('invoice_status', [
  'DRAFT',
  'SENT',
  'PAID',
  'OVERDUE',
  'VOID',
]);
export const notificationTypeEnum = pgEnum('notification_type', [
  'NEW_TASK_ASSIGNED',
  'TASK_STATUS_UPDATED',
  'NEW_COMMENT',
  'COMMENT_CREATED',
  'PROJECT_CREATED',
  'PROJECT_STATUS_UPDATED',
  'INVOICE_GENERATED',
  'PAYMENT_REMINDER',
  'NEW_MESSAGE',
]);
export const subtaskStatusEnum = pgEnum('subtask_status', [
  'TODO',
  'IN_PROGRESS',
  'DONE',
]);
export const subtaskPriorityEnum = pgEnum('subtask_priority', [
  'LOW',
  'MEDIUM',
  'HIGH',
]);
export const meetingStatusEnum = pgEnum('meeting_status', [
  'SCHEDULED',
  'WAITING_ROOM',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'FAILED',
  'DELETED',
]);
export const participantRoleEnum = pgEnum('participant_role', [
  'HOST',
  'PARTICIPANT',
  'OBSERVER',
]);
export const participantStatusEnum = pgEnum('participant_status', [
  'INVITED',
  'JOINED',
  'LEFT',
  'REJECTED',
]);

// Tables

export const meetingsTable = pgTable('meetings', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  startTime: timestamp('start_time', {
    mode: 'date',
    withTimezone: true,
  }).notNull(),
  endTime: timestamp('end_time', {
    mode: 'date',
    withTimezone: true,
  }).notNull(),
  status: meetingStatusEnum('status').default('SCHEDULED').notNull(),
  projectId: uuid('project_id').references(() => projectsTable.id, {
    onDelete: 'set null',
  }),
  createdById: uuid('created_by_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  roomUrl: varchar('room_url', { length: 255 }), // URL de la sala de Daily.co
  dailyRoomName: varchar('daily_room_name', { length: 255 }).unique(), // Nombre único de la sala en Daily.co
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const meetingParticipantsTable = pgTable('meeting_participants', {
  id: uuid('id').defaultRandom().primaryKey(),
  meetingId: uuid('meeting_id')
    .notNull()
    .references(() => meetingsTable.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  role: participantRoleEnum('role').default('PARTICIPANT').notNull(),
  status: participantStatusEnum('status').default('INVITED').notNull(),
  joinedAt: timestamp('joined_at', { mode: 'date', withTimezone: true }),
  leftAt: timestamp('left_at', { mode: 'date', withTimezone: true }),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const usersTable = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique(),
  password: varchar('password', { length: 255 }),
  name: varchar('name', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull(),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const clientProfilesTable = pgTable('client_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  companyName: varchar('company_name', { length: 255 }),
  contactPerson: varchar('contact_person', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  address: text('address'),
  socialMediaLinks: jsonb('social_media_links'),
  status: clientStatusEnum('status').notNull(),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const projectsTable = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  clientId: uuid('client_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'restrict' }),
  status: projectStatusEnum('status').notNull(),
  startDate: date('start_date', { mode: 'date' }),
  endDate: date('end_date', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const tasksTable = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projectsTable.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: taskStatusEnum('status').notNull(),
  priority: taskPriorityEnum('priority'),
  dueDate: date('due_date', { mode: 'date' }),
  assignedToId: uuid('assigned_to_id').references(() => usersTable.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const subtasksTable = pgTable('subtasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => tasksTable.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: subtaskStatusEnum('status').notNull().default('TODO'),
  priority: subtaskPriorityEnum('priority'),
  dueDate: date('due_date', { mode: 'date' }),
  assignedToId: uuid('assigned_to_id').references(() => usersTable.id, {
    onDelete: 'set null',
  }),
  isCompleted: boolean('is_completed').default(false).notNull(),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const commentsTable = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id').references(() => tasksTable.id, {
    onDelete: 'cascade',
  }),
  projectId: uuid('project_id').references(() => projectsTable.id, {
    onDelete: 'cascade',
  }),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const fileAttachmentsTable = pgTable('file_attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityType: fileEntityTypeEnum('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(), // Not a foreign key, used with entityType
  fileName: varchar('file_name', { length: 255 }).notNull(),
  filePath: varchar('file_path', { length: 1024 }).notNull(),
  fileType: varchar('file_type', { length: 100 }).notNull(),
  uploadedById: uuid('uploaded_by_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const invoicesTable = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projectsTable.id, {
    onDelete: 'set null',
  }),
  clientId: uuid('client_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'restrict' }),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  issueDate: date('issue_date', { mode: 'date' }).notNull(),
  dueDate: date('due_date', { mode: 'date' }).notNull(),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  taxes: decimal('taxes', { precision: 5, scale: 2 }).notNull().default('0.00'), // Tax percentage (e.g., 21.00 for 21%)
  status: invoiceStatusEnum('status').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const invoiceItemsTable = pgTable('invoice_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id')
    .notNull()
    .references(() => invoicesTable.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal('total_price', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const conversationsTable = pgTable(
  'conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Campos para los dos participantes (ordenados para evitar duplicados)
    userOneId: uuid('user_one_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    userTwoId: uuid('user_two_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    // Metadatos del último mensaje para queries eficientes
    lastMessageAt: timestamp('last_message_at', {
      mode: 'date',
      withTimezone: true,
    }),
    lastMessagePreview: varchar('last_message_preview', { length: 100 }),
    // Timestamps estándar
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => {
    return {
      // Constraint para evitar conversaciones duplicadas (A-B vs B-A)
      uniqueConversation: unique().on(table.userOneId, table.userTwoId),
      // Índices para optimizar consultas
      userOneIdx: index().on(table.userOneId),
      userTwoIdx: index().on(table.userTwoId),
      lastMessageIdx: index().on(table.lastMessageAt),
    };
  },
);

// conversationParticipantsTable eliminada - ya no necesaria para chats 1 a 1
// Los participantes ahora están directamente en conversationsTable (userOneId, userTwoId)

export const messagesTable = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversationsTable.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    // Timestamp mejorado
    sentAt: timestamp('sent_at', { mode: 'date', withTimezone: true })
      .defaultNow()
      .notNull(),
    // Estado de lectura mejorado para 1 a 1
    readAt: timestamp('read_at', { mode: 'date', withTimezone: true }),
    // Flag de entrega (para futuras notificaciones push)
    deliveredAt: timestamp('delivered_at', {
      mode: 'date',
      withTimezone: true,
    }),
  },
  (table) => {
    return {
      // Índices para optimizar consultas de chat
      conversationIdx: index().on(table.conversationId, table.sentAt),
      senderIdx: index().on(table.senderId),
    };
  },
);

export const notificationsTable = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  message: text('message').notNull(),
  content: text('content'), // Optional content
  entityType: varchar('entity_type', { length: 50 }), // e.g., 'TASK', 'PROJECT', 'INVOICE'
  entityId: uuid('entity_id'), // ID of the related entity
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const calendarEventsTable = pgTable('calendar_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  startTime: timestamp('start_time', {
    mode: 'date',
    withTimezone: true,
  }).notNull(),
  endTime: timestamp('end_time', {
    mode: 'date',
    withTimezone: true,
  }).notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projectsTable.id, {
    onDelete: 'set null',
  }),
  isAllDay: boolean('is_all_day').default(false).notNull(),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// Relations

export const usersRelations = relations(usersTable, ({ one, many }) => ({
  clientProfile: one(clientProfilesTable, {
    fields: [usersTable.id],
    references: [clientProfilesTable.userId],
  }),
  projectsAsClient: many(projectsTable, { relationName: 'clientProjects' }), // Projects where this user is the client
  assignedTasks: many(tasksTable, { relationName: 'assignedUserTasks' }), // Tasks assigned to this user
  comments: many(commentsTable),
  uploadedFiles: many(fileAttachmentsTable),
  invoicesAsClient: many(invoicesTable, { relationName: 'clientInvoices' }), // Invoices issued to this user as a client
  sentMessages: many(messagesTable, { relationName: 'sentMessages' }),
  conversationsAsUserOne: many(conversationsTable, {
    relationName: 'userOneConversations',
  }),
  conversationsAsUserTwo: many(conversationsTable, {
    relationName: 'userTwoConversations',
  }),
  notifications: many(notificationsTable),
  calendarEvents: many(calendarEventsTable),
  createdMeetings: many(meetingsTable, { relationName: 'createdBy' }),
  meetingParticipations: many(meetingParticipantsTable),
}));

export const clientProfilesRelations = relations(
  clientProfilesTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [clientProfilesTable.userId],
      references: [usersTable.id],
    }),
  }),
);

export const projectsRelations = relations(projectsTable, ({ one, many }) => ({
  client: one(usersTable, {
    fields: [projectsTable.clientId],
    references: [usersTable.id],
    relationName: 'clientProjects',
  }),
  tasks: many(tasksTable),
  comments: many(commentsTable),
  invoices: many(invoicesTable),
  calendarEvents: many(calendarEventsTable),
  meetings: many(meetingsTable),
}));

export const tasksRelations = relations(tasksTable, ({ one, many }) => ({
  project: one(projectsTable, {
    fields: [tasksTable.projectId],
    references: [projectsTable.id],
  }),
  assignedTo: one(usersTable, {
    fields: [tasksTable.assignedToId],
    references: [usersTable.id],
    relationName: 'assignedUserTasks',
  }),
  subtasks: many(subtasksTable),
  comments: many(commentsTable),
}));

export const subtasksRelations = relations(subtasksTable, ({ one }) => ({
  task: one(tasksTable, {
    fields: [subtasksTable.taskId],
    references: [tasksTable.id],
  }),
  assignedTo: one(usersTable, {
    fields: [subtasksTable.assignedToId],
    references: [usersTable.id],
  }),
}));

export const commentsRelations = relations(commentsTable, ({ one }) => ({
  task: one(tasksTable, {
    fields: [commentsTable.taskId],
    references: [tasksTable.id],
  }),
  project: one(projectsTable, {
    fields: [commentsTable.projectId],
    references: [projectsTable.id],
  }),
  user: one(usersTable, {
    fields: [commentsTable.userId],
    references: [usersTable.id],
  }),
}));

export const fileAttachmentsRelations = relations(
  fileAttachmentsTable,
  ({ one }) => ({
    uploadedBy: one(usersTable, {
      fields: [fileAttachmentsTable.uploadedById],
      references: [usersTable.id],
    }),
  }),
);

export const invoicesRelations = relations(invoicesTable, ({ one, many }) => ({
  project: one(projectsTable, {
    fields: [invoicesTable.projectId],
    references: [projectsTable.id],
  }),
  client: one(usersTable, {
    fields: [invoicesTable.clientId],
    references: [usersTable.id],
    relationName: 'clientInvoices',
  }),
  items: many(invoiceItemsTable),
}));

export const invoiceItemsRelations = relations(
  invoiceItemsTable,
  ({ one }) => ({
    invoice: one(invoicesTable, {
      fields: [invoiceItemsTable.invoiceId],
      references: [invoicesTable.id],
    }),
  }),
);

export const conversationsRelations = relations(
  conversationsTable,
  ({ one, many }) => ({
    userOne: one(usersTable, {
      fields: [conversationsTable.userOneId],
      references: [usersTable.id],
      relationName: 'userOneConversations',
    }),
    userTwo: one(usersTable, {
      fields: [conversationsTable.userTwoId],
      references: [usersTable.id],
      relationName: 'userTwoConversations',
    }),
    messages: many(messagesTable),
  }),
);

export const messagesRelations = relations(messagesTable, ({ one }) => ({
  conversation: one(conversationsTable, {
    fields: [messagesTable.conversationId],
    references: [conversationsTable.id],
  }),
  sender: one(usersTable, {
    fields: [messagesTable.senderId],
    references: [usersTable.id],
    relationName: 'sentMessages',
  }),
}));

export const notificationsRelations = relations(
  notificationsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [notificationsTable.userId],
      references: [usersTable.id],
    }),
  }),
);

export const calendarEventsRelations = relations(
  calendarEventsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [calendarEventsTable.userId],
      references: [usersTable.id],
    }),
    project: one(projectsTable, {
      fields: [calendarEventsTable.projectId],
      references: [projectsTable.id],
    }),
  }),
);

export const meetingsRelations = relations(meetingsTable, ({ one, many }) => ({
  project: one(projectsTable, {
    fields: [meetingsTable.projectId],
    references: [projectsTable.id],
  }),
  createdBy: one(usersTable, {
    fields: [meetingsTable.createdById],
    references: [usersTable.id],
    relationName: 'createdBy',
  }),
  participants: many(meetingParticipantsTable),
}));

export const meetingParticipantsRelations = relations(
  meetingParticipantsTable,
  ({ one }) => ({
    meeting: one(meetingsTable, {
      fields: [meetingParticipantsTable.meetingId],
      references: [meetingsTable.id],
    }),
    user: one(usersTable, {
      fields: [meetingParticipantsTable.userId],
      references: [usersTable.id],
    }),
  }),
);
