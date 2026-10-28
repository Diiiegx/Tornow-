/**
 * Tournament Fixture & Playoffs Scheduling Engine
 * Implements:
 * - Round Robin Circle Method (Berger tables) with odd teams "Libre" (BYE) handling
 * - Single Elimination bracket with Next Power of 2 byes balanced across opposite sides
 * - Equal distribution of groups (max difference 1 team)
 * - Match time rotation to prevent teams always playing in the same slot
 */

import { Match, Club, PlayoffMatchup, PlayoffStage, TournamentFormat } from '../types';

export const LIBRE_TEAM_ID = 'LIBRE';

export interface RoundRobinScheduleResult {
  matches: Match[];
  byesPerRound: Record<string, { round: string; teamId: string; teamName: string }>;
}

/**
 * Standard Circle Method (Berger Tables) for Round Robin
 * @param clubs List of participating clubs
 * @param tournamentId ID of tournament
 * @param category Category name
 * @param venue Default venue
 * @param startDate Starting date string (YYYY-MM-DD)
 * @param doubleRound Whether to generate home and away (Ida y Vuelta)
 */
export function generateRoundRobinFixtures(
  clubs: Club[],
  tournamentId: string,
  category: string,
  venue: string,
  startDateStr: string = new Date().toISOString().split('T')[0],
  doubleRound: boolean = false
): RoundRobinScheduleResult {
  const matches: Match[] = [];
  const byesPerRound: Record<string, { round: string; teamId: string; teamName: string }> = {};

  if (clubs.length < 2) {
    return { matches: [], byesPerRound: {} };
  }

  // Work with a copy of club IDs
  const teamList: { id: string; name: string }[] = clubs.map((c) => ({ id: c.id, name: c.name }));

  // If odd, append dummy "LIBRE" team
  const isOdd = teamList.length % 2 !== 0;
  if (isOdd) {
    teamList.push({ id: LIBRE_TEAM_ID, name: 'Libre' });
  }

  const n = teamList.length;
  const roundsCount = n - 1;
  const matchesPerRound = n / 2;

  // Available time slots to rotate teams across hours
  const timeSlots = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00', '18:30', '20:00'];

  // Parse start date
  const baseDate = new Date(startDateStr);

  // Generate round 1 to roundsCount (First Leg / Rueda 1)
  const totalLegs = doubleRound ? 2 : 1;

  for (let leg = 1; leg <= totalLegs; leg++) {
    // Circle array: teamList[0] is fixed pivot, others rotate
    const teams = [...teamList];

    for (let roundIdx = 0; roundIdx < roundsCount; roundIdx++) {
      const actualRoundNum = (leg - 1) * roundsCount + (roundIdx + 1);
      const roundLabel = `Fecha ${actualRoundNum}`;

      // Date: each round is scheduled weekly
      const roundDate = new Date(baseDate.getTime() + (actualRoundNum - 1) * 7 * 86400000);
      const roundDateStr = roundDate.toISOString().split('T')[0];

      for (let mIdx = 0; mIdx < matchesPerRound; mIdx++) {
        const homeIdx = mIdx;
        const awayIdx = n - 1 - mIdx;

        let homeTeam = teams[homeIdx];
        let awayTeam = teams[awayIdx];

        // In second leg (Ida y Vuelta), swap home and away
        if (leg === 2) {
          const temp = homeTeam;
          homeTeam = awayTeam;
          awayTeam = temp;
        }

        // Check if one of them is LIBRE (Bye / Descanso)
        if (homeTeam.id === LIBRE_TEAM_ID || awayTeam.id === LIBRE_TEAM_ID) {
          const restingTeam = homeTeam.id === LIBRE_TEAM_ID ? awayTeam : homeTeam;
          byesPerRound[roundLabel] = {
            round: roundLabel,
            teamId: restingTeam.id,
            teamName: restingTeam.name,
          };
          // Do NOT create a competitive match against Libre.
          // By specification: "Esto no cuenta como partido jugado, ni como victoria ni derrota, ni suma puntos ni goles."
          continue;
        }

        // Rotate hour slot so teams don't always play at the same time
        const slotIdx = (mIdx + roundIdx) % timeSlots.length;
        const matchTime = timeSlots[slotIdx];

        const matchId = `m-${tournamentId}-${category.toLowerCase().replace(/[^a-z0-9]/g, '')}-r${actualRoundNum}-${mIdx + 1}`;

        matches.push({
          id: matchId,
          tournamentId,
          category,
          round: roundLabel,
          date: roundDateStr,
          time: matchTime,
          court: venue || 'Cancha Principal',
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          status: 'scheduled',
          homeSetsWon: 0,
          awaySetsWon: 0,
        });
      }

      // Rotate array for next round: keep teams[0] fixed, rotate teams[1..n-1]
      const last = teams.pop()!;
      teams.splice(1, 0, last);
    }
  }

  return { matches, byesPerRound };
}

/**
 * Generate Single Elimination Bracket (Playoffs) with byes balanced across brackets
 */
export function generateEliminationBracket(
  clubs: Club[],
  startingStage: PlayoffStage = 'cuartos',
  venue: string = 'Recinto Oficial'
): PlayoffMatchup[] {
  const count = clubs.length;
  if (count < 2) return [];

  // Determine required bracket size (next power of 2)
  let targetSize = 4;
  if (count > 16 || startingStage === 'octavos') targetSize = 16;
  else if (count > 8) targetSize = 16;
  else if (count > 4 || startingStage === 'cuartos') targetSize = 8;
  else if (count > 2 || startingStage === 'semifinal') targetSize = 4;
  else targetSize = 2;

  // Byes needed
  const byesCount = Math.max(0, targetSize - count);

  // Distribute seeds into bracket with balanced byes in opposite halves
  // Standard tournament seeding for top/bottom half balance:
  // For size 8: Top half: 1 vs 8, 4 vs 5. Bottom half: 2 vs 7, 3 vs 6.
  // Byes are awarded to top seeds: Seed 1 gets first bye (top half), Seed 2 gets second bye (bottom half), etc.
  const matchupsCount = targetSize / 2;
  const matchups: PlayoffMatchup[] = [];

  const stageName =
    targetSize === 16 ? 'octavos' : targetSize === 8 ? 'cuartos' : targetSize === 4 ? 'semifinal' : 'final';

  for (let i = 0; i < matchupsCount; i++) {
    const roundLabel =
      stageName === 'octavos'
        ? `Octavos ${i + 1}`
        : stageName === 'cuartos'
        ? `Cuartos ${i + 1}`
        : stageName === 'semifinal'
        ? `Semifinal ${i + 1}`
        : 'Gran Final';

    // Top seed in this match
    const seed1 = i + 1;
    // Opponent seed
    const seed2 = targetSize - i;

    const club1 = clubs[seed1 - 1];
    const club2 = clubs[seed2 - 1];

    // Check if this match contains a BYE (direct pass)
    const isClub1Bye = seed1 > count;
    const isClub2Bye = seed2 > count;

    let winnerClubId: string | undefined = undefined;
    let team1Label = club1 ? club1.name : isClub1Bye ? 'Pase Libre' : `Clasificado ${seed1}`;
    let team2Label = club2 ? club2.name : isClub2Bye ? 'Pase Libre (Descanso)' : `Clasificado ${seed2}`;

    if (isClub2Bye && club1) {
      winnerClubId = club1.id;
      team2Label = 'Pase Directo (Avanza)';
    } else if (isClub1Bye && club2) {
      winnerClubId = club2.id;
      team1Label = 'Pase Directo (Avanza)';
    }

    matchups.push({
      id: `pl-${stageName}-${i + 1}`,
      stage: stageName,
      roundLabel,
      team1Label,
      team2Label,
      team1ClubId: club1?.id,
      team2ClubId: club2?.id,
      winnerClubId,
      court: venue,
    });
  }

  return matchups;
}

/**
 * Distribute clubs into groups evenly (max difference 1 team)
 */
export function distributeClubsIntoGroups(clubs: Club[], groupCount: number): Record<string, Club[]> {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const groups: Record<string, Club[]> = {};

  for (let i = 0; i < groupCount; i++) {
    const groupName = `Grupo ${letters[i] || i + 1}`;
    groups[groupName] = [];
  }

  // Round robin assignment to ensure difference is at most 1
  clubs.forEach((club, index) => {
    const groupIndex = index % groupCount;
    const groupName = `Grupo ${letters[groupIndex] || groupIndex + 1}`;
    groups[groupName].push(club);
  });

  return groups;
}
