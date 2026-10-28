import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMatchPoints, calculateStandings } from './volleyball';
import { Club, Match } from '../types';

test('calculateMatchPoints: 3-0, 3-1, 3-2, 2-1 and losses', () => {
  assert.deepEqual(calculateMatchPoints(3, 0), { homePts: 3, awayPts: 0 });
  assert.deepEqual(calculateMatchPoints(3, 1), { homePts: 3, awayPts: 0 });
  assert.deepEqual(calculateMatchPoints(3, 2), { homePts: 2, awayPts: 1 });
  assert.deepEqual(calculateMatchPoints(2, 3), { homePts: 1, awayPts: 2 });
  assert.deepEqual(calculateMatchPoints(0, 3), { homePts: 0, awayPts: 3 });
  assert.deepEqual(calculateMatchPoints(2, 1), { homePts: 2, awayPts: 1 });
});

test('calculateStandings: calculates PG, PP, Ptos correctly for MASTER VARONES', () => {
  const clubs: Club[] = [
    {
      id: 'c1',
      name: 'Club Maccabi Vóley',
      shortName: 'MAC',
      color: '#0891b2',
      secondaryColor: '#f59e0b',
      category: 'MASTER VARONES',
      managerUsername: 'maccabi_admin',
      managerName: 'David Levi',
      managerEmail: 'maccabi@test.com',
      homeCourt: 'Gimnasio Maccabi',
      staff: { headCoach: 'Marcelo Wainstein', assistantCoach: 'Ariel Kaplan' },
      roster: [],
    },
    {
      id: 'c2',
      name: 'Halcones Vóley',
      shortName: 'HAL',
      color: '#e11d48',
      secondaryColor: '#0f172a',
      category: 'MASTER VARONES',
      managerUsername: 'halcones_admin',
      managerName: 'Carlos Ruiz',
      managerEmail: 'halcones@test.com',
      homeCourt: 'Polideportivo Central',
      staff: { headCoach: 'Sergio Perez', assistantCoach: 'Mateo Rios' },
      roster: [],
    },
  ];

  const matches: Match[] = [
    {
      id: 'm1',
      round: 'Jornada 1',
      date: '2026-10-20',
      time: '18:00',
      court: 'Cancha Central',
      category: 'MASTER VARONES',
      homeTeamId: 'c1',
      awayTeamId: 'c2',
      status: 'finished',
      homeSetsWon: 3,
      awaySetsWon: 1,
      winnerId: 'c1',
    },
  ];

  const standings = calculateStandings(clubs, matches, 'MASTER VARONES');
  assert.equal(standings[0].clubId, 'c1');
  assert.equal(standings[0].pts, 3);
  assert.equal(standings[0].won, 1);
  assert.equal(standings[0].lost, 0);

  assert.equal(standings[1].clubId, 'c2');
  assert.equal(standings[1].pts, 0);
  assert.equal(standings[1].won, 0);
  assert.equal(standings[1].lost, 1);
});
