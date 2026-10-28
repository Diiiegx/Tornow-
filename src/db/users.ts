import { db } from './index.ts';
import { users, tournaments, clubs } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, fullName?: string) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        fullName: fullName || email.split('@')[0],
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(fullName ? { fullName } : {}),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getUsers() {
  try {
    return await db.select().from(users);
  } catch (error) {
    console.error('Database query failed in getUsers:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getTournamentsFromDb() {
  try {
    return await db.select().from(tournaments);
  } catch (error) {
    console.error('Database query failed in getTournamentsFromDb:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function upsertTournamentInDb(data: {
  tournamentCode: string;
  ownerUid: string;
  name: string;
  sport: string;
  format: string;
  organizerName: string;
  organizerRut: string;
  organizerEmail: string;
  organizerPhone: string;
  venue: string;
  comuna?: string;
  address?: string;
  categoriesJson: unknown;
  configJson: unknown;
}) {
  try {
    const result = await db
      .insert(tournaments)
      .values({
        tournamentCode: data.tournamentCode,
        ownerUid: data.ownerUid,
        name: data.name,
        sport: data.sport,
        format: data.format,
        organizerName: data.organizerName,
        organizerRut: data.organizerRut,
        organizerEmail: data.organizerEmail,
        organizerPhone: data.organizerPhone,
        venue: data.venue,
        comuna: data.comuna || '',
        address: data.address || '',
        categoriesJson: data.categoriesJson,
        configJson: data.configJson,
      })
      .onConflictDoUpdate({
        target: tournaments.tournamentCode,
        set: {
          name: data.name,
          categoriesJson: data.categoriesJson,
          configJson: data.configJson,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in upsertTournamentInDb:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function upsertClubInDb(data: {
  clubCode: string;
  tournamentCode: string;
  name: string;
  shortName: string;
  category: string;
  rosterJson: unknown;
  staffJson: unknown;
}) {
  try {
    const result = await db
      .insert(clubs)
      .values({
        clubCode: data.clubCode,
        tournamentCode: data.tournamentCode,
        name: data.name,
        shortName: data.shortName,
        category: data.category,
        rosterJson: data.rosterJson,
        staffJson: data.staffJson,
      })
      .onConflictDoUpdate({
        target: clubs.clubCode,
        set: {
          name: data.name,
          shortName: data.shortName,
          category: data.category,
          rosterJson: data.rosterJson,
          staffJson: data.staffJson,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in upsertClubInDb:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
