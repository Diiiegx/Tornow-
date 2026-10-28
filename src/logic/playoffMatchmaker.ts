import { Club, Standing, PlayoffStage, PlayoffMatchup } from '../types';

export interface PlayoffClubSeed {
  clubId: string;
  clubName: string;
  shortName: string;
  color: string;
  seed: number;
  pot: 'A' | 'B'; // Pot A (top seeds) vs Pot B (challengers)
  points: number;
  wins: number;
  losses: number;
  setsRatio: number;
  pointsRatio: number;
  formScore: number; // 0-100 statistical weight
}

export interface MatchupNodeConnection {
  fromNodeId: string;
  toNodeId: string;
  intensity: number; // For glowing pulse
}

export interface PlayoffDrawResult {
  stage: PlayoffStage;
  seeds: PlayoffClubSeed[];
  matchups: PlayoffMatchup[];
  connections: MatchupNodeConnection[];
  isManual: boolean;
  generatedAt: string;
}

/**
 * Extracts and sorts club seeds based on table standings and statistics.
 * Clubs with higher points and sets ratio receive higher seeding and Pot A placement.
 */
export function buildClubSeedsFromStandings(
  clubs: Club[],
  standings: Standing[],
  stage: PlayoffStage = 'cuartos'
): PlayoffClubSeed[] {
  const targetCount = stage === 'octavos' ? 16 : stage === 'cuartos' ? 8 : stage === 'semifinal' ? 4 : 2;

  // Map standings to a lookup
  const standingsMap = new Map<string, Standing>();
  standings.forEach((st) => standingsMap.set(st.clubId, st));

  // Combine club info with standings or fallback defaults
  const candidates: PlayoffClubSeed[] = clubs.map((club, idx) => {
    const st = standingsMap.get(club.id);
    const points = st ? st.points : Math.max(0, 10 - idx);
    const wins = st ? st.wins : Math.max(0, 3 - Math.floor(idx / 2));
    const losses = st ? st.losses : Math.floor(idx / 2);
    const setsRatio = st ? st.setsRatio : Number((1.5 - idx * 0.1).toFixed(2));
    const pointsRatio = st ? st.pointsRatio : Number((1.2 - idx * 0.05).toFixed(2));

    // Weighted form score from 10 to 99
    const formScore = Math.min(
      99,
      Math.max(15, Math.round(points * 4 + wins * 5 + setsRatio * 15 + pointsRatio * 10))
    );

    return {
      clubId: club.id,
      clubName: club.name,
      shortName: club.shortName || club.name.slice(0, 3).toUpperCase(),
      color: club.color || '#0052fe',
      seed: 0,
      pot: 'A',
      points,
      wins,
      losses,
      setsRatio,
      pointsRatio,
      formScore,
    };
  });

  // Sort candidates strictly by competitive standing: points DESC -> wins DESC -> setsRatio DESC -> pointsRatio DESC
  candidates.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.setsRatio !== a.setsRatio) return b.setsRatio - a.setsRatio;
    return b.pointsRatio - a.pointsRatio;
  });

  // Limit to targetCount
  const selected = candidates.slice(0, targetCount);

  // If we don't have enough clubs, pad with placeholder seeds so the bracket is valid
  while (selected.length < targetCount) {
    const idx = selected.length + 1;
    selected.push({
      clubId: `placeholder-${idx}`,
      clubName: `Clasificado #${idx}`,
      shortName: `C${idx}`,
      color: '#64748b',
      seed: idx,
      pot: idx <= targetCount / 2 ? 'A' : 'B',
      points: 0,
      wins: 0,
      losses: 0,
      setsRatio: 0,
      pointsRatio: 0,
      formScore: 40,
    });
  }

  // Assign seeds and pots (Pot A = top half, Pot B = bottom half)
  const half = Math.floor(targetCount / 2);
  selected.forEach((team, idx) => {
    team.seed = idx + 1;
    team.pot = idx < half ? 'A' : 'B';
  });

  return selected;
}

/**
 * Generates automatic playoff matchups based on standings statistics with randomized draws.
 * Pot A (top seeds) are drawn against Pot B (challengers) in a statistical lottery,
 * ensuring competitive fairness with dynamic unpredictability.
 */
export function generateAutomaticPlayoffMatchups(
  clubs: Club[],
  standings: Standing[],
  stage: PlayoffStage = 'cuartos',
  randomSeedFn: () => number = Math.random
): PlayoffDrawResult {
  const seeds = buildClubSeedsFromStandings(clubs, standings, stage);
  const half = Math.floor(seeds.length / 2);

  const potA = [...seeds.slice(0, half)];
  const potB = [...seeds.slice(half)];

  // Shuffle pot B using Fisher-Yates with randomSeedFn
  for (let i = potB.length - 1; i > 0; i--) {
    const j = Math.floor(randomSeedFn() * (i + 1));
    [potB[i], potB[j]] = [potB[j], potB[i]];
  }

  const matchups: PlayoffMatchup[] = [];
  const connections: MatchupNodeConnection[] = [];

  const roundNamePrefix =
    stage === 'octavos'
      ? 'Octavos'
      : stage === 'cuartos'
      ? 'Cuartos'
      : stage === 'semifinal'
      ? 'Semifinal'
      : 'Gran Final';

  for (let i = 0; i < half; i++) {
    const team1 = potA[i];
    const team2 = potB[i];
    const matchId = `pl-${stage}-${i + 1}`;

    matchups.push({
      id: matchId,
      stage,
      roundLabel: `${roundNamePrefix} ${i + 1}`,
      team1Label: `${team1.seed}° ${team1.clubName}`,
      team2Label: `${team2.seed}° ${team2.clubName}`,
      team1ClubId: team1.clubId,
      team2ClubId: team2.clubId,
      score1: 0,
      score2: 0,
    });

    connections.push({
      fromNodeId: team1.clubId,
      toNodeId: matchId,
      intensity: 0.9,
    });
    connections.push({
      fromNodeId: team2.clubId,
      toNodeId: matchId,
      intensity: 0.7,
    });
  }

  return {
    stage,
    seeds,
    matchups,
    connections,
    isManual: false,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Creates manual playoff matchups where the organizer explicitly pairs clubs.
 */
export function generateManualPlayoffMatchups(
  pairs: Array<{ team1ClubId: string; team2ClubId: string; stage: PlayoffStage; label?: string }>,
  clubs: Club[]
): PlayoffDrawResult {
  const clubMap = new Map<string, Club>();
  clubs.forEach((c) => clubMap.set(c.id, c));

  const matchups: PlayoffMatchup[] = [];
  const connections: MatchupNodeConnection[] = [];

  pairs.forEach((pair, idx) => {
    const club1 = clubMap.get(pair.team1ClubId);
    const club2 = clubMap.get(pair.team2ClubId);
    const matchId = `pl-manual-${idx + 1}`;

    matchups.push({
      id: matchId,
      stage: pair.stage,
      roundLabel: pair.label || `Llave #${idx + 1}`,
      team1Label: club1?.name || 'Por Definir',
      team2Label: club2?.name || 'Por Definir',
      team1ClubId: pair.team1ClubId,
      team2ClubId: pair.team2ClubId,
      score1: 0,
      score2: 0,
    });

    if (pair.team1ClubId) {
      connections.push({ fromNodeId: pair.team1ClubId, toNodeId: matchId, intensity: 0.8 });
    }
    if (pair.team2ClubId) {
      connections.push({ fromNodeId: pair.team2ClubId, toNodeId: matchId, intensity: 0.8 });
    }
  });

  return {
    stage: pairs[0]?.stage || 'cuartos',
    seeds: [],
    matchups,
    connections,
    isManual: true,
    generatedAt: new Date().toISOString(),
  };
}
