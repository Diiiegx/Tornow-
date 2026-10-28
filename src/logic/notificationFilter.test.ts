import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterNotificationsForUser,
  buildRosterModificationNotification,
  buildMatchResultNotification,
  buildSystemNotification,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from './notificationFilter';
import { Club, LeagueNotification, Match, Tournament, UserAccount } from '../types';

const sampleTournaments: Tournament[] = [
  {
    id: 'tour-A',
    organizerUserId: 'org-A',
    name: 'Torneo Apertura Santiago',
    organizerName: 'Organizador A',
    organizerType: 'empresa',
    sport: 'volleyball',
    format: 'round_robin',
    categories: ['TC (Todo Competidor)'],
    startDate: '2026-10-01',
    endDate: '2026-12-01',
    venue: 'Polideportivo Nacional',
    status: 'activo',
    rules: { pointsWin: 3, pointsLoss: 0, pointsTie: 0 },
    allowRosterEditing: true,
    createdAt: '2026-10-01',
  },
  {
    id: 'tour-B',
    organizerUserId: 'org-B',
    name: 'Copa Valparaíso Sur',
    organizerName: 'Organizador B',
    organizerType: 'empresa',
    sport: 'volleyball',
    format: 'round_robin',
    categories: ['TC (Todo Competidor)'],
    startDate: '2026-10-01',
    endDate: '2026-12-01',
    venue: 'Gimnasio Regional',
    status: 'activo',
    rules: { pointsWin: 3, pointsLoss: 0, pointsTie: 0 },
    allowRosterEditing: true,
    createdAt: '2026-10-01',
  },
];

const sampleClubs: Club[] = [
  {
    id: 'club-A1',
    tournamentId: 'tour-A',
    name: 'Murano Voley',
    shortName: 'MUR',
    color: '#0052fe',
    secondaryColor: '#ffffff',
    category: 'TC (Todo Competidor)',
    managerUsername: 'del_murano',
    managerName: 'Carlos Díaz',
    managerEmail: 'carlos@murano.cl',
    homeCourt: 'Cancha 1',
    staff: { headCoach: 'DT 1', assistantCoach: '' },
    roster: [],
  },
  {
    id: 'club-A2',
    tournamentId: 'tour-A',
    name: 'Stadio Italiano',
    shortName: 'STA',
    color: '#10b981',
    secondaryColor: '#ffffff',
    category: 'TC (Todo Competidor)',
    managerUsername: 'del_stadio',
    managerName: 'Marco Rossi',
    managerEmail: 'marco@stadio.cl',
    homeCourt: 'Cancha 2',
    staff: { headCoach: 'DT 2', assistantCoach: '' },
    roster: [],
  },
  {
    id: 'club-B1',
    tournamentId: 'tour-B',
    name: 'Puerto Voley',
    shortName: 'PUE',
    color: '#f59e0b',
    secondaryColor: '#ffffff',
    category: 'TC (Todo Competidor)',
    managerUsername: 'del_puerto',
    managerName: 'Pedro Mar',
    managerEmail: 'pedro@puerto.cl',
    homeCourt: 'Cancha Puerto',
    staff: { headCoach: 'DT 3', assistantCoach: '' },
    roster: [],
  },
];

const sampleMatches: Match[] = [
  {
    id: 'match-A',
    tournamentId: 'tour-A',
    round: 'Fecha 1',
    date: '2026-10-28',
    time: '19:00',
    court: 'Cancha 1',
    category: 'TC (Todo Competidor)',
    homeTeamId: 'club-A1',
    awayTeamId: 'club-A2',
    status: 'finished',
    homeSetsWon: 3,
    awaySetsWon: 1,
  },
  {
    id: 'match-B',
    tournamentId: 'tour-B',
    round: 'Fecha 1',
    date: '2026-10-28',
    time: '20:00',
    court: 'Cancha Puerto',
    category: 'TC (Todo Competidor)',
    homeTeamId: 'club-B1',
    awayTeamId: 'club-B1',
    status: 'live',
    homeSetsWon: 1,
    awaySetsWon: 1,
  },
];

const organizerA: UserAccount = {
  id: 'org-A',
  username: 'organizador_a',
  passwordHash: 'pass',
  fullName: 'Organizador Torneo A',
  role: 'organizer',
  organizerTournamentIds: ['tour-A'],
  email: 'orga@tornow.cl',
};

const delegateA1: UserAccount = {
  id: 'usr-del-A1',
  username: 'del_murano',
  passwordHash: 'pass',
  fullName: 'Carlos Díaz',
  role: 'club_admin',
  clubId: 'club-A1',
  email: 'carlos@murano.cl',
};

test('Organizer ONLY receives notifications from their own tournament and system, never from other tournaments', () => {
  const rosterNotifA = buildRosterModificationNotification({
    tournamentId: 'tour-A',
    club: sampleClubs[0],
    actionTitle: 'Modificación de Nómina',
    detailMessage: 'Inscribió al jugador #10 Matías Soto',
    actorName: 'Carlos Díaz',
  });
  const rosterNotifB = buildRosterModificationNotification({
    tournamentId: 'tour-B',
    club: sampleClubs[2],
    actionTitle: 'Modificación de Nómina',
    detailMessage: 'Inscribió al jugador #7 Lucas Vega',
    actorName: 'Pedro Mar',
  });
  const matchNotifA = buildMatchResultNotification({
    tournamentId: 'tour-A',
    match: sampleMatches[0],
    homeClubName: 'Murano Voley',
    awayClubName: 'Stadio Italiano',
    actorName: 'Mesa Control',
  });
  const matchNotifB = buildMatchResultNotification({
    tournamentId: 'tour-B',
    match: sampleMatches[1],
    homeClubName: 'Puerto Voley',
    awayClubName: 'Valpo Club',
    actorName: 'Mesa Control',
  });
  const sysNotif = buildSystemNotification({
    title: 'Seguridad de Sistema TORNOW',
    message: 'Respaldo de sesión activado.',
    targetUserId: 'org-A',
    isSystemGlobal: true,
  });

  const allNotifs: LeagueNotification[] = [
    rosterNotifA,
    rosterNotifB,
    matchNotifA,
    matchNotifB,
    sysNotif,
  ];

  const filtered = filterNotificationsForUser({
    notifications: allNotifs,
    currentUser: organizerA,
    activeTournamentId: 'tour-A',
    tournaments: sampleTournaments,
    allClubs: sampleClubs,
    allMatches: sampleMatches,
  });

  assert.equal(filtered.length, 3);
  assert.ok(filtered.some((n) => n.id === rosterNotifA.id));
  assert.ok(filtered.some((n) => n.id === matchNotifA.id));
  assert.ok(filtered.some((n) => n.id === sysNotif.id));
  // Must NOT include Tournament B notifications
  assert.equal(filtered.some((n) => n.tournamentId === 'tour-B'), false);
  // Roster notification includes exact club name
  assert.equal(rosterNotifA.clubName, 'Murano Voley');
  assert.ok(rosterNotifA.message.includes('Murano Voley'));
});

test('Club Delegate ONLY receives notifications from their tournament & club, never other tournaments or organizer-only roster audits', () => {
  const rosterNotifA = buildRosterModificationNotification({
    tournamentId: 'tour-A',
    club: sampleClubs[1],
    actionTitle: 'Modificación de Nómina',
    detailMessage: 'Actualizó cuerpo técnico',
    actorName: 'Marco Rossi',
  });
  const matchNotifA = buildMatchResultNotification({
    tournamentId: 'tour-A',
    match: sampleMatches[0],
    homeClubName: 'Murano Voley',
    awayClubName: 'Stadio Italiano',
    actorName: 'Mesa Control',
  });
  const matchNotifB = buildMatchResultNotification({
    tournamentId: 'tour-B',
    match: sampleMatches[1],
    homeClubName: 'Puerto Voley',
    awayClubName: 'Valpo Club',
    actorName: 'Mesa Control',
  });
  const privateClubA2Notif: LeagueNotification = {
    id: 'notif-priv-a2',
    tournamentId: 'tour-A',
    title: 'Aviso Exclusivo Stadio Italiano',
    message: 'Revisión de documentos pendientes',
    category: 'disciplinaria',
    targetClubId: 'club-A2',
    priority: 'alta',
    sender: 'Organizador A',
    timestamp: 'Ahora mismo',
    readBy: [],
  };
  const myClubNotif: LeagueNotification = {
    id: 'notif-priv-a1',
    tournamentId: 'tour-A',
    title: 'Citatorio Oficial Murano Voley',
    message: 'Presentarse 30 minutos antes en Cancha 1',
    category: 'convocatoria',
    targetClubId: 'club-A1',
    priority: 'normal',
    sender: 'Organizador A',
    timestamp: 'Ahora mismo',
    readBy: [],
  };

  const filtered = filterNotificationsForUser({
    notifications: [rosterNotifA, matchNotifA, matchNotifB, privateClubA2Notif, myClubNotif],
    currentUser: delegateA1,
    activeTournamentId: 'tour-A',
    tournaments: sampleTournaments,
    allClubs: sampleClubs,
    allMatches: sampleMatches,
  });

  // Delegate A1 should ONLY see matchNotifA (from tour-A involving club-A1) and myClubNotif (targeted to club-A1)
  assert.equal(filtered.length, 2);
  assert.ok(filtered.some((n) => n.id === matchNotifA.id));
  assert.ok(filtered.some((n) => n.id === myClubNotif.id));
  assert.equal(filtered.some((n) => n.id === rosterNotifA.id), false);
  assert.equal(filtered.some((n) => n.id === matchNotifB.id), false);
  assert.equal(filtered.some((n) => n.id === privateClubA2Notif.id), false);
});

test('Notification preferences toggle filters out disabled categories', () => {
  const rosterNotifA = buildRosterModificationNotification({
    tournamentId: 'tour-A',
    club: sampleClubs[0],
    actionTitle: 'Modificación de Nómina',
    detailMessage: 'Inscribió al jugador #10 Matías Soto',
    actorName: 'Carlos Díaz',
  });

  const filteredWithDisabledRoster = filterNotificationsForUser({
    notifications: [rosterNotifA],
    currentUser: organizerA,
    activeTournamentId: 'tour-A',
    tournaments: sampleTournaments,
    allClubs: sampleClubs,
    preferences: {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      modificacion_nomina: false,
    },
  });

  assert.equal(filteredWithDisabledRoster.length, 0);
});
