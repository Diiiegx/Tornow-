import {
  Club,
  Match,
  UserAccount,
  LeagueNotification,
  ClubInvite,
  Tournament,
  OrganizerKey,
} from '../types';

export const INITIAL_ORGANIZER_KEYS: OrganizerKey[] = [
  {
    id: 'KEY-ORG-TORNOW-9940',
    organizerName: 'Producciones Deportivas Chile SpA',
    organizerEmail: 'contacto@producciones.cl',
    organizerPhone: '+56 9 8412 9940',
    notes: 'Convenio comercial oficial - Autorización para 1 torneo oficial',
    createdAt: '2026-10-20',
    status: 'pending',
  },
  {
    id: 'KEY-ORG-GLOBAL-7712',
    organizerName: 'Liga Metropolitana Sports',
    organizerEmail: 'torneos@ligametro.cl',
    organizerPhone: '+56 9 9341 5522',
    notes: 'Convenio empresarial - Autorización para 1 torneo oficial',
    createdAt: '2026-10-22',
    status: 'pending',
  },
];

// Torneos iniciales vacíos (sin torneos de prueba)
export const INITIAL_TOURNAMENTS: Tournament[] = [];

// Clubes iniciales vacíos
export const INITIAL_CLUBS: Club[] = [];

// Partidos iniciales vacíos
export const INITIAL_MATCHES: Match[] = [];

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'usr-admin',
    username: 'admin',
    passwordHash: 'Admin1234@',
    fullName: 'Administrador General TORNOW',
    role: 'super_admin',
    email: 'admin@tornow.cl',
    phone: '+56 9 8412 9940',
    createdAt: '2026-10-20',
  },
  {
    id: 'usr-organizer',
    username: 'organizador',
    passwordHash: 'TornowOrg2026@',
    fullName: 'Ignacio Silva Morales',
    role: 'organizer',
    organizerTournamentIds: [],
    email: 'contacto@producciones.cl',
    phone: '+56 9 8412 9940',
    createdAt: '2026-10-20',
    tournamentQuota: 1,
    organizerKeyUsed: 'KEY-ORG-TORNOW-9940',
  },
];

export const INITIAL_INVITES: ClubInvite[] = [];

export const INITIAL_NOTIFICATIONS: LeagueNotification[] = [];
