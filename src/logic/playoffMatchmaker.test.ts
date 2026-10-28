import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildClubSeedsFromStandings,
  generateAutomaticPlayoffMatchups,
  generateManualPlayoffMatchups,
} from './playoffMatchmaker';
import { Club, Standing } from '../types';

const baseClubProps = {
  secondaryColor: '#ffffff',
  managerUsername: 'admin',
  staff: { headCoach: 'DT', assistantCoach: '', therapist: '', statistician: '' },
  roster: [],
};

const mockClubs: Club[] = [
  { ...baseClubProps, id: 'c1', name: 'Manquehue Vóley', shortName: 'VM', category: 'Sub16', homeCourt: 'Cancha 1', color: '#0052fe', managerName: 'Admin 1', managerEmail: 'a1@test.cl' },
  { ...baseClubProps, id: 'c2', name: 'Stadio Italiano', shortName: 'CSI', category: 'Sub16', homeCourt: 'Cancha 1', color: '#10b981', managerName: 'Admin 2', managerEmail: 'a2@test.cl' },
  { ...baseClubProps, id: 'c3', name: 'Boston College', shortName: 'BC', category: 'Sub16', homeCourt: 'Cancha 2', color: '#f59e0b', managerName: 'Admin 3', managerEmail: 'a3@test.cl' },
  { ...baseClubProps, id: 'c4', name: 'Club Providencia', shortName: 'CP', category: 'Sub16', homeCourt: 'Cancha 2', color: '#ef4444', managerName: 'Admin 4', managerEmail: 'a4@test.cl' },
  { ...baseClubProps, id: 'c5', name: 'Universidad de Chile', shortName: 'UCH', category: 'Sub16', homeCourt: 'Cancha 3', color: '#3b82f6', managerName: 'Admin 5', managerEmail: 'a5@test.cl' },
  { ...baseClubProps, id: 'c6', name: 'Universidad Católica', shortName: 'UC', category: 'Sub16', homeCourt: 'Cancha 3', color: '#8b5cf6', managerName: 'Admin 6', managerEmail: 'a6@test.cl' },
  { ...baseClubProps, id: 'c7', name: 'Alemán de Concepción', shortName: 'ALM', category: 'Sub16', homeCourt: 'Cancha 4', color: '#ec4899', managerName: 'Admin 7', managerEmail: 'a7@test.cl' },
  { ...baseClubProps, id: 'c8', name: 'Excelsior Voley', shortName: 'EXC', category: 'Sub16', homeCourt: 'Cancha 4', color: '#14b8a6', managerName: 'Admin 8', managerEmail: 'a8@test.cl' },
];

const mockStandings: Standing[] = [
  { clubId: 'c1', played: 7, wins: 7, losses: 0, setsWon: 21, setsLost: 3, pointsWon: 520, pointsLost: 380, setsRatio: 7.0, pointsRatio: 1.36, points: 21 },
  { clubId: 'c2', played: 7, wins: 6, losses: 1, setsWon: 19, setsLost: 6, pointsWon: 490, pointsLost: 410, setsRatio: 3.16, pointsRatio: 1.19, points: 18 },
  { clubId: 'c3', played: 7, wins: 5, losses: 2, setsWon: 16, setsLost: 8, pointsWon: 460, pointsLost: 420, setsRatio: 2.0, pointsRatio: 1.09, points: 15 },
  { clubId: 'c4', played: 7, wins: 4, losses: 3, setsWon: 14, setsLost: 11, pointsWon: 440, pointsLost: 430, setsRatio: 1.27, pointsRatio: 1.02, points: 12 },
  { clubId: 'c5', played: 7, wins: 3, losses: 4, setsWon: 11, setsLost: 13, pointsWon: 410, pointsLost: 440, setsRatio: 0.84, pointsRatio: 0.93, points: 9 },
  { clubId: 'c6', played: 7, wins: 2, losses: 5, setsWon: 8, setsLost: 16, pointsWon: 390, pointsLost: 470, setsRatio: 0.5, pointsRatio: 0.82, points: 6 },
  { clubId: 'c7', played: 7, wins: 1, losses: 6, setsWon: 5, setsLost: 18, pointsWon: 370, pointsLost: 490, setsRatio: 0.27, pointsRatio: 0.75, points: 3 },
  { clubId: 'c8', played: 7, wins: 0, losses: 7, setsWon: 2, setsLost: 21, pointsWon: 330, pointsLost: 510, setsRatio: 0.09, pointsRatio: 0.64, points: 0 },
];

describe('playoffMatchmaker pure logic', () => {
  it('correctly ranks and seeds clubs into Pot A and Pot B based on standings', () => {
    const seeds = buildClubSeedsFromStandings(mockClubs, mockStandings, 'cuartos');
    assert.equal(seeds.length, 8);
    // 1st seed should be c1 with 21 points
    assert.equal(seeds[0].clubId, 'c1');
    assert.equal(seeds[0].seed, 1);
    assert.equal(seeds[0].pot, 'A');

    // 4th seed should be in Pot A
    assert.equal(seeds[3].pot, 'A');

    // 5th to 8th seeds should be in Pot B
    assert.equal(seeds[4].pot, 'B');
    assert.equal(seeds[7].pot, 'B');
    assert.equal(seeds[7].clubId, 'c8');
  });

  it('generates automatic randomized matchups pairing Pot A vs Pot B', () => {
    const result = generateAutomaticPlayoffMatchups(mockClubs, mockStandings, 'cuartos', () => 0.5);
    assert.equal(result.matchups.length, 4);
    assert.equal(result.isManual, false);

    // Each matchup should have team1 from Pot A (top 4 seeds)
    const potAIds = ['c1', 'c2', 'c3', 'c4'];
    const potBIds = ['c5', 'c6', 'c7', 'c8'];

    result.matchups.forEach((m) => {
      assert.ok(potAIds.includes(m.team1ClubId!), `team1ClubId ${m.team1ClubId} should be in Pot A`);
      assert.ok(potBIds.includes(m.team2ClubId!), `team2ClubId ${m.team2ClubId} should be in Pot B`);
    });

    // Check node connections are formed
    assert.equal(result.connections.length, 8);
  });

  it('handles semifinals stage with 4 clubs', () => {
    const result = generateAutomaticPlayoffMatchups(mockClubs, mockStandings, 'semifinal');
    assert.equal(result.matchups.length, 2);
    assert.equal(result.seeds.length, 4);
  });

  it('generates manual matchups properly with designated club ids', () => {
    const pairs = [
      { team1ClubId: 'c1', team2ClubId: 'c8', stage: 'cuartos' as const, label: 'Cuartos Clásico' },
      { team1ClubId: 'c2', team2ClubId: 'c7', stage: 'cuartos' as const, label: 'Cuartos 2' },
    ];
    const result = generateManualPlayoffMatchups(pairs, mockClubs);
    assert.equal(result.isManual, true);
    assert.equal(result.matchups.length, 2);
    assert.equal(result.matchups[0].team1Label, 'Manquehue Vóley');
    assert.equal(result.matchups[0].team2Label, 'Excelsior Voley');
    assert.equal(result.matchups[0].roundLabel, 'Cuartos Clásico');
  });
});
