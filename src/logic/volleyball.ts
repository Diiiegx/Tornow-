import { Club, Match, StandingRow, TournamentCategory, SportType, TournamentRules } from '../types';

/**
 * Calculates official points awarded for a volleyball match based on sets won.
 * Standard FIVB / Tournament scoring:
 * - 3-0 or 3-1: Winner 3 pts, Loser 0 pts
 * - 3-2: Winner 2 pts, Loser 1 pt
 * - If best of 3:
 *   - 2-0: Winner 3 pts, Loser 0 pts
 *   - 2-1: Winner 2 pts, Loser 1 pt
 */
export function calculateMatchPoints(
  homeSetsWon: number,
  awaySetsWon: number
): { homePts: number; awayPts: number } {
  if (homeSetsWon === 0 && awaySetsWon === 0) {
    return { homePts: 0, awayPts: 0 };
  }

  // 3 sets to win or 2 sets to win
  if (homeSetsWon > awaySetsWon) {
    if (awaySetsWon >= homeSetsWon - 1 && awaySetsWon >= 1) {
      // e.g. 3-2 or 2-1
      return { homePts: 2, awayPts: 1 };
    }
    // e.g. 3-0, 3-1, 2-0
    return { homePts: 3, awayPts: 0 };
  } else if (awaySetsWon > homeSetsWon) {
    if (homeSetsWon >= awaySetsWon - 1 && homeSetsWon >= 1) {
      // e.g. 2-3 or 1-2
      return { homePts: 1, awayPts: 2 };
    }
    // e.g. 0-3, 1-3, 0-2
    return { homePts: 0, awayPts: 3 };
  }

  return { homePts: 0, awayPts: 0 };
}

/**
 * Multi-sport point calculator supporting football, futsal, basketball, padel and volleyball
 */
export function calculateSportPoints(
  homeScore: number,
  awayScore: number,
  sport: SportType = 'volleyball',
  rules?: TournamentRules
): { homePts: number; awayPts: number; outcome: 'home' | 'away' | 'tie' | 'none' } {
  if (homeScore === 0 && awayScore === 0) {
    // Check if it's a finished 0-0 in football/futsal
    if (sport === 'football' || sport === 'futsal') {
      return { homePts: 1, awayPts: 1, outcome: 'tie' };
    }
    return { homePts: 0, awayPts: 0, outcome: 'none' };
  }

  if (sport === 'football' || sport === 'futsal') {
    if (homeScore > awayScore) {
      return { homePts: rules?.pointsWin ?? 3, awayPts: rules?.pointsLoss ?? 0, outcome: 'home' };
    } else if (awayScore > homeScore) {
      return { homePts: rules?.pointsLoss ?? 0, awayPts: rules?.pointsWin ?? 3, outcome: 'away' };
    } else {
      return { homePts: rules?.pointsTie ?? 1, awayPts: rules?.pointsTie ?? 1, outcome: 'tie' };
    }
  }

  if (sport === 'basketball') {
    if (homeScore > awayScore) {
      return { homePts: 2, awayPts: 1, outcome: 'home' };
    } else {
      return { homePts: 1, awayPts: 2, outcome: 'away' };
    }
  }

  if (sport === 'padel') {
    if (homeScore > awayScore) {
      return { homePts: 2, awayPts: 0, outcome: 'home' };
    } else {
      return { homePts: 0, awayPts: 2, outcome: 'away' };
    }
  }

  // Volleyball default
  const vbPoints = calculateMatchPoints(homeScore, awayScore);
  const outcome = homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : 'none';
  return { ...vbPoints, outcome };
}

/**
 * Computes official standings table for given clubs and finished matches.
 * Returns: PJ, PG, PP, PE (tied), SF/GF, SC/GC, DS/DG, PTS (Ptos).
 */
export function calculateStandings(
  clubs: Club[],
  matches: Match[],
  category?: TournamentCategory,
  group?: string,
  sport: SportType = 'volleyball',
  rules?: TournamentRules
): StandingRow[] {
  let relevantClubs = clubs;

  if (category) {
    relevantClubs = relevantClubs.filter((c) => c.category === category);
  }

  if (group && group !== 'ALL') {
    relevantClubs = relevantClubs.filter((c) => c.group === group);
  }

  const statsMap = new Map<string, {
    played: number;
    won: number;
    lost: number;
    tied: number;
    setsFor: number;
    setsAgainst: number;
    pts: number;
    matchesHistory: { date: string; result: 'W' | 'L' | 'D' }[];
  }>();

  for (const club of relevantClubs) {
    statsMap.set(club.id, {
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      setsFor: 0,
      setsAgainst: 0,
      pts: 0,
      matchesHistory: [],
    });
  }

  // Filter finished matches
  const finishedMatches = matches.filter(
    (m) =>
      m.status === 'finished' &&
      (!category || m.category === category) &&
      (!group || group === 'ALL' || m.group === group)
  );

  for (const match of finishedMatches) {
    const homeStats = statsMap.get(match.homeTeamId);
    const awayStats = statsMap.get(match.awayTeamId);

    if (!homeStats || !awayStats) continue;

    const homeSets = match.homeSetsWon;
    const awaySets = match.awaySetsWon;

    homeStats.played += 1;
    awayStats.played += 1;

    homeStats.setsFor += homeSets;
    homeStats.setsAgainst += awaySets;
    awayStats.setsFor += awaySets;
    awayStats.setsAgainst += homeSets;

    const outcomeData = calculateSportPoints(homeSets, awaySets, sport, rules);
    homeStats.pts += outcomeData.homePts;
    awayStats.pts += outcomeData.awayPts;

    if (outcomeData.outcome === 'home') {
      homeStats.won += 1;
      awayStats.lost += 1;
      homeStats.matchesHistory.push({ date: match.date, result: 'W' });
      awayStats.matchesHistory.push({ date: match.date, result: 'L' });
    } else if (outcomeData.outcome === 'away') {
      awayStats.won += 1;
      homeStats.lost += 1;
      homeStats.matchesHistory.push({ date: match.date, result: 'L' });
      awayStats.matchesHistory.push({ date: match.date, result: 'W' });
    } else if (outcomeData.outcome === 'tie') {
      homeStats.tied += 1;
      awayStats.tied += 1;
      homeStats.matchesHistory.push({ date: match.date, result: 'D' });
      awayStats.matchesHistory.push({ date: match.date, result: 'D' });
    }
  }

  const rows: StandingRow[] = relevantClubs.map((club) => {
    const s = statsMap.get(club.id)!;
    const diffSets = s.setsFor - s.setsAgainst;
    const sortedHistory = [...s.matchesHistory].sort((a, b) => a.date.localeCompare(b.date));
    const form = sortedHistory.slice(-5).map((h) => h.result);

    return {
      clubId: club.id,
      clubName: club.name,
      shortName: club.shortName,
      category: club.category,
      group: club.group,
      played: s.played,
      won: s.won,
      lost: s.lost,
      tied: s.tied,
      setsFor: s.setsFor,
      setsAgainst: s.setsAgainst,
      diffSets,
      pts: s.pts,
      form,
    };
  });

  // Sort by: Ptos (PTS) desc, PG (won) desc, DS (diffSets) desc, SF (setsFor) desc
  rows.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.won !== a.won) return b.won - a.won;
    if (b.diffSets !== a.diffSets) return b.diffSets - a.diffSets;
    if (b.setsFor !== a.setsFor) return b.setsFor - a.setsFor;
    return a.clubName.localeCompare(b.clubName);
  });

  return rows;
}
