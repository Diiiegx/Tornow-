import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDeadlineStatus,
  autoFillClubVenueRoster,
  validateVenueRoster,
  buildWhatsAppUrgentReminderUrl,
  generateVenuePdfBlob,
  generateVenueXlsxBlob,
  fillVenueRosterWithAi,
  type VenueAttendee,
} from './venueEntranceEngine';
import type { Club, Player } from '../types';

describe('venueEntranceEngine pure logic', () => {
  test('calculateDeadlineStatus enforces the 24h upload limit and 12h automatic lock', () => {
    const fixedNow = new Date('2026-11-01T10:00:00');

    // Case 1: Match is in 30 hours (> 24h) -> OPEN_EARLY
    const st30h = calculateDeadlineStatus('2026-11-02', '16:00', fixedNow);
    assert.equal(st30h.key, 'OPEN_EARLY');
    assert.equal(st30h.canEdit, true);
    assert.equal(st30h.isLocked12Hours, false);
    assert.equal(st30h.isWithin24Hours, false);

    // Case 2: Match is in 18 hours (between 12h and 24h) -> OPEN_FINAL_WINDOW
    const st18h = calculateDeadlineStatus('2026-11-02', '04:00', fixedNow);
    assert.equal(st18h.key, 'OPEN_FINAL_WINDOW');
    assert.equal(st18h.canEdit, true);
    assert.equal(st18h.isLocked12Hours, false);
    assert.equal(st18h.isWithin24Hours, true);

    // Case 3: Match is in 6 hours (< 12h) -> LOCKED_FOR_VENUE
    const st6h = calculateDeadlineStatus('2026-11-01', '16:00', fixedNow);
    assert.equal(st6h.key, 'LOCKED_FOR_VENUE');
    assert.equal(st6h.canEdit, false);
    assert.equal(st6h.isLocked12Hours, true);
    assert.equal(st6h.isWithin24Hours, true);

    // Case 4: Match was 2 hours ago -> PAST
    const stPast = calculateDeadlineStatus('2026-11-01', '08:00', fixedNow);
    assert.equal(stPast.key, 'PAST');
    assert.equal(stPast.canEdit, false);
    assert.equal(stPast.isPast, true);
  });

  test('autoFillClubVenueRoster includes staff, valid players, and strictly excludes suspended players', () => {
    const mockClub: Club = {
      id: 'club-test-1',
      name: 'Club Deportivo Murano',
      shortName: 'MUR',
      color: '#0052fe',
      secondaryColor: '#ffffff',
      category: 'Sub18',
      managerUsername: 'carlos_m',
      managerName: 'Carlos Mendoza',
      managerEmail: 'carlos@murano.cl',
      managerPhone: '+56911223344',
      homeCourt: 'Cancha Central',
      staff: {
        headCoach: 'Marcelo Gigante',
        assistantCoach: 'Patricio Riquelme',
      },
      roster: [
        {
          id: 'p1',
          clubId: 'club-test-1',
          name: 'Vicente',
          paternalSurname: 'Parraguirre',
          dorsal: 9,
          position: 'Punta Receptor',
          rut: '18.245.789-2',
          isCaptain: true,
          isLibero: false,
          isSuspended: false,
        },
        {
          id: 'p2',
          clubId: 'club-test-1',
          name: 'Dusan',
          paternalSurname: 'Bonavic',
          dorsal: 11,
          position: 'Opuesto',
          rut: '17.892.451-6',
          isCaptain: false,
          isLibero: false,
          isSuspended: true, // Sancionado
          suspendedMatchesRemaining: 2,
        },
        {
          id: 'p3',
          clubId: 'club-test-1',
          name: 'Sebastián',
          paternalSurname: 'Albornoz',
          dorsal: 3,
          position: 'Armador',
          rut: '19.352.418-4',
          isCaptain: false,
          isLibero: false,
          isSuspended: false,
        },
      ],
    };

    const attendees = autoFillClubVenueRoster(mockClub, { excludeSuspended: true });

    // Should contain: Head Coach, Assistant Coach, Manager, and players p1 and p3. p2 must be excluded.
    const names = attendees.map((a) => a.name);
    assert.ok(names.includes('Marcelo Gigante'));
    assert.ok(names.includes('Patricio Riquelme'));
    assert.ok(names.includes('Carlos Mendoza'));
    assert.ok(names.some((n) => n.includes('Parraguirre')));
    assert.ok(names.some((n) => n.includes('Albornoz')));
    assert.equal(names.some((n) => n.includes('Bonavic')), false, 'Suspended player Bonavic should not be included');

    const validation = validateVenueRoster(attendees);
    assert.equal(validation.isValid, true);
    assert.equal(validation.sanctionedCount, 0);
  });

  test('validateVenueRoster rejects attendees with invalid names or active disciplinary sanctions', () => {
    const invalidAttendees: VenueAttendee[] = [
      {
        id: 'att-1',
        name: 'A', // Too short
        rut: '19.456.789-0',
        role: 'Jugador',
        status: 'habilitado',
      },
      {
        id: 'att-2',
        name: 'Jugador Suspendido',
        rut: '18.123.456-7',
        role: 'Jugador',
        dorsal: 4,
        status: 'sancionado', // Active sanction
      },
    ];

    const result = validateVenueRoster(invalidAttendees);
    assert.equal(result.isValid, false);
    assert.equal(result.sanctionedCount, 1);
    assert.ok(result.errors.length >= 2);
  });

  test('buildWhatsAppUrgentReminderUrl formats phone number and provides clear urgent notice', () => {
    const url = buildWhatsAppUrgentReminderUrl({
      delegatePhone: '957950579',
      delegateName: 'Marco',
      clubName: 'Stadio Italiano',
      tournamentName: 'Copa Apertura',
      venueName: 'Estadio Italiano',
      matchDate: '2026-11-05',
      matchTime: '18:00',
      hoursRemaining: 16.5,
    });

    assert.ok(url.startsWith('https://wa.me/56957950579?text='));
    assert.ok(url.includes('URGENTE'));
    assert.ok(url.includes('Estadio%20Italiano') || url.includes('Estadio+Italiano'));
  });

  test('generateVenuePdfBlob builds a valid jsPDF document without errors', () => {
    const attendees: VenueAttendee[] = [
      {
        id: '1',
        name: 'Esteban Grimalt',
        rut: '17.888.999-2',
        role: 'Jugador',
        dorsal: 1,
        status: 'habilitado',
      },
      {
        id: '2',
        name: 'Marco Grimalt',
        rut: '17.777.666-5',
        role: 'Jugador',
        dorsal: 2,
        status: 'habilitado',
      },
    ];

    const { doc, filename } = generateVenuePdfBlob({
      venueName: 'Polideportivo CEO Ñuñoa',
      entranceGate: 'Puerta Norte Ramón Cruz',
      tournamentName: 'Liga Nacional TorNow 2026',
      category: 'TC',
      matchDate: '2026-11-10',
      matchTime: '15:30',
      round: 'Fecha 3',
      clubsRosters: [
        {
          clubName: 'Club Vóley Ñuñoa',
          attendees,
        },
      ],
      organizerName: 'Asociación Metropolitana',
    });

    assert.ok(doc);
    assert.ok(filename.includes('polideportivo_ceo'));
    assert.ok(filename.endsWith('.pdf'));

    const output = doc.output('arraybuffer');
    assert.ok(output.byteLength > 1000);
  });

  test('generateVenueXlsxBlob builds a valid XLSX workbook and blob for Excel format', () => {
    const attendees: VenueAttendee[] = [
      {
        id: '1',
        name: 'Esteban Grimalt',
        rut: '17.892.451-6',
        role: 'Jugador',
        dorsal: 1,
        status: 'habilitado',
        licensePlate: 'ABCD-12',
      },
      {
        id: '2',
        name: 'Marco Grimalt',
        rut: '18.245.789-2',
        role: 'Jugador',
        dorsal: 2,
        status: 'habilitado',
      },
    ];

    const { workbook, blob, filename } = generateVenueXlsxBlob({
      venueName: 'Estadio Italiano - Complejo Polideportivo',
      entranceGate: 'Puerta Principal Av. Apoquindo',
      tournamentName: 'Liga Metropolitana 2026',
      category: 'Todo Competidor',
      matchDate: '2026-11-12',
      matchTime: '18:00',
      round: 'Semifinal',
      clubsRosters: [
        {
          clubName: 'Stadio Voley',
          attendees,
        },
      ],
      organizerName: 'Asociación Metropolitana',
      notes: 'Control en caseta de seguridad.',
    });

    assert.ok(workbook);
    assert.ok(workbook.SheetNames.includes('Planilla de Ingreso'));
    assert.ok(filename.includes('estadio_italiano'));
    assert.ok(filename.endsWith('.xlsx'));
    assert.ok(blob);
    assert.equal(blob.type, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    assert.ok(blob.size > 500);
  });

  test('fillVenueRosterWithAi generates valid venue attendees with staff and zero suspended players', async () => {
    const clubMock: Club = {
      id: 'c-test-ai',
      tournamentId: 't-1',
      name: 'Club Voley Manquehue',
      shortName: 'MAN',
      color: '#0052fe',
      secondaryColor: '#ffffff',
      managerUsername: 'delegado_manquehue',
      managerName: 'Delegado Manquehue',
      managerEmail: 'manquehue@tornow.cl',
      managerPhone: '+56912345678',
      homeCourt: 'Cancha Central Manquehue',
      category: 'MASTER VARONES',
      staff: {
        headCoach: 'Marcelo Gigante',
        assistantCoach: 'Claudio Cuello',
      },
      roster: [
        {
          id: 'p-1',
          clubId: 'c-test-ai',
          name: 'Vicente Parraguirre',
          dorsal: 10,
          position: 'Punta Receptor',
          rut: '18.245.789-2',
          isCaptain: true,
          isLibero: false,
          isSuspended: false,
        },
        {
          id: 'p-2',
          clubId: 'c-test-ai',
          name: 'Sebastián Albornoz',
          dorsal: 5,
          position: 'Líbero',
          rut: '17.892.451-6',
          isCaptain: false,
          isLibero: true,
          isSuspended: false,
        },
        {
          id: 'p-suspended',
          clubId: 'c-test-ai',
          name: 'Jugador Castigado',
          dorsal: 8,
          position: 'Central',
          rut: '19.352.418-4',
          isCaptain: false,
          isLibero: false,
          isSuspended: true, // MUST BE EXCLUDED
        },
      ],
    };

    const attendees = await fillVenueRosterWithAi({
      venueTemplate: {
        venueName: 'Estadio Italiano',
        maxAttendeesPerClub: 18,
      },
      club: clubMock,
      matchInfo: {
        venue: 'Estadio Italiano',
        date: '2026-11-03',
        time: '20:00',
        round: 'Fecha 4',
        category: 'MASTER VARONES',
      },
    });

    assert.ok(Array.isArray(attendees));
    assert.ok(attendees.length >= 3);
    // Suspended player must not be present
    assert.equal(attendees.some((a) => a.name === 'Jugador Castigado'), false);
    // Staff and Captain should be present
    assert.ok(attendees.some((a) => (a.role === 'DT' || (a.role as any) === 'Director Técnico') && a.name === 'Marcelo Gigante'));
    assert.ok(attendees.some((a) => a.name === 'Vicente Parraguirre'));
  });

  test('calculateKeyTrialCountdown computes 30-day free trial remaining days, blocked state, and expiration', async () => {
    const { calculateKeyTrialCountdown } = await import('./venueEntranceEngine');
    const fixedNow = new Date('2026-11-10T12:00:00Z');

    // Created 5 days ago -> 25 days remaining
    const activeCountdown = calculateKeyTrialCountdown({
      createdAt: '2026-11-05T12:00:00Z',
      trialDays: 30,
      isBlocked: false,
      now: fixedNow,
    });
    assert.equal(activeCountdown.isBlocked, false);
    assert.equal(activeCountdown.isExpired, false);
    assert.equal(activeCountdown.daysRemaining, 25);
    assert.ok(activeCountdown.shortBadgeLabel.includes('25 días'));

    // Blocked key
    const blockedCountdown = calculateKeyTrialCountdown({
      createdAt: '2026-11-05T12:00:00Z',
      isBlocked: true,
      now: fixedNow,
    });
    assert.equal(blockedCountdown.isBlocked, true);
    assert.equal(blockedCountdown.daysRemaining, 0);

    // Expired key (created 35 days ago -> 5 days past 30-day expiry -> 2 days left of 7-day grace period)
    const expiredCountdown = calculateKeyTrialCountdown({
      createdAt: '2026-10-06T12:00:00Z',
      trialDays: 30,
      isBlocked: false,
      now: fixedNow,
    });
    assert.equal(expiredCountdown.isExpired, true);
    assert.equal(expiredCountdown.isPanelLockedForNonRenewal, true);
    assert.equal(expiredCountdown.daysRemaining, 0);
    assert.equal(expiredCountdown.graceDaysRemaining, 2);
    assert.equal(expiredCountdown.shouldAutoDeleteKeyAndTournament, false);

    // Expired more than 7 days ago without contact -> triggers automatic deletion of key & tournament
    const autoDeleteCountdown = calculateKeyTrialCountdown({
      createdAt: '2026-09-25T12:00:00Z',
      trialDays: 30,
      isBlocked: false,
      now: fixedNow,
    });
    assert.equal(autoDeleteCountdown.isExpired, true);
    assert.equal(autoDeleteCountdown.graceDaysRemaining, 0);
    assert.equal(autoDeleteCountdown.shouldAutoDeleteKeyAndTournament, true);
  });

  test('calculateDurationDays computes days for days, months, and annual keys accurately', async () => {
    const { calculateDurationDays, formatKeyDurationLabel } = await import('./venueEntranceEngine');
    assert.equal(calculateDurationDays('days', 15), 15);
    assert.equal(calculateDurationDays('months', 3), 90);
    assert.equal(calculateDurationDays('annual', 1), 365);
    assert.ok(formatKeyDurationLabel('annual', 1).includes('365 días'));
  });
});


