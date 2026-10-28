import { test } from 'node:test';
import assert from 'node:assert';
import { generateRoundRobinFixtures, generateEliminationBracket, distributeClubsIntoGroups } from './tournamentScheduler.js';
import { Club } from '../types/index.js';

function createMockClub(id: string, name: string): Club {
  return {
    id,
    name,
    shortName: name.slice(0, 3).toUpperCase(),
    color: '#0052fe',
    secondaryColor: '#f59e0b',
    category: 'Sub18',
    managerUsername: 'mgr_' + id,
    managerName: 'Manager ' + name,
    managerEmail: id + '@club.cl',
    homeCourt: 'Cancha Central',
    staff: { headCoach: 'DT ' + name, assistantCoach: '' },
    roster: [],
  };
}

test('generateRoundRobinFixtures with ODD teams (5 teams) assigns Libre and 1 rest per team', () => {
  const clubs = [
    createMockClub('c1', 'Club Uno'),
    createMockClub('c2', 'Club Dos'),
    createMockClub('c3', 'Club Tres'),
    createMockClub('c4', 'Club Cuatro'),
    createMockClub('c5', 'Club Cinco'),
  ];

  const result = generateRoundRobinFixtures(clubs, 't1', 'Sub18', 'Gimnasio', '2026-03-01', false);

  // In 5 teams round robin: n=6 (with Libre), 5 rounds.
  // Each round has 2 real matches and 1 resting team (facing Libre).
  // Total matches = 5 * 2 = 10 matches.
  assert.strictEqual(result.matches.length, 10);

  // Exactly 5 byes recorded, one for each round
  const byeKeys = Object.keys(result.byesPerRound);
  assert.strictEqual(byeKeys.length, 5);

  // Each team rests exactly once
  const restedTeams = Object.values(result.byesPerRound).map((b) => b.teamId);
  const uniqueRested = new Set(restedTeams);
  assert.strictEqual(uniqueRested.size, 5);
  for (const c of clubs) {
    assert.strictEqual(uniqueRested.has(c.id), true);
  }
});

test('generateRoundRobinFixtures with EVEN teams (4 teams) has 0 byes and all play each other', () => {
  const clubs = [
    createMockClub('c1', 'Club Uno'),
    createMockClub('c2', 'Club Dos'),
    createMockClub('c3', 'Club Tres'),
    createMockClub('c4', 'Club Cuatro'),
  ];

  const result = generateRoundRobinFixtures(clubs, 't1', 'Sub18', 'Gimnasio', '2026-03-01', false);
  // 4 teams -> 3 rounds * 2 matches = 6 matches.
  assert.strictEqual(result.matches.length, 6);
  assert.strictEqual(Object.keys(result.byesPerRound).length, 0);
});

test('distributeClubsIntoGroups with odd teams has max difference of 1', () => {
  const clubs = [
    createMockClub('c1', 'C1'),
    createMockClub('c2', 'C2'),
    createMockClub('c3', 'C3'),
    createMockClub('c4', 'C4'),
    createMockClub('c5', 'C5'),
    createMockClub('c6', 'C6'),
    createMockClub('c7', 'C7'),
  ];
  const groups = distributeClubsIntoGroups(clubs, 2);
  const sizeA = groups['Grupo A'].length;
  const sizeB = groups['Grupo B'].length;
  assert.ok(Math.abs(sizeA - sizeB) <= 1);
  assert.strictEqual(sizeA + sizeB, 7);
});

test('generateEliminationBracket balances byes across brackets', () => {
  const clubs = [
    createMockClub('c1', 'C1'),
    createMockClub('c2', 'C2'),
    createMockClub('c3', 'C3'),
    createMockClub('c4', 'C4'),
    createMockClub('c5', 'C5'),
  ];
  // 5 teams -> next power of 2 is 8 (cuartos de final: 4 matches, 3 byes)
  const bracket = generateEliminationBracket(clubs, 'cuartos', 'Estadio');
  assert.strictEqual(bracket.length, 4);
});
