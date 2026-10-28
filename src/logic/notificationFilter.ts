import {
  Club,
  LeagueNotification,
  Match,
  NotificationPreferences,
  SportType,
  Tournament,
  UserAccount,
} from '../types';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  sistema: true,
  marcador: true,
  modificacion_nomina: true,
  cambio_horario: true,
  oficiales: true,
};

/**
 * Returns the list of tournament IDs that a user belongs to as an Organizer or Club Delegate.
 */
export function getUserBelongingTournamentIds(
  user: UserAccount | null,
  tournaments: Tournament[],
  allClubs: Club[]
): string[] {
  if (!user) return [];

  if (user.role === 'super_admin') {
    return tournaments.map((t) => t.id);
  }

  if (user.role === 'organizer') {
    const ownedIds = tournaments
      .filter((t) => t.organizerUserId === user.id)
      .map((t) => t.id);
    const assignedIds = user.organizerTournamentIds || [];
    return Array.from(new Set([...ownedIds, ...assignedIds])).filter(Boolean);
  }

  if (user.role === 'club_admin' && user.clubId) {
    const myClub = allClubs.find((c) => c.id === user.clubId);
    return myClub?.tournamentId ? [myClub.tournamentId] : [];
  }

  return [];
}

export interface FilterNotificationsOptions {
  notifications: LeagueNotification[];
  currentUser: UserAccount | null;
  activeTournamentId?: string;
  tournaments: Tournament[];
  allClubs: Club[];
  allMatches?: Match[];
  preferences?: NotificationPreferences;
}

/**
 * Checks whether a notification category is enabled in the user's preferences.
 */
export function isCategoryEnabledByPreferences(
  category: LeagueNotification['category'],
  prefs: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES
): boolean {
  switch (category) {
    case 'sistema':
      return prefs.sistema;
    case 'marcador':
      return prefs.marcador;
    case 'modificacion_nomina':
      return prefs.modificacion_nomina;
    case 'cambio_horario':
      return prefs.cambio_horario;
    case 'convocatoria':
    case 'disciplinaria':
    case 'circular_general':
      return prefs.oficiales;
    default:
      return true;
  }
}

/**
 * Strictly filters notifications so that:
 * - Organizers and Club Delegates ONLY receive notifications from the tournament they belong to
 *   (plus system notifications addressed to them), and NEVER from other tournaments or unrelated matches.
 * - Roster modification notifications ('modificacion_nomina') are delivered to the tournament Organizer
 *   (and Super Admin) with the exact Club name that performed the modification.
 * - Match result updates ('marcador') are delivered to the tournament Organizer and the clubs in that tournament.
 */
export function filterNotificationsForUser({
  notifications,
  currentUser,
  activeTournamentId,
  tournaments,
  allClubs,
  allMatches = [],
  preferences = DEFAULT_NOTIFICATION_PREFERENCES,
}: FilterNotificationsOptions): LeagueNotification[] {
  // Unauthenticated guests or basic users do not belong to any club/organizer role
  if (!currentUser || currentUser.role === 'usuario') {
    return notifications.filter((n) => {
      if (!isCategoryEnabledByPreferences(n.category, preferences)) return false;
      if (n.targetUserId) return false;
      if (n.targetRole === 'organizer' || n.targetRole === 'club_admin') return false;
      if (n.category === 'modificacion_nomina') return false;
      if (n.isSystemGlobal && (!n.targetClubId || n.targetClubId === 'ALL')) return true;
      return false;
    });
  }

  const belongingTournamentIds = getUserBelongingTournamentIds(
    currentUser,
    tournaments,
    allClubs
  );

  // Super Admin sees notifications for the active tournament (or all if none active) + system notifications
  if (currentUser.role === 'super_admin') {
    return notifications.filter((n) => {
      if (!isCategoryEnabledByPreferences(n.category, preferences)) return false;
      if (n.targetUserId && n.targetUserId !== currentUser.id) return false;
      if (n.isSystemGlobal || n.category === 'sistema') {
        if (!n.tournamentId || !activeTournamentId || n.tournamentId === activeTournamentId) {
          return true;
        }
      }
      if (activeTournamentId && n.tournamentId) {
        return n.tournamentId === activeTournamentId;
      }
      return true;
    });
  }

  // Organizer role: ONLY receives notifications from their own tournament(s) + system notifications for them
  if (currentUser.role === 'organizer') {
    // If the currently active tournament belongs to this organizer, scope to it;
    // otherwise scope to all tournaments owned by this organizer.
    const activeIsMine =
      !!activeTournamentId && belongingTournamentIds.includes(activeTournamentId);

    return notifications.filter((n) => {
      if (!isCategoryEnabledByPreferences(n.category, preferences)) return false;

      // Personal user targeting check
      if (n.targetUserId && n.targetUserId !== currentUser.id) return false;

      // Direct system notification for this organizer or global system alert
      if (
        (n.isSystemGlobal && !n.tournamentId) ||
        (n.category === 'sistema' && n.targetUserId === currentUser.id)
      ) {
        return true;
      }

      // Must belong to one of the organizer's tournaments
      if (!n.tournamentId || !belongingTournamentIds.includes(n.tournamentId)) {
        return false;
      }

      // If viewing a specific tournament they own, filter to that tournament
      if (activeIsMine && n.tournamentId !== activeTournamentId) {
        return false;
      }

      // Verify match belongs to organizer's tournament if matchId is present
      if (n.matchId && allMatches.length > 0) {
        const match = allMatches.find((m) => m.id === n.matchId);
        if (match && match.tournamentId && !belongingTournamentIds.includes(match.tournamentId)) {
          return false;
        }
      }

      return true;
    });
  }

  // Club Delegate ('club_admin'): ONLY receives notifications from their club's tournament & relevant to their club
  if (currentUser.role === 'club_admin') {
    const myClubId = currentUser.clubId;
    if (!myClubId) return [];

    return notifications.filter((n) => {
      if (!isCategoryEnabledByPreferences(n.category, preferences)) return false;

      // Personal user targeting check
      if (n.targetUserId && n.targetUserId !== currentUser.id) return false;

      // Organizer-only notifications (such as roster audits from other clubs) are hidden from delegates
      if (n.targetRole === 'organizer') {
        return false;
      }

      // Global system notification addressed to all or this user
      if (n.isSystemGlobal && !n.tournamentId) {
        return !n.targetClubId || n.targetClubId === 'ALL' || n.targetClubId === myClubId;
      }

      // Must strictly belong to the tournament where the delegate's club participates
      if (!n.tournamentId || !belongingTournamentIds.includes(n.tournamentId)) {
        return false;
      }

      // If associated with a specific match, verify the match belongs to this tournament
      // and either involves this club or is a general tournament broadcast
      if (n.matchId && allMatches.length > 0) {
        const match = allMatches.find((m) => m.id === n.matchId);
        if (match) {
          if (match.tournamentId && !belongingTournamentIds.includes(match.tournamentId)) {
            return false;
          }
          const involvesMyClub =
            match.homeTeamId === myClubId || match.awayTeamId === myClubId;
          if (!involvesMyClub && n.targetClubId !== 'ALL' && n.targetClubId !== myClubId) {
            return false;
          }
        }
      }

      // Target club check: must be 'ALL' (within their tournament) or specifically their clubId
      if (n.targetClubId && n.targetClubId !== 'ALL' && n.targetClubId !== myClubId) {
        return false;
      }

      return true;
    });
  }

  return [];
}

/**
 * Helper to create a Roster or Coaching Staff modification notification for the Tournament Organizer.
 */
export function buildRosterModificationNotification(params: {
  tournamentId: string;
  club: Pick<Club, 'id' | 'name' | 'category'>;
  actionTitle: string;
  detailMessage: string;
  actorName: string;
}): LeagueNotification {
  return {
    id: `notif-roster-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    tournamentId: params.tournamentId,
    title: `${params.actionTitle} • ${params.club.name}`,
    message: `El club "${params.club.name}" (${params.club.category}) realizó cambios en su nómina: ${params.detailMessage}`,
    category: 'modificacion_nomina',
    targetRole: 'organizer',
    targetClubId: params.club.id,
    clubId: params.club.id,
    clubName: params.club.name,
    priority: 'alta',
    sender: params.actorName || `Delegación ${params.club.name}`,
    timestamp: 'Ahora mismo',
    readBy: [],
  };
}

/**
 * Helper to create a Match Result / Live Score notification for the Tournament Organizer and participating clubs.
 */
export function buildMatchResultNotification(params: {
  tournamentId: string;
  match: Match;
  homeClubName: string;
  awayClubName: string;
  actorName: string;
  sport?: SportType;
}): LeagueNotification {
  const { match, homeClubName, awayClubName } = params;
  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';

  const statusLabel = isFinished
    ? 'Resultado Final Oficial'
    : isLive
    ? 'Marcador En Juego'
    : 'Actualización de Partido';

  const scoreText = `${homeClubName} ${match.homeSetsWon} - ${match.awaySetsWon} ${awayClubName}`;

  return {
    id: `notif-match-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    tournamentId: params.tournamentId,
    title: `${statusLabel}: ${scoreText}`,
    message: `${match.round} (${match.category}) • Cancha: ${match.court || 'Principal'}. ${
      isFinished
        ? `Partido finalizado con marcador oficial ${scoreText}. Tabla de posiciones actualizada.`
        : `Marcador actualizado en tiempo real (${scoreText}).`
    }`,
    category: 'marcador',
    targetRole: 'all',
    targetClubId: 'ALL',
    matchId: match.id,
    priority: isFinished ? 'alta' : 'normal',
    sender: params.actorName || 'Mesa de Control TORNOW',
    timestamp: 'Ahora mismo',
    readBy: [],
  };
}

/**
 * Helper to create a System Notification scoped to a tournament or user.
 */
export function buildSystemNotification(params: {
  tournamentId?: string;
  title: string;
  message: string;
  targetRole?: 'organizer' | 'club_admin' | 'all';
  targetClubId?: string | 'ALL';
  targetUserId?: string;
  clubId?: string;
  clubName?: string;
  isSystemGlobal?: boolean;
  priority?: 'normal' | 'alta' | 'urgente';
}): LeagueNotification {
  return {
    id: `notif-sys-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    tournamentId: params.tournamentId,
    title: params.title,
    message: params.message,
    category: 'sistema',
    targetRole: params.targetRole || 'all',
    targetClubId: params.targetClubId || 'ALL',
    targetUserId: params.targetUserId,
    clubId: params.clubId,
    clubName: params.clubName,
    isSystemGlobal: params.isSystemGlobal ?? !params.tournamentId,
    priority: params.priority || 'normal',
    sender: 'Sistema Oficial TORNOW',
    timestamp: 'Ahora mismo',
    readBy: [],
  };
}
