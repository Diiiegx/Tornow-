import { relations } from 'drizzle-orm';
import { integer, jsonb, pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

// Define the 'users' table (linked to Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  fullName: text('full_name').default(''),
  role: text('role').default('usuario').notNull(),
  clubId: text('club_id'),
  organizerQuota: integer('organizer_quota').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'tournaments' table
export const tournaments = pgTable('tournaments', {
  id: serial('id').primaryKey(),
  tournamentCode: text('tournament_code').notNull().unique(),
  ownerUid: text('owner_uid')
    .references(() => users.uid)
    .notNull(),
  name: text('name').notNull(),
  sport: text('sport').notNull(),
  format: text('format').notNull(),
  organizerName: text('organizer_name').notNull(),
  organizerRut: text('organizer_rut').notNull(),
  organizerEmail: text('organizer_email').notNull(),
  organizerPhone: text('organizer_phone').notNull(),
  venue: text('venue').notNull(),
  comuna: text('comuna').default(''),
  address: text('address').default(''),
  categoriesJson: jsonb('categories_json').notNull(),
  configJson: jsonb('config_json').notNull(),
  isLocked: boolean('is_locked').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'clubs' table
export const clubs = pgTable('clubs', {
  id: serial('id').primaryKey(),
  clubCode: text('club_code').notNull().unique(),
  tournamentCode: text('tournament_code').notNull(),
  name: text('name').notNull(),
  shortName: text('short_name').notNull(),
  category: text('category').notNull(),
  rosterJson: jsonb('roster_json').notNull(),
  staffJson: jsonb('staff_json').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define relationships for 'users'
export const usersRelations = relations(users, ({ many }) => ({
  tournaments: many(tournaments),
}));

// Define relationships for 'tournaments'
export const tournamentsRelations = relations(tournaments, ({ one }) => ({
  owner: one(users, {
    fields: [tournaments.ownerUid],
    references: [users.uid],
  }),
}));
