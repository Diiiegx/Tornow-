import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Club,
  Match,
  UserAccount,
  LeagueNotification,
  Player,
  CoachStaff,
  StandingRow,
  TournamentCategory,
  MatchStatus,
  ClubInvite,
  Tournament,
  SportType,
  TournamentFormat,
  OrganizerType,
  TournamentRules,
  OrganizerKey,
  TournamentRegulations,
  TournamentPlayoffConfig,
  UserRole,
  LoginSessionRecord,
  NotificationPreferences,
  PlayerSanction,
  DelegateMessage,
  KeyDurationUnit,
  ClubSocialLinks,
  TournamentSponsor,
  UserFeedbackItem,
  FeedbackCategory,
} from '../types';
import {
  VenueTemplate,
  MatchVenueRoster,
  autoFillClubVenueRoster,
  calculateDurationDays,
  formatKeyDurationLabel,
  calculateKeyTrialCountdown,
} from '../logic/venueEntranceEngine';
import {
  detectMaliciousPayload,
  sanitizeSafeInput,
  registerLoginAttempt,
  type RateLimitEntry,
} from '../utils/securityShield';
import {
  validateFeedbackSubmission,
  syncHourlyFeedbackCookieAndCache,
} from '../utils/feedbackCookieCache';
import {
  INITIAL_TOURNAMENTS,
  INITIAL_CLUBS,
  INITIAL_MATCHES,
  INITIAL_USERS,
  INITIAL_NOTIFICATIONS,
  INITIAL_INVITES,
  INITIAL_ORGANIZER_KEYS,
} from '../data/initialData';
import { calculateStandings } from '../logic/volleyball';
import { SPORT_CONFIGS } from '../constants/tournamentPresets';
import { playNotificationChime } from '../utils/audio';
import { generateRoundRobinFixtures } from '../logic/tournamentScheduler';
import { cleanTournamentString, MAX_TOURNAMENT_NAME_LENGTH } from '../utils/textValidation';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  filterNotificationsForUser,
  buildRosterModificationNotification,
  buildMatchResultNotification,
  buildSystemNotification,
} from '../logic/notificationFilter';
import {
  validateSanctionInput,
  buildPlayerSanction,
  createSanctionAppeal,
  resolveOrganizerInboxMessage,
} from '../logic/sanctionsEngine';
import {
  auth,
  googleAuthProvider,
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface ToastAlert {
  id: string;
  title: string;
  message: string;
  category: string;
}

export interface CreateTournamentInput {
  name: string;
  organizerName: string;
  organizerType: OrganizerType;
  organizerContact?: {
    email?: string;
    phone?: string;
    rut?: string;
    website?: string;
    commune?: string;
    address?: string;
    addressConfirmedWithMaps?: boolean;
    isLocked?: boolean;
  };
  sport: SportType;
  format: TournamentFormat;
  categories: string[];
  groups?: string[];
  startDate: string;
  endDate: string;
  venue: string;
  description?: string;
  bannerColor?: string;
  themeGradient?: string;
  rules?: Partial<TournamentRules>;
  allowRosterEditing?: boolean;
  regulations?: TournamentRegulations;
  playoffs?: TournamentPlayoffConfig;
  requiresVenueSheet?: boolean;
  venueSheetTemplatePending?: boolean;
  venueSheetTemplateFileName?: string;
  isDemo?: boolean;
  visibility?: 'public' | 'hidden';
  isValidatedByOrganizer?: boolean;
}

interface AddClubInput {
  name: string;
  shortName: string;
  category: TournamentCategory;
  group?: string;
  color?: string;
  secondaryColor?: string;
  homeCourt?: string;
  managerName: string;
  managerEmail: string;
  managerPhone?: string;
  headCoach?: string;
  assistantCoach?: string;
}

interface TournamentContextType {
  // Tournaments
  tournaments: Tournament[];
  activeTournamentId: string;
  activeTournament: Tournament;
  setActiveTournamentId: (id: string) => void;
  createTournament: (data: CreateTournamentInput) => Tournament;
  updateTournament: (id: string, data: Partial<Tournament>) => void;
  toggleTournamentVisibility: (id: string, nextVisibility?: 'public' | 'hidden') => void;
  deleteTournament: (id: string) => void;

  // Active Tournament Data
  clubs: Club[];
  allClubs: Club[];
  matches: Match[];
  allMatches: Match[];
  users: UserAccount[];
  invites: ClubInvite[];
  organizerKeys: OrganizerKey[];
  currentUser: UserAccount | null;
  notifications: LeagueNotification[];
  standings: StandingRow[];
  activeLiveMatchId: string;
  setActiveLiveMatchId: (id: string) => void;
  selectedCategory: TournamentCategory;
  setSelectedCategory: (cat: TournamentCategory) => void;
  selectedGroup: string;
  setSelectedGroup: (grp: string) => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  browserNotificationsEnabled: boolean;
  requestBrowserNotifications: () => Promise<boolean>;
  activeToasts: ToastAlert[];
  dismissToast: (id: string) => void;
  unreadCount: number;

  // Auth & Access
  login: (username: string, password: string) => { success: boolean; message: string };
  loginWithGoogle: () => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => { success: boolean; message: string };
  updateUserProfile: (data: { fullName?: string; email?: string; phone?: string }) => { success: boolean; message: string };
  sessionHistory: LoginSessionRecord[];
  closeOtherSessions: () => void;
  deleteUser: (userId: string) => { success: boolean; message: string };
  updateUserRole: (userId: string, newRole: UserRole) => { success: boolean; message: string };

  // Organizer Keys (Acceso comercial para organizadores - Keys Temporales y Renovación)
  createOrganizerKey: (data: {
    tournamentName?: string;
    organizerName?: string;
    organizerEmail?: string;
    organizerPhone?: string;
    notes?: string;
    durationUnit?: KeyDurationUnit;
    durationValue?: number;
  }) => OrganizerKey;
  renewOrganizerKey: (keyId: string, durationUnit: KeyDurationUnit, durationValue: number) => void;
  submitKeyRenewalAppeal: (keyId: string, message?: string) => { success: boolean; message: string };
  deleteOrganizerKey: (keyId: string) => void;
  toggleBlockOrganizerKey: (keyId: string) => void;
  validateOrganizerKey: (key: string) => { valid: boolean; keyObj?: OrganizerKey; message: string };
  redeemOrganizerKey: (
    key: string,
    userData: { username: string; password: string; fullName: string; email: string; phone?: string }
  ) => { success: boolean; user?: UserAccount; message: string };
  redeemAdditionalOrganizerKey: (key: string) => { success: boolean; message: string };

  // Invites & Registration (Clubes / Delegados)
  validateInviteKey: (key: string) => { valid: boolean; invite?: ClubInvite; club?: Club; message: string };
  redeemInviteKey: (
    key: string,
    userData: { username: string; password: string; fullName: string; email: string; phone?: string }
  ) => { success: boolean; user?: UserAccount; message: string };
  generateNewInviteForClub: (clubId: string, email: string, name: string, phone?: string) => ClubInvite;

  // Permissions
  canCurrentUserEditRoster: (clubId: string) => boolean;

  // Club Management
  addClub: (data: AddClubInput) => { club: Club; invite: ClubInvite };
  deleteClub: (clubId: string) => void;
  updateFullRoster: (clubId: string, roster: Player[], staff?: CoachStaff) => void;
  addPlayerToClub: (clubId: string, player: Omit<Player, 'id' | 'clubId'>) => void;
  updatePlayerInClub: (clubId: string, player: Player) => void;
  removePlayerFromClub: (clubId: string, playerId: string) => void;
  assignSpecialRole: (clubId: string, playerId: string, role: 'capitan' | 'libero_1' | 'libero_2' | 'regular') => void;
  updateClubStaff: (clubId: string, staff: CoachStaff) => void;
  updateClubSocialLinks: (clubId: string, socialLinks: ClubSocialLinks) => void;

  // Match Management
  updateMatchSets: (matchId: string, homeSetsWon: number, awaySetsWon: number, status?: MatchStatus) => void;
  updateMatchDetails: (matchId: string, data: Partial<Match>) => void;
  createMatch: (match: Omit<Match, 'id'>) => void;
  generateOfficialFixtures: (
    tournamentId?: string,
    category?: string,
    force?: boolean
  ) => { success: boolean; started?: boolean; message: string; matchesCount?: number };

  // Notifications
  visibleNotifications: LeagueNotification[];
  notificationPreferences: NotificationPreferences;
  updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) => void;
  sendLeagueNotification: (data: {
    title: string;
    message: string;
    category: LeagueNotification['category'];
    targetClubId: string;
    priority: LeagueNotification['priority'];
    targetRole?: LeagueNotification['targetRole'];
  }) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearReadNotifications: () => void;

  // Sanctions & Organizer Inbox (Tribunal de Disciplina)
  issuePlayerSanction: (input: {
    clubId: string;
    playerId: string;
    reason: string;
    matchesSuspended: number;
    issuedBy?: string;
  }) => { success: boolean; message: string; sanction?: PlayerSanction };
  revokeOrUpdateSanction: (sanctionId: string, status: 'resolved' | 'revoked', resolutionNote?: string) => void;
  toggleAllowAppeals: (tournamentId: string, allow: boolean) => void;
  submitSanctionAppeal: (sanctionId: string, appealText: string, senderName?: string) => { success: boolean; message: string };
  sendDelegateMessageToOrganizer: (input: {
    clubId: string;
    senderName: string;
    subject: string;
    content: string;
    type?: 'mensaje_delegado' | 'consulta';
  }) => { success: boolean; message: string };
  replyToInboxMessage: (
    messageId: string,
    decision: 'approved' | 'rejected' | 'replied',
    replyText: string
  ) => void;

  // Venue Entrance Sheets (Recintos & Control 12h/24h)
  venueTemplates: VenueTemplate[];
  matchVenueRosters: Record<string, MatchVenueRoster>;
  saveVenueTemplate: (template: VenueTemplate) => void;
  submitClubVenueRoster: (roster: MatchVenueRoster) => { success: boolean; message: string };
  getVenueRosterForMatch: (matchId: string, clubId: string) => MatchVenueRoster | undefined;
  autoFillRosterForMatch: (matchId: string, clubId: string) => MatchVenueRoster;

  // User Feedback & Admin Inbox (Bandeja de Entrada de Administradores)
  userFeedbacks: UserFeedbackItem[];
  submitUserFeedback: (input: {
    rating: number;
    category?: FeedbackCategory;
    comment: string;
    authorName?: string;
  }) => { success: boolean; message: string };
  updateUserFeedbackStatus: (
    feedbackId: string,
    status: UserFeedbackItem['status'],
    adminNote?: string
  ) => void;
  deleteUserFeedback: (feedbackId: string) => void;
}

const TournamentContext = createContext<TournamentContextType | null>(null);

export const EMPTY_TOURNAMENT_FALLBACK: Tournament = {
  id: '',
  name: 'Sin Torneo Activo',
  organizerName: 'TORNOW',
  organizerType: 'empresa',
  sport: 'volleyball',
  format: 'round_robin',
  categories: ['GENERAL'],
  startDate: '',
  endDate: '',
  venue: 'Por definir',
  description: 'No hay torneos activos en este momento.',
  status: 'borrador',
  bannerColor: '#0052fe',
  themeGradient: 'from-[#081223] via-[#0b1b3a] to-[#0052fe]',
  rules: {
    pointsWin: 3,
    pointsLoss: 0,
    pointsTie: 0,
  },
  allowRosterEditing: true,
  createdAt: '',
};

const STORAGE_KEYS = {
  TOURNAMENTS: 'tornow_tournaments_v6',
  ACTIVE_TOURNAMENT_ID: 'tornow_active_tour_v6',
  CLUBS: 'tornow_clubs_v6',
  MATCHES: 'tornow_matches_v6',
  USERS: 'tornow_users_v6',
  INVITES: 'tornow_invites_v6',
  ORGANIZER_KEYS: 'tornow_org_keys_v6',
  NOTIFS: 'tornow_notifs_v6',
  CURRENT_USER: 'tornow_curr_user_v6',
  SOUND: 'tornow_sound_v6',
  SESSION_HISTORY: 'tornow_session_history_v6',
  AUTH_SESSION: 'tornow_auth_cache_v6',
  NOTIF_PREFS: 'tornow_notif_prefs_v6',
  VENUE_TEMPLATES: 'tornow_venue_templates_v6',
  VENUE_ROSTERS: 'tornow_venue_rosters_v6',
  USER_FEEDBACKS: 'tornow_user_feedbacks_v6',
};

const INITIAL_USER_FEEDBACKS: UserFeedbackItem[] = [
  {
    id: 'fb-seed-1',
    rating: 5,
    category: 'elogio',
    comment:
      'El generador automático de planillas de ingreso en Excel y PDF nos ahorró horas antes de la jornada en el CEO.',
    authorName: 'Rodrigo Valdés (Organizador)',
    authorRole: 'organizer',
    authorEmail: 'rodrigo@ligavoley.cl',
    tournamentName: 'Liga Metropolitana Voleibol 2026',
    createdAt: '2026-10-27 18:30',
    status: 'nuevo',
  },
  {
    id: 'fb-seed-2',
    rating: 5,
    category: 'sugerencia',
    comment:
      'Muy buena la opción de poner el link de YouTube en el marcador en vivo. Sería genial poder fijar también el canal oficial del club.',
    authorName: 'Camila Soto (Delegada Club Murano)',
    authorRole: 'club_admin',
    tournamentName: 'Liga Metropolitana Voleibol 2026',
    createdAt: '2026-10-27 16:15',
    status: 'nuevo',
  },
];

const getDeviceInfo = (): string => {
  if (typeof navigator === 'undefined') return 'Dispositivo Web';
  const ua = navigator.userAgent;
  let browser = 'Navegador Web';
  if (ua.includes('Chrome')) browser = 'Google Chrome';
  else if (ua.includes('Safari')) browser = 'Apple Safari';
  else if (ua.includes('Firefox')) browser = 'Mozilla Firefox';
  else if (ua.includes('Edge')) browser = 'Microsoft Edge';

  let os = 'Escritorio';
  if (/Android/i.test(ua)) os = 'Android (Móvil)';
  else if (/iPhone|iPad/i.test(ua)) os = 'iOS (Móvil)';
  else if (/Windows/i.test(ua)) os = 'Windows (Escritorio)';
  else if (/Mac/i.test(ua)) os = 'macOS (Escritorio)';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return `${browser} en ${os}`;
};

const generateInviteToken = (clubPrefix: string) => {
  const cleanPrefix = clubPrefix.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'TOR';
  const randPart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const randPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `KEY-${cleanPrefix}-${randPart1}-${randPart2}`;
};

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Tournaments State
  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TOURNAMENTS);
      if (saved) {
        const parsed: Tournament[] = JSON.parse(saved);
        // Exclude any legacy demo tournaments
        return parsed.filter((t) => t.id !== 'tour-mikasa-2026' && t.id !== 'tour-copa-tornow-futbol');
      }
      return INITIAL_TOURNAMENTS;
    } catch {
      return INITIAL_TOURNAMENTS;
    }
  });

  const [activeTournamentId, setActiveTournamentIdState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_TOURNAMENT_ID);
      if (saved && tournaments.some((t) => t.id === saved)) return saved;
      return tournaments[0]?.id || '';
    } catch {
      return tournaments[0]?.id || '';
    }
  });

  const activeTournament = useMemo(() => {
    const found = tournaments.find((t) => t.id === activeTournamentId);
    return found || tournaments[0] || EMPTY_TOURNAMENT_FALLBACK;
  }, [tournaments, activeTournamentId]);

  const [allClubs, setAllClubs] = useState<Club[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLUBS);
      if (saved) {
        const parsed: Club[] = JSON.parse(saved);
        return parsed.filter((c) => c.tournamentId !== 'tour-mikasa-2026' && c.tournamentId !== 'tour-copa-tornow-futbol');
      }
      return INITIAL_CLUBS;
    } catch {
      return INITIAL_CLUBS;
    }
  });

  const [allMatches, setAllMatches] = useState<Match[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MATCHES);
      if (saved) {
        const parsed: Match[] = JSON.parse(saved);
        return parsed.filter((m) => m.tournamentId !== 'tour-mikasa-2026' && m.tournamentId !== 'tour-copa-tornow-futbol');
      }
      return INITIAL_MATCHES;
    } catch {
      return INITIAL_MATCHES;
    }
  });

  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS);
      if (saved) {
        const parsed: UserAccount[] = JSON.parse(saved);
        // Ensure admin user password is consistently updated to Admin1234@
        return parsed.map((u) => {
          if (u.username.toLowerCase() === 'admin' || u.role === 'super_admin' || u.id === 'usr-admin') {
            return { ...u, passwordHash: 'Admin1234@' };
          }
          return u;
        });
      }
      return INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [invites, setInvites] = useState<ClubInvite[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INVITES);
      return saved ? JSON.parse(saved) : INITIAL_INVITES;
    } catch {
      return INITIAL_INVITES;
    }
  });

  const [organizerKeys, setOrganizerKeys] = useState<OrganizerKey[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ORGANIZER_KEYS);
      return saved ? JSON.parse(saved) : INITIAL_ORGANIZER_KEYS;
    } catch {
      return INITIAL_ORGANIZER_KEYS;
    }
  });

  const [notifications, setNotifications] = useState<LeagueNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTIFS);
      return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTIF_PREFS);
      if (saved) {
        return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(saved) };
      }
      return DEFAULT_NOTIFICATION_PREFERENCES;
    } catch {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
  });

  const [venueTemplates, setVenueTemplates] = useState<VenueTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VENUE_TEMPLATES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [matchVenueRosters, setMatchVenueRosters] = useState<Record<string, MatchVenueRoster>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VENUE_ROSTERS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [userFeedbacks, setUserFeedbacks] = useState<UserFeedbackItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER_FEEDBACKS);
      return saved ? JSON.parse(saved) : INITIAL_USER_FEEDBACKS;
    } catch {
      return INITIAL_USER_FEEDBACKS;
    }
  });

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      // 1. Direct saved user object
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (saved && saved !== 'null' && saved !== 'undefined') {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) return parsed;
      }
      // 2. Token / Session cache fallback
      const authSession = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
      if (authSession && authSession !== 'null' && authSession !== 'undefined') {
        const sess = JSON.parse(authSession);
        if (sess && (sess.userId || sess.username)) {
          const savedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
          const userList: UserAccount[] = savedUsers ? JSON.parse(savedUsers) : INITIAL_USERS;
          const matched = userList.find(
            (u) =>
              (sess.userId && u.id === sess.userId) ||
              (sess.username && u.username.toLowerCase() === sess.username.toLowerCase())
          );
          if (matched) return matched;
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SOUND);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [sessionHistory, setSessionHistory] = useState<LoginSessionRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SESSION_HISTORY);
      if (saved) return JSON.parse(saved);
      const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (savedUser) {
        const u: UserAccount = JSON.parse(savedUser);
        if (u && u.id) {
          return [
            {
              id: 'sess-init-' + u.id,
              userId: u.id,
              username: u.username,
              fullName: u.fullName,
              role: u.role,
              device: getDeviceInfo(),
              ipLocation: 'Santiago, Región Metropolitana (Chile)',
              loginAt: new Date().toLocaleDateString('es-CL', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }),
              lastActiveAt: 'Ahora mismo',
              isCurrentSession: true,
              status: 'active',
            },
          ];
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const [activeLiveMatchId, setActiveLiveMatchId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<TournamentCategory>(() => {
    return activeTournament?.categories?.[0] || 'MASTER VARONES';
  });
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [activeToasts, setActiveToasts] = useState<ToastAlert[]>([]);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState<boolean>(false);

  // Sync category when active tournament changes
  const setActiveTournamentId = useCallback((newId: string) => {
    setActiveTournamentIdState(newId);
    const target = tournaments.find((t) => t.id === newId);
    if (target && target.categories && target.categories.length > 0) {
      setSelectedCategory(target.categories[0]);
      setSelectedGroup('ALL');
    }
  }, [tournaments]);

  // Non-blocking localStorage helper for large collections to keep navigation snappy
  const scheduleStorageWrite = useCallback((key: string, data: unknown) => {
    const write = () => {
      try {
        localStorage.setItem(key, typeof data === 'string' ? data : JSON.stringify(data));
      } catch {
        // Ignore quota / storage errors
      }
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = (window as any).requestIdleCallback(write, { timeout: 600 });
      return () => (window as any).cancelIdleCallback(id);
    } else {
      const timer = setTimeout(write, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  // Save to localStorage without blocking UI thread
  useEffect(() => scheduleStorageWrite(STORAGE_KEYS.TOURNAMENTS, tournaments), [tournaments, scheduleStorageWrite]);
  useEffect(() => scheduleStorageWrite(STORAGE_KEYS.ACTIVE_TOURNAMENT_ID, activeTournamentId), [activeTournamentId, scheduleStorageWrite]);
  useEffect(() => scheduleStorageWrite(STORAGE_KEYS.CLUBS, allClubs), [allClubs, scheduleStorageWrite]);
  useEffect(() => scheduleStorageWrite(STORAGE_KEYS.MATCHES, allMatches), [allMatches, scheduleStorageWrite]);
  useEffect(() => scheduleStorageWrite(STORAGE_KEYS.USERS, users), [users, scheduleStorageWrite]);
  useEffect(() => scheduleStorageWrite(STORAGE_KEYS.INVITES, invites), [invites, scheduleStorageWrite]);
  useEffect(() => scheduleStorageWrite(STORAGE_KEYS.ORGANIZER_KEYS, organizerKeys), [organizerKeys, scheduleStorageWrite]);
  useEffect(() => scheduleStorageWrite(STORAGE_KEYS.NOTIFS, notifications), [notifications, scheduleStorageWrite]);
  useEffect(() => scheduleStorageWrite(STORAGE_KEYS.NOTIF_PREFS, notificationPreferences), [notificationPreferences, scheduleStorageWrite]);
  useEffect(() => scheduleStorageWrite(STORAGE_KEYS.VENUE_TEMPLATES, venueTemplates), [venueTemplates, scheduleStorageWrite]);
  useEffect(() => scheduleStorageWrite(STORAGE_KEYS.VENUE_ROSTERS, matchVenueRosters), [matchVenueRosters, scheduleStorageWrite]);
  useEffect(() => scheduleStorageWrite(STORAGE_KEYS.USER_FEEDBACKS, userFeedbacks), [userFeedbacks, scheduleStorageWrite]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
        localStorage.setItem(
          STORAGE_KEYS.AUTH_SESSION,
          JSON.stringify({
            userId: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
            token: `TOKEN-${currentUser.id}-${currentUser.role}`,
            cachedAt: Date.now(),
          })
        );
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
      }
    } catch {
      // Ignore storage errors
    }
  }, [currentUser]);

  useEffect(() => scheduleStorageWrite(STORAGE_KEYS.SOUND, soundEnabled), [soundEnabled, scheduleStorageWrite]);
  useEffect(() => scheduleStorageWrite(STORAGE_KEYS.SESSION_HISTORY, sessionHistory), [sessionHistory, scheduleStorageWrite]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  // Listen to Firebase Auth state & sync with Cloud SQL
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) return;
      try {
        const token = await fbUser.getIdToken();
        await fetch('/api/me', {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);
      } catch {
        // Ignore silent token errors
      }
    });
    return () => unsubscribe();
  }, []);

  // Filter clubs and matches for the active tournament
  const clubs = useMemo(() => {
    return allClubs.filter((c) => !c.tournamentId || c.tournamentId === activeTournament.id);
  }, [allClubs, activeTournament.id]);

  const matches = useMemo(() => {
    return allMatches.filter((m) => !m.tournamentId || m.tournamentId === activeTournament.id);
  }, [allMatches, activeTournament.id]);

  // Request browser notifications
  const requestBrowserNotifications = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      const perm = await Notification.requestPermission();
      const granted = perm === 'granted';
      setBrowserNotificationsEnabled(granted);
      return granted;
    } catch {
      return false;
    }
  }, []);

  const showToast = useCallback((title: string, message: string, category: string) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    setActiveToasts((prev) => [...prev.slice(-3), { id, title, message, category }]);

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
        });
      } catch {
        // Notification permission silent fallback
      }
    }

    setTimeout(() => {
      setActiveToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Standings calculation for active tournament
  const standings = useMemo(() => {
    return calculateStandings(
      clubs,
      matches,
      selectedCategory,
      selectedGroup,
      activeTournament.sport,
      activeTournament.rules
    );
  }, [clubs, matches, selectedCategory, selectedGroup, activeTournament]);

  // Filtered notifications strictly scoped to the tournament & role of the current user
  const visibleNotifications = useMemo(() => {
    return filterNotificationsForUser({
      notifications,
      currentUser,
      activeTournamentId: activeTournament.id,
      tournaments,
      allClubs,
      allMatches,
      preferences: notificationPreferences,
    });
  }, [
    notifications,
    currentUser,
    activeTournament.id,
    tournaments,
    allClubs,
    allMatches,
    notificationPreferences,
  ]);

  // Unread notifications for current user based on strictly scoped visibleNotifications
  const unreadCount = useMemo(() => {
    const userId = currentUser?.id || 'guest';
    return visibleNotifications.filter((n) => !n.readBy.includes(userId)).length;
  }, [visibleNotifications, currentUser]);

  const updateNotificationPreferences = useCallback((prefs: Partial<NotificationPreferences>) => {
    setNotificationPreferences((prev) => ({ ...prev, ...prefs }));
  }, []);

  // 1. Create Tournament
  const createTournament = useCallback(
    (input: CreateTournamentInput): Tournament => {
      // Organizers can only create 1 tournament per key.
      // Super admins can create unlimited tournaments without a key.
      if (currentUser?.role === 'organizer') {
        const myTournaments = tournaments.filter((t) => t.organizerUserId === currentUser.id);
        const quota = currentUser.tournamentQuota || 1;
        if (myTournaments.length >= quota) {
          showToast(
            'Límite de Torneo Alcanzado',
            'Cada clave de organizador autoriza la creación de 1 torneo. Ingresa una nueva clave comercial para crear otro torneo.',
            'alerta'
          );
          throw new Error('QUOTA_REACHED: Cada clave de organizador permite crear 1 torneo.');
        }
      }

      const sportPreset = SPORT_CONFIGS[input.sport] || SPORT_CONFIGS.volleyball;
      const id = 'tour-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);

      const cleanedName = cleanTournamentString(input.name, true).slice(0, MAX_TOURNAMENT_NAME_LENGTH);
      const visibility = input.visibility || 'public';
      const isValidatedByOrganizer = input.isValidatedByOrganizer ?? true;

      const newTour: Tournament = {
        id,
        organizerUserId: currentUser?.id,
        name: cleanedName,
        organizerName: cleanTournamentString(input.organizerName, true),
        organizerType: input.organizerType,
        organizerContact: input.organizerContact,
        sport: input.sport,
        format: input.format,
        categories: input.categories.length > 0 ? input.categories : sportPreset.defaultCategories.slice(0, 2),
        groups: input.groups || (input.format === 'short_league_groups' ? ['Grupo A', 'Grupo B'] : undefined),
        startDate: input.startDate || new Date().toISOString().split('T')[0],
        endDate: input.endDate || new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
        venue: input.venue.trim() || 'Sede Principal',
        description: input.description,
        bannerColor: input.bannerColor || '#0052fe',
        themeGradient: input.themeGradient || 'from-[#081223] via-[#0b1b3a] to-[#0052fe]',
        status: visibility === 'public' ? 'activo' : 'borrador',
        visibility,
        isValidatedByOrganizer,
        validatedAt: isValidatedByOrganizer ? new Date().toISOString() : undefined,
        rules: {
          ...sportPreset.rules,
          ...input.rules,
        },
        allowRosterEditing: input.allowRosterEditing ?? true,
        regulations: input.regulations,
        playoffs: input.playoffs,
        requiresVenueSheet: input.requiresVenueSheet ?? false,
        venueSheetTemplatePending: input.venueSheetTemplatePending ?? false,
        venueSheetTemplateFileName: input.venueSheetTemplateFileName,
        isDemo: false,
        createdAt: new Date().toISOString().split('T')[0],
      };

      setTournaments((prev) => [newTour, ...prev]);
      setActiveTournamentIdState(newTour.id);
      setSelectedCategory(newTour.categories[0] || 'GENERAL');
      setSelectedGroup('ALL');

      // If organizer uploaded a venue sheet template during tournament creation, register it immediately
      if (input.requiresVenueSheet && input.venueSheetTemplateFileName && !input.venueSheetTemplatePending) {
        const autoTemplate: VenueTemplate = {
          id: 'vtpl-' + Date.now(),
          tournamentId: newTour.id,
          venueName: newTour.venue || 'Recinto Principal',
          entranceGate: 'Portería Principal / Control de Acceso',
          maxAttendeesPerClub: 20,
          requiredFields: ['name', 'rut', 'role', 'dorsal'],
          securityRequirements: 'Presentar Cédula de Identidad física vigente en portería.',
          idCheckRequired: true,
          notes: `Plantilla oficial cargada al crear el torneo: ${input.venueSheetTemplateFileName}`,
          createdAt: new Date().toISOString(),
          sourceType: 'ai_extracted',
        };
        setVenueTemplates((prev) => [autoTemplate, ...prev]);
      }

      if (currentUser?.id) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === currentUser.id
              ? {
                  ...u,
                  organizerTournamentIds: [...(u.organizerTournamentIds || []), id],
                }
              : u
          )
        );
        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                organizerTournamentIds: [...(prev.organizerTournamentIds || []), id],
              }
            : null
        );
      }

      // Sync to Firestore & Cloud SQL if authenticated with Firebase
      if (auth.currentUser) {
        const uid = auth.currentUser.uid;
        const safeName = newTour.name.slice(0, 120);
        const safeVenue = newTour.venue.slice(0, 200);
        const tourPath = `tournaments/${newTour.id}`;
        setDoc(doc(db, 'tournaments', newTour.id), {
          ownerId: uid,
          name: safeName.length >= 3 ? safeName : 'Torneo Oficial',
          sport: String(newTour.sport).slice(0, 40),
          format: String(newTour.format).slice(0, 40),
          venue: safeVenue.length >= 3 ? safeVenue : 'Sede Oficial',
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }).catch((err) => {
          try {
            handleFirestoreError(err, OperationType.CREATE, tourPath);
          } catch {
            // Logged via handleFirestoreError
          }
        });

        auth.currentUser.getIdToken().then((token) => {
          fetch('/api/tournaments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(newTour),
          }).catch(() => null);
        });
      }

      const sysNotif = buildSystemNotification({
        tournamentId: newTour.id,
        title: `Sistema TORNOW • Torneo "${newTour.name}" Creado`,
        message: `El campeonato oficial "${newTour.name}" (${newTour.venue}) ha sido inicializado en estado ${
          newTour.visibility === 'public' ? 'PÚBLICO' : 'OCULTO'
        }. Ya puedes inscribir clubes y generar llaves.`,
        targetRole: 'organizer',
        priority: 'normal',
      });
      setNotifications((prev) => [sysNotif, ...prev]);

      if (soundEnabled) playNotificationChime('announcement');
      showToast(
        '🏆 ¡Torneo Creado Exitosamente!',
        `Se ha generado el torneo "${newTour.name}" organizado por ${newTour.organizerName}.`,
        'torneo_creado'
      );

      return newTour;
    },
    [currentUser, tournaments, soundEnabled, showToast]
  );

  // 2. Update Tournament
  const updateTournament = useCallback((id: string, data: Partial<Tournament>) => {
    const existing = tournaments.find((t) => t.id === id);
    setTournaments((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...data } : t))
    );

    if (
      existing &&
      typeof data.allowRosterEditing === 'boolean' &&
      data.allowRosterEditing !== existing.allowRosterEditing
    ) {
      const rosterStateNotif = buildSystemNotification({
        tournamentId: id,
        title: data.allowRosterEditing
          ? 'Sistema • Inscripción de Nóminas Habilitada'
          : 'Sistema • Cierre Oficial de Nóminas',
        message: data.allowRosterEditing
          ? `El organizador del torneo "${existing.name}" ha habilitado la edición de jugadores y cuerpo técnico para los clubes.`
          : `El organizador del torneo "${existing.name}" ha bloqueado la edición de nóminas para los delegados de club.`,
        targetRole: 'all',
        targetClubId: 'ALL',
        priority: 'alta',
      });
      setNotifications((prev) => [rosterStateNotif, ...prev]);
    }
  }, [tournaments]);

  // 2b. Validate Tournament as Organizer & Toggle Public / Hidden
  const toggleTournamentVisibility = useCallback(
    (id: string, nextVisibility?: 'public' | 'hidden') => {
      const target = tournaments.find((t) => t.id === id);
      if (!target) return;

      const currentVis = target.visibility || 'public';
      const updatedVis: 'public' | 'hidden' =
        nextVisibility || (currentVis === 'public' ? 'hidden' : 'public');
      const nowIso = new Date().toISOString();

      setTournaments((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                visibility: updatedVis,
                status: updatedVis === 'public' ? 'activo' : 'borrador',
                isValidatedByOrganizer: true,
                validatedAt: nowIso,
              }
            : t
        )
      );

      const visNotif = buildSystemNotification({
        tournamentId: id,
        title:
          updatedVis === 'public'
            ? `Sistema • Torneo "${target.name}" Validado en Público`
            : `Sistema • Torneo "${target.name}" en Modo Oculto`,
        message:
          updatedVis === 'public'
            ? `El organizador validó oficialmente el torneo "${target.name}". Ya es visible para todos los clubes participantes.`
            : `El torneo "${target.name}" pasó a estado oculto (borrador privado para la organización).`,
        targetRole: 'all',
        targetClubId: 'ALL',
        priority: 'normal',
      });
      setNotifications((prev) => [visNotif, ...prev]);

      if (soundEnabled) playNotificationChime('announcement');
      if (updatedVis === 'public') {
        showToast(
          '🌐 Torneo Validado y Público',
          `El torneo "${target.name}" ha sido validado por el organizador y ahora está en modo PÚBLICO.`,
          'torneo_publico'
        );
      } else {
        showToast(
          '🔒 Torneo en Modo Oculto',
          `El torneo "${target.name}" ahora está OCULTO al público general (solo visible para el organizador).`,
          'torneo_oculto'
        );
      }
    },
    [tournaments, soundEnabled, showToast]
  );

  // 3. Delete Tournament
  const deleteTournament = useCallback(
    (id: string) => {
      const target = tournaments.find((t) => t.id === id);
      const targetName = target?.name || 'Torneo';

      setTournaments((prev) => prev.filter((t) => t.id !== id));
      setAllClubs((prev) => prev.filter((c) => c.tournamentId !== id));
      setAllMatches((prev) => prev.filter((m) => m.tournamentId !== id));
      setInvites((prev) => prev.filter((inv) => inv.tournamentId !== id));

      setUsers((prev) =>
        prev.map((u) => ({
          ...u,
          organizerTournamentIds: (u.organizerTournamentIds || []).filter((tId) => tId !== id),
        }))
      );

      if (activeTournamentId === id) {
        const remaining = tournaments.filter((t) => t.id !== id);
        const next = remaining[0];
        setActiveTournamentIdState(next ? next.id : '');
        setSelectedCategory(next?.categories?.[0] || 'GENERAL');
      }

      showToast(
        'Torneo Eliminado',
        `El torneo "${targetName}" ha sido eliminado definitivamente.`,
        'admin'
      );
    },
    [activeTournamentId, tournaments, showToast]
  );

  // Auth: Login with Anti-Hack WAF & Brute-Force Protection
  const login = useCallback((username: string, password: string) => {
    const userPayloadCheck = detectMaliciousPayload(username);
    const passPayloadCheck = detectMaliciousPayload(password);
    if (userPayloadCheck.isMalicious || passPayloadCheck.isMalicious) {
      return {
        success: false,
        message: `🛡️ Escudo Anti-Hackeo: Solicitud bloqueada (${userPayloadCheck.threatType || passPayloadCheck.threatType}).`,
      };
    }

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    // Seamless authentication for admin with new password
    if (cleanUser === 'admin' && cleanPass === 'Admin1234@') {
      registerLoginAttempt(cleanUser, true);
      const adminUser =
        users.find((u) => u.username.toLowerCase() === 'admin' || u.role === 'super_admin') ||
        INITIAL_USERS[0];

      const updatedAdmin: UserAccount = { ...adminUser, passwordHash: 'Admin1234@' };
      setUsers((prev) =>
        prev.map((u) =>
          u.username.toLowerCase() === 'admin' || u.role === 'super_admin' ? updatedAdmin : u
        )
      );
      setCurrentUser(updatedAdmin);

      const newSession: LoginSessionRecord = {
        id: 'sess-' + Date.now(),
        userId: updatedAdmin.id,
        username: updatedAdmin.username,
        fullName: updatedAdmin.fullName,
        role: updatedAdmin.role,
        device: getDeviceInfo(),
        ipLocation: 'Santiago, Región Metropolitana (Chile)',
        loginAt: new Date().toLocaleDateString('es-CL', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        lastActiveAt: 'Ahora mismo',
        isCurrentSession: true,
        status: 'active',
      };
      setSessionHistory((prev) => [
        newSession,
        ...prev.map((s) => ({ ...s, isCurrentSession: false })),
      ]);
      try {
        localStorage.setItem(
          STORAGE_KEYS.AUTH_SESSION,
          JSON.stringify({ userId: updatedAdmin.id, username: updatedAdmin.username, cachedAt: Date.now() })
        );
      } catch {
        // Ignore
      }

      if (soundEnabled) playNotificationChime('point');
      showToast('Sesión Iniciada', `Bienvenido de vuelta, ${updatedAdmin.fullName}`, 'auth');
      return { success: true, message: 'Sesión iniciada con éxito' };
    }

    const user = users.find(
      (u) =>
        u.username.toLowerCase() === cleanUser &&
        u.passwordHash === cleanPass
    );

    if (!user) {
      const attempt = registerLoginAttempt(cleanUser, false);
      if (attempt.isLocked) {
        return {
          success: false,
          message: `🔒 Protección Anti-Fuerza Bruta: Cuenta bloqueada temporalmente por ${attempt.remainingLockSeconds}s tras múltiples intentos fallidos.`,
        };
      }
      return {
        success: false,
        message: `Usuario o contraseña incorrectos. (${attempt.attemptsRemaining} intento(s) restante(s) antes de bloqueo de seguridad).`,
      };
    }

    const lockCheck = registerLoginAttempt(cleanUser, true);
    if (lockCheck.isLocked) {
      return {
        success: false,
        message: `🔒 Protección Anti-Fuerza Bruta: Espera ${lockCheck.remainingLockSeconds}s antes de volver a intentar.`,
      };
    }

    setCurrentUser(user);

    const newSession: LoginSessionRecord = {
      id: 'sess-' + Date.now(),
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      device: getDeviceInfo(),
      ipLocation: 'Santiago, Región Metropolitana (Chile)',
      loginAt: new Date().toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      lastActiveAt: 'Ahora mismo',
      isCurrentSession: true,
      status: 'active',
    };
    setSessionHistory((prev) => [
      newSession,
      ...prev.map((s) => ({ ...s, isCurrentSession: false })),
    ]);
    try {
      localStorage.setItem(
        STORAGE_KEYS.AUTH_SESSION,
        JSON.stringify({ userId: user.id, username: user.username, cachedAt: Date.now() })
      );
    } catch {
      // Ignore
    }

    if (soundEnabled) playNotificationChime('point');
    showToast('Sesión Iniciada', `Bienvenido de vuelta, ${user.fullName}`, 'auth');
    return { success: true, message: 'Sesión iniciada con éxito' };
  }, [users, soundEnabled, showToast]);

  // Auth: Google Sign-In via Firebase + Cloud SQL sync
  const loginWithGoogle = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const fbUser = cred.user;
      const email = (fbUser.email || '').toLowerCase();
      const displayName = (fbUser.displayName || email.split('@')[0] || 'Usuario TORNOW').slice(0, 100);
      const uid = fbUser.uid;

      // Sync public & isolated private PII documents in Firestore
      const publicPath = `users/${uid}`;
      try {
        const publicRef = doc(db, 'users', uid);
        const publicSnap = await getDoc(publicRef);
        if (publicSnap.exists()) {
          await updateDoc(publicRef, {
            displayName,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(publicRef, {
            uid,
            displayName,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.WRITE, publicPath);
        } catch {
          // Handled
        }
      }

      if (email) {
        const privatePath = `users/${uid}/private/info`;
        try {
          const privateRef = doc(db, 'users', uid, 'private', 'info');
          const privateSnap = await getDoc(privateRef);
          if (privateSnap.exists()) {
            await updateDoc(privateRef, {
              email: email.slice(0, 160),
              updatedAt: serverTimestamp(),
            });
          } else {
            await setDoc(privateRef, {
              uid,
              email: email.slice(0, 160),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          try {
            handleFirestoreError(err, OperationType.WRITE, privatePath);
          } catch {
            // Handled
          }
        }
      }

      // Sync with Cloud SQL backend
      const token = await fbUser.getIdToken();
      await fetch('/api/me', {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);

      const isAdminEmail = email === 'diegostrqfe@gmail.com';
      const existingAccount = users.find(
        (u) => u.id === uid || (email && u.email?.toLowerCase() === email)
      );

      const mappedUser: UserAccount = existingAccount
        ? {
            ...existingAccount,
            fullName: displayName,
            email: email || existingAccount.email,
            role: isAdminEmail ? 'super_admin' : existingAccount.role,
          }
        : {
            id: uid,
            username: email ? email.split('@')[0] : `user_${uid.slice(0, 6)}`,
            passwordHash: 'FIREBASE_OAUTH',
            role: isAdminEmail ? 'super_admin' : 'organizer',
            fullName: displayName,
            email,
            tournamentQuota: isAdminEmail ? 999 : 1,
            organizerTournamentIds: [],
          };

      setUsers((prev) => {
        const exists = prev.some((u) => u.id === mappedUser.id);
        return exists
          ? prev.map((u) => (u.id === mappedUser.id ? mappedUser : u))
          : [...prev, mappedUser];
      });
      setCurrentUser(mappedUser);

      const newSession: LoginSessionRecord = {
        id: 'sess-' + Date.now(),
        userId: mappedUser.id,
        username: mappedUser.username,
        fullName: mappedUser.fullName,
        role: mappedUser.role,
        device: getDeviceInfo(),
        ipLocation: 'Google Cloud / Firebase Auth (Chile)',
        loginAt: new Date().toLocaleDateString('es-CL', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        lastActiveAt: 'Ahora mismo',
        isCurrentSession: true,
        status: 'active',
      };
      setSessionHistory((prev) => [
        newSession,
        ...prev.map((s) => ({ ...s, isCurrentSession: false })),
      ]);

      if (soundEnabled) playNotificationChime('point');
      showToast('Sesión Iniciada con Google', `Bienvenido, ${mappedUser.fullName}`, 'auth');
      return { success: true, message: 'Sesión iniciada con Google exitosamente' };
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      return {
        success: false,
        message: error?.message || 'No se pudo completar el inicio de sesión con Google.',
      };
    }
  }, [users, soundEnabled, showToast]);

  // Auth: Logout
  const logout = useCallback(() => {
    firebaseSignOut(auth).catch(() => null);
    try {
      localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } catch {
      // Ignore
    }
    setCurrentUser(null);
    setSessionHistory((prev) =>
      prev.map((s) => (s.isCurrentSession ? { ...s, status: 'closed', isCurrentSession: false } : s))
    );
    showToast('Sesión Cerrada', 'Has cerrado sesión exitosamente', 'auth');
  }, [showToast]);

  // Change Password
  const changePassword = useCallback((oldPassword: string, newPassword: string): { success: boolean; message: string } => {
    if (!currentUser) return { success: false, message: 'No hay una sesión activa.' };
    if (currentUser.passwordHash !== oldPassword.trim()) {
      return { success: false, message: 'La contraseña actual no coincide.' };
    }
    if (newPassword.trim().length < 6) {
      return { success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' };
    }
    const updatedUser: UserAccount = { ...currentUser, passwordHash: newPassword.trim() };
    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updatedUser : u)));
    showToast('Contraseña Actualizada', 'Tu clave de acceso ha sido cambiada exitosamente.', 'auth');
    return { success: true, message: 'Contraseña actualizada con éxito.' };
  }, [currentUser, showToast]);

  // Update User Profile
  const updateUserProfile = useCallback((data: { fullName?: string; email?: string; phone?: string }): { success: boolean; message: string } => {
    if (!currentUser) return { success: false, message: 'No hay una sesión activa.' };
    const updatedUser: UserAccount = {
      ...currentUser,
      fullName: data.fullName?.trim() || currentUser.fullName,
      email: data.email?.trim() || currentUser.email,
      phone: data.phone?.trim() || currentUser.phone,
    };
    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updatedUser : u)));
    showToast('Perfil Actualizado', 'Los datos de tu cuenta han sido guardados.', 'auth');
    return { success: true, message: 'Perfil actualizado exitosamente.' };
  }, [currentUser, showToast]);

  // Close Other Sessions
  const closeOtherSessions = useCallback(() => {
    setSessionHistory((prev) =>
      prev.map((s) => (s.isCurrentSession ? s : { ...s, status: 'closed' }))
    );
    showToast('Sesiones Cerradas', 'Se han cerrado todas las otras sesiones en otros dispositivos.', 'auth');
  }, [showToast]);

  // Delete User
  const deleteUser = useCallback((userId: string) => {
    const userToDelete = users.find((u) => u.id === userId);
    if (!userToDelete) {
      return { success: false, message: 'Usuario no encontrado' };
    }
    if (userToDelete.role === 'super_admin') {
      const remainingAdmins = users.filter((u) => u.role === 'super_admin' && u.id !== userId);
      if (remainingAdmins.length === 0) {
        return { success: false, message: 'No se puede eliminar el único Administrador General.' };
      }
    }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    showToast('Usuario Eliminado', `La cuenta de ${userToDelete.fullName} fue removida`, 'admin');
    return { success: true, message: 'Usuario eliminado exitosamente' };
  }, [users, showToast]);

  // Update User Role (Administrators can change roles quickly)
  const updateUserRole = useCallback((userId: string, newRole: UserRole) => {
    const userToUpdate = users.find((u) => u.id === userId);
    if (!userToUpdate) {
      return { success: false, message: 'Usuario no encontrado.' };
    }
    if (userToUpdate.role === 'super_admin' && newRole !== 'super_admin') {
      const remainingAdmins = users.filter((u) => u.role === 'super_admin' && u.id !== userId);
      if (remainingAdmins.length === 0) {
        return { success: false, message: 'No se puede modificar el rol del único Super Administrador.' };
      }
    }

    const updatedUser: UserAccount = {
      ...userToUpdate,
      role: newRole,
      tournamentQuota: newRole === 'organizer' ? Math.max(userToUpdate.tournamentQuota || 1, 1) : userToUpdate.tournamentQuota,
    };

    setUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));
    if (currentUser?.id === userId) {
      setCurrentUser(updatedUser);
    }

    const roleLabels: Record<UserRole, string> = {
      super_admin: 'Super Administrador',
      organizer: 'Organizador Oficial',
      club_admin: 'Delegado de Club',
      usuario: 'Usuario / Espectador',
    };

    showToast('Rol Actualizado', `@${userToUpdate.username} ahora es ${roleLabels[newRole]}`, 'admin');
    return { success: true, message: `Rol actualizado a ${roleLabels[newRole]}` };
  }, [users, currentUser?.id, showToast]);

  // Validate Invite Key
  const validateInviteKey = useCallback((key: string) => {
    const cleanKey = key.trim().toUpperCase();
    const invite = invites.find((inv) => inv.id === cleanKey);

    if (!invite) {
      return { valid: false, message: 'Clave de invitación inválida o no encontrada.' };
    }
    if (invite.status === 'redeemed') {
      return {
        valid: false,
        message: `Esta clave ya fue canjeada el ${invite.redeemedAt || 'previamente'} por @${invite.redeemedByUsername || 'otro usuario'}.`,
      };
    }
    const club = allClubs.find((c) => c.id === invite.clubId);
    return {
      valid: true,
      invite,
      club,
      message: `Clave válida para el club "${invite.clubName}" (${invite.category}).`,
    };
  }, [invites, allClubs]);

  // Redeem Invite Key
  const redeemInviteKey = useCallback((
    key: string,
    userData: { username: string; password: string; fullName: string; email: string; phone?: string }
  ) => {
    const validation = validateInviteKey(key);
    if (!validation.valid || !validation.invite) {
      return { success: false, message: validation.message };
    }

    const cleanUsername = userData.username.trim().toLowerCase();
    const existing = users.find((u) => u.username.toLowerCase() === cleanUsername);
    if (existing) {
      return { success: false, message: 'El nombre de usuario ya está en uso. Elige otro.' };
    }

    const invite = validation.invite;
    const newUser: UserAccount = {
      id: 'usr-' + Date.now(),
      username: cleanUsername,
      passwordHash: userData.password.trim(),
      fullName: userData.fullName.trim(),
      role: 'club_admin',
      clubId: invite.clubId,
      email: userData.email.trim(),
      phone: userData.phone?.trim(),
      createdAt: new Date().toISOString().split('T')[0],
      inviteKeyUsed: invite.id,
    };

    setUsers((prev) => [...prev, newUser]);
    setInvites((prev) =>
      prev.map((inv) =>
        inv.id === invite.id
          ? {
              ...inv,
              status: 'redeemed',
              redeemedByUserId: newUser.id,
              redeemedByUsername: newUser.username,
              redeemedAt: new Date().toISOString().split('T')[0],
            }
          : inv
      )
    );

    setAllClubs((prev) =>
      prev.map((c) =>
        c.id === invite.clubId
          ? {
              ...c,
              managerUsername: newUser.username,
              managerName: newUser.fullName,
              managerEmail: newUser.email,
              managerPhone: newUser.phone,
            }
          : c
      )
    );

    setCurrentUser(newUser);
    const clubActivatedNotif = buildSystemNotification({
      tournamentId: invite.tournamentId || activeTournament.id,
      title: `Credencial de Club Activada • ${invite.clubName}`,
      message: `El delegado ${newUser.fullName} (@${newUser.username}) canjeó la clave única del club "${invite.clubName}" (${invite.category}).`,
      targetRole: 'organizer',
      targetClubId: invite.clubId,
      clubId: invite.clubId,
      clubName: invite.clubName,
      priority: 'alta',
    });
    const welcomeDelegateNotif = buildSystemNotification({
      tournamentId: invite.tournamentId || activeTournament.id,
      title: `Sistema TORNOW • Bienvenido Delegado de ${invite.clubName}`,
      message: `Tu cuenta oficial para gestionar la nómina de jugadores y cuerpo técnico de "${invite.clubName}" está activa.`,
      targetRole: 'club_admin',
      targetClubId: invite.clubId,
      targetUserId: newUser.id,
      clubId: invite.clubId,
      clubName: invite.clubName,
      priority: 'normal',
    });
    setNotifications((prev) => [clubActivatedNotif, welcomeDelegateNotif, ...prev]);

    if (soundEnabled) playNotificationChime('announcement');
    showToast(
      '¡Registro Completado!',
      `Has activado tu cuenta oficial para ${invite.clubName}. Ya puedes cargar tu nómina.`,
      'auth'
    );

    return { success: true, user: newUser, message: 'Cuenta creada y vinculada exitosamente.' };
  }, [validateInviteKey, users, activeTournament.id, soundEnabled, showToast]);

  // 1. Create Organizer Key (Used by Super Admin - supports Days, Months, or Annual duration)
  const createOrganizerKey = useCallback((data: {
    tournamentName?: string;
    organizerName?: string;
    organizerEmail?: string;
    organizerPhone?: string;
    notes?: string;
    durationUnit?: KeyDurationUnit;
    durationValue?: number;
  }): OrganizerKey => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const unit: KeyDurationUnit = data.durationUnit || 'months';
    const val = Math.max(1, Math.floor(Number(data.durationValue) || 1));
    const totalDays = calculateDurationDays(unit, val);
    const durationLabel = formatKeyDurationLabel(unit, val);

    const nowIso = new Date().toISOString();
    const expiresAtIso = new Date(Date.now() + totalDays * 24 * 60 * 60 * 1000).toISOString();
    const cleanTourName = sanitizeSafeInput(data.tournamentName || 'Torneo Oficial TorNow', 120) || 'Torneo Oficial TorNow';
    const cleanOrgName = sanitizeSafeInput(data.organizerName || 'Por completar por el organizador', 100) || 'Por completar por el organizador';
    const cleanOrgEmail = sanitizeSafeInput(data.organizerEmail || '', 120);

    const newKey: OrganizerKey = {
      id: `KEY-ORG-TORNOW-${rand}`,
      tournamentName: cleanTourName,
      organizerName: cleanOrgName,
      organizerEmail: cleanOrgEmail,
      organizerPhone: sanitizeSafeInput(data.organizerPhone || '', 30),
      notes: sanitizeSafeInput(data.notes || '', 250) || `Vigencia Temporal: ${durationLabel} • Torneo: ${cleanTourName}`,
      createdAt: nowIso,
      expiresAt: expiresAtIso,
      trialDays: totalDays,
      durationUnit: unit,
      durationValue: val,
      renewalCount: 0,
      isBlocked: false,
      status: 'pending',
    };
    setOrganizerKeys((prev) => [newKey, ...prev]);
    showToast(
      `Key Temporal (${durationLabel}) Creada`,
      `Se generó la clave ${newKey.id} para el torneo "${cleanTourName}".`,
      'admin'
    );
    return newKey;
  }, [showToast]);

  // 1a. Renew Organizer Key (Extends expiration and unblocks the organizer panel immediately)
  const renewOrganizerKey = useCallback((
    keyId: string,
    durationUnit: KeyDurationUnit = 'months',
    durationValue = 1
  ) => {
    const target = organizerKeys.find((k) => k.id === keyId);
    if (!target) return;

    const safeVal = Math.max(1, Math.floor(Number(durationValue) || 1));
    const addedDays = calculateDurationDays(durationUnit, safeVal);
    const durationLabel = formatKeyDurationLabel(durationUnit, safeVal);

    const currentExpMs = target.expiresAt ? new Date(target.expiresAt).getTime() : Date.now();
    const baseMs = Number.isNaN(currentExpMs) || currentExpMs < Date.now() ? Date.now() : currentExpMs;
    const nextExpiresAt = new Date(baseMs + addedDays * 24 * 60 * 60 * 1000).toISOString();

    setOrganizerKeys((prev) =>
      prev.map((k) => {
        if (k.id !== keyId) return k;
        return {
          ...k,
          expiresAt: nextExpiresAt,
          trialDays: addedDays,
          durationUnit,
          durationValue: safeVal,
          renewedAt: new Date().toISOString(),
          renewalCount: (k.renewalCount || 0) + 1,
          isBlocked: false,
          blockedReason: undefined,
          gracePeriodStartAt: undefined,
          renewalAppealSubmittedAt: undefined,
          status: k.redeemedByUserId ? 'redeemed' : 'pending',
        };
      })
    );

    showToast(
      'Key Renovada Exitosamente',
      `La clave ${keyId} fue renovada por ${durationLabel}. El panel del organizador está desbloqueado.`,
      'admin'
    );
  }, [organizerKeys, showToast]);

  // 1a-bis. Submit Key Renewal Appeal (Used by Organizer from the Non-Renewal Lock Dialog)
  const submitKeyRenewalAppeal = useCallback((keyId: string, message?: string) => {
    const nowIso = new Date().toISOString();
    setOrganizerKeys((prev) =>
      prev.map((k) =>
        k.id === keyId
          ? {
              ...k,
              renewalAppealSubmittedAt: nowIso,
            }
          : k
      )
    );

    const appealNotif = buildSystemNotification({
      tournamentId: activeTournament.id,
      title: `Solicitud de Renovación de Key • ${keyId}`,
      message: `El organizador de "${activeTournament.name}" solicitó renovar su Key (${keyId}). ${
        message ? `Mensaje: ${sanitizeSafeInput(message, 250)}` : ''
      }`,
      targetRole: 'organizer',
      priority: 'urgente',
    });
    setNotifications((prev) => [appealNotif, ...prev]);

    const msg =
      'Nuestro equipo de soporte ha recibido tu aviso. Se ha detenido la eliminación automática mientras gestionamos tu renovación.';
    showToast('Solicitud de Renovación Enviada', msg, 'auth');
    return { success: true, message: msg };
  }, [activeTournament.id, activeTournament.name, showToast]);

  // 1b. Delete Organizer Key
  const deleteOrganizerKey = useCallback((keyId: string) => {
    const target = organizerKeys.find((k) => k.id === keyId);
    setOrganizerKeys((prev) => prev.filter((k) => k.id !== keyId));
    showToast(
      'Key Eliminada',
      `La clave ${keyId}${target?.tournamentName ? ` (${target.tournamentName})` : ''} fue eliminada permanentemente.`,
      'admin'
    );
  }, [organizerKeys, showToast]);

  // 1c. Block / Unblock Organizer Key (Starts 7-day grace period before auto-deletion if blocked for non-renewal)
  const toggleBlockOrganizerKey = useCallback((keyId: string) => {
    const target = organizerKeys.find((k) => k.id === keyId);
    if (!target) return;
    const nextBlocked = !target.isBlocked;
    const nowIso = new Date().toISOString();
    setOrganizerKeys((prev) =>
      prev.map((k) => {
        if (k.id !== keyId) return k;
        return {
          ...k,
          isBlocked: nextBlocked,
          blockedReason: nextBlocked ? 'non_renewal' : undefined,
          gracePeriodStartAt: nextBlocked ? nowIso : undefined,
          status: nextBlocked ? 'blocked' : k.redeemedByUserId ? 'redeemed' : 'pending',
        };
      })
    );
    showToast(
      nextBlocked ? 'Key Bloqueada (Falta de Renovación)' : 'Key Desbloqueada',
      nextBlocked
        ? `La clave ${keyId} fue bloqueada. El organizador tiene 7 días para contactar a soporte antes de la eliminación automática.`
        : `La clave ${keyId} ha sido reactivada.`,
      'admin'
    );
  }, [organizerKeys, showToast]);

  // 1d. Automatic 7-Day Grace Period Enforcer: If a key is expired/blocked for 7+ days without contact, auto-delete key & tournament
  useEffect(() => {
    const keysToDelete = organizerKeys.filter((k) => {
      const st = calculateKeyTrialCountdown({
        createdAt: k.createdAt,
        expiresAt: k.expiresAt,
        trialDays: k.trialDays || 30,
        isBlocked: k.isBlocked,
        gracePeriodStartAt: k.gracePeriodStartAt,
        renewalAppealSubmittedAt: k.renewalAppealSubmittedAt,
      });
      return st.shouldAutoDeleteKeyAndTournament;
    });

    if (keysToDelete.length > 0) {
      const deadKeyIds = new Set(keysToDelete.map((k) => k.id));
      const deadUserIds = new Set(
        keysToDelete.map((k) => k.redeemedByUserId).filter(Boolean) as string[]
      );
      const deadTourNames = new Set(
        keysToDelete.map((k) => (k.tournamentName || '').toLowerCase()).filter(Boolean)
      );

      setOrganizerKeys((prev) => prev.filter((k) => !deadKeyIds.has(k.id)));
      setTournaments((prev) =>
        prev.filter((t) => {
          if (t.organizerUserId && deadUserIds.has(t.organizerUserId)) return false;
          if (deadTourNames.has(t.name.toLowerCase())) return false;
          return true;
        })
      );
    }
  }, [organizerKeys]);

  // 2. Validate Organizer Key
  const validateOrganizerKey = useCallback((key: string) => {
    const cleanKey = key.trim().toUpperCase();
    const found = organizerKeys.find((k) => k.id === cleanKey);
    if (!found) {
      return { valid: false, message: 'Clave de organizador no válida o inexistente en los registros.' };
    }
    if (found.isBlocked || found.status === 'blocked') {
      return {
        valid: false,
        message: 'Esta clave ha sido bloqueada por un Administrador de TorNow. Contáctanos por WhatsApp para regularizar tu cuenta.',
      };
    }
    if (found.expiresAt && new Date(found.expiresAt).getTime() <= Date.now()) {
      return {
        valid: false,
        message: 'El período de 1 mes de prueba gratuita de esta clave ha vencido.',
      };
    }
    if (found.status === 'redeemed') {
      return {
        valid: false,
        message: `Esta clave ya fue canjeada el ${found.redeemedAt || 'previamente'} por @${found.redeemedByUsername || 'otro usuario'}.`,
      };
    }
    return {
      valid: true,
      keyObj: found,
      message: `Clave válida (1 Mes de Prueba Gratuita)${found.tournamentName ? ` para el torneo "${found.tournamentName}"` : ''}.`,
    };
  }, [organizerKeys]);

  // 3. Redeem Organizer Key (Registration with role: 'organizer')
  const redeemOrganizerKey = useCallback((
    key: string,
    userData: { username: string; password: string; fullName: string; email: string; phone?: string }
  ) => {
    const validation = validateOrganizerKey(key);
    if (!validation.valid || !validation.keyObj) {
      return { success: false, message: validation.message };
    }

    const cleanUsername = userData.username.trim().toLowerCase();
    const existing = users.find((u) => u.username.toLowerCase() === cleanUsername);
    if (existing) {
      return { success: false, message: 'El nombre de usuario ya está registrado. Por favor elige otro.' };
    }

    const orgKey = validation.keyObj;
    const newUser: UserAccount = {
      id: 'usr-org-' + Date.now(),
      username: cleanUsername,
      passwordHash: userData.password.trim(),
      fullName: userData.fullName.trim() || orgKey.organizerName,
      role: 'organizer',
      email: userData.email.trim() || orgKey.organizerEmail,
      phone: userData.phone?.trim() || orgKey.organizerPhone,
      createdAt: new Date().toISOString().split('T')[0],
      organizerKeyUsed: orgKey.id,
      organizerTournamentIds: [],
      tournamentQuota: 1, // 1 torneo permitido por clave
    };

    setUsers((prev) => [...prev, newUser]);
    setOrganizerKeys((prev) =>
      prev.map((k) =>
        k.id === orgKey.id
          ? {
              ...k,
              organizerName: newUser.fullName || k.organizerName,
              organizerEmail: newUser.email || k.organizerEmail,
              organizerPhone: newUser.phone || k.organizerPhone,
              status: 'redeemed',
              redeemedByUserId: newUser.id,
              redeemedByUsername: newUser.username,
              redeemedAt: new Date().toISOString().split('T')[0],
            }
          : k
      )
    );

    setCurrentUser(newUser);
    if (soundEnabled) playNotificationChime('point');
    showToast(
      '¡Bienvenido a TORNOW!',
      `Cuenta de organizador activada para ${newUser.fullName}. Tienes habilitado 1 torneo con esta clave.`,
      'auth'
    );
    return { success: true, user: newUser, message: 'Cuenta de organizador creada con éxito.' };
  }, [validateOrganizerKey, users, soundEnabled, showToast]);

  // 4. Redeem Additional Organizer Key (Allows creating +1 tournament)
  const redeemAdditionalOrganizerKey = useCallback((key: string) => {
    if (!currentUser) {
      return { success: false, message: 'Debes iniciar sesión para canjear una clave.' };
    }

    const validation = validateOrganizerKey(key);
    if (!validation.valid || !validation.keyObj) {
      return { success: false, message: validation.message };
    }

    const orgKey = validation.keyObj;
    const currentQuota = currentUser.tournamentQuota || 1;
    const newQuota = currentQuota + 1;
    const additional = [...(currentUser.additionalOrganizerKeys || []), orgKey.id];

    const updatedUser: UserAccount = {
      ...currentUser,
      tournamentQuota: newQuota,
      additionalOrganizerKeys: additional,
    };

    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updatedUser : u)));
    setCurrentUser(updatedUser);

    setOrganizerKeys((prev) =>
      prev.map((k) =>
        k.id === orgKey.id
          ? {
              ...k,
              status: 'redeemed',
              redeemedByUserId: currentUser.id,
              redeemedByUsername: currentUser.username,
              redeemedAt: new Date().toISOString().split('T')[0],
            }
          : k
      )
    );

    if (soundEnabled) playNotificationChime('point');
    showToast(
      '¡Clave Comercial Canjeada!',
      `Se ha desbloqueado la creación de 1 torneo adicional (Total permitido: ${newQuota}).`,
      'admin'
    );
    return { success: true, message: 'Clave activada exitosamente. Ya puedes crear 1 torneo adicional.' };
  }, [currentUser, validateOrganizerKey, soundEnabled, showToast]);

  // Permissions: Check if current user can edit a club's roster
  const canCurrentUserEditRoster = useCallback(
    (clubId: string): boolean => {
      if (!currentUser) return false;
      if (currentUser.role === 'super_admin') return true;
      if (currentUser.role === 'organizer') {
        return true;
      }
      if (currentUser.role === 'club_admin') {
        if (currentUser.clubId !== clubId) return false;
        return activeTournament.allowRosterEditing !== false;
      }
      if (currentUser.role === 'usuario') {
        return !!activeTournament.isDemo;
      }
      return false;
    },
    [currentUser, activeTournament]
  );

  // Generate New Invite for Club
  const generateNewInviteForClub = useCallback((
    clubId: string,
    email: string,
    name: string,
    phone?: string
  ): ClubInvite => {
    const club = allClubs.find((c) => c.id === clubId);
    const clubName = club?.name || 'Club';
    const category = club?.category || selectedCategory;

    const newKey = generateInviteToken(club?.shortName || 'TOR');
    const newInvite: ClubInvite = {
      id: newKey,
      tournamentId: club?.tournamentId || activeTournament.id,
      clubId,
      clubName,
      category,
      recipientEmail: email.trim(),
      recipientName: name.trim(),
      recipientPhone: phone?.trim(),
      createdAt: new Date().toISOString().split('T')[0],
      status: 'pending',
    };

    setInvites((prev) => [newInvite, ...prev]);
    setAllClubs((prev) =>
      prev.map((c) => (c.id === clubId ? { ...c, inviteKey: newKey } : c))
    );

    return newInvite;
  }, [allClubs, selectedCategory, activeTournament.id]);

  // Add Club
  const addClub = useCallback((data: AddClubInput) => {
    const id = 'club-' + Date.now();
    const shortName = (data.shortName || data.name.slice(0, 3)).toUpperCase().trim();
    const newClub: Club = {
      id,
      tournamentId: activeTournament.id,
      group: data.group,
      name: data.name.trim(),
      shortName,
      category: data.category,
      color: data.color || '#0052fe',
      secondaryColor: data.secondaryColor || '#f59e0b',
      homeCourt: data.homeCourt?.trim() || activeTournament.venue,
      managerUsername: '',
      managerName: data.managerName.trim(),
      managerEmail: data.managerEmail.trim(),
      managerPhone: data.managerPhone?.trim(),
      staff: {
        headCoach: data.headCoach?.trim() || '',
        assistantCoach: data.assistantCoach?.trim() || '',
      },
      roster: [],
    };

    const newKey = generateInviteToken(shortName || 'TOR');
    const newInvite: ClubInvite = {
      id: newKey,
      tournamentId: activeTournament.id,
      clubId: id,
      clubName: newClub.name,
      category: data.category,
      recipientEmail: data.managerEmail.trim(),
      recipientName: data.managerName.trim(),
      recipientPhone: data.managerPhone?.trim(),
      createdAt: new Date().toISOString().split('T')[0],
      status: 'pending',
    };

    newClub.inviteKey = newInvite.id;
    setInvites((prev) => [newInvite, ...prev]);
    setAllClubs((prev) => [...prev, newClub]);

    // Check if tournament has started in this category
    const hasStarted = allMatches.some(
      (m) =>
        m.tournamentId === activeTournament.id &&
        m.category === data.category &&
        (m.status === 'live' || m.status === 'finished')
    );

    // If tournament has not started, auto-regenerate round robin fixtures with the new club included
    if (!hasStarted) {
      const updatedClubs = [...allClubs.filter((c) => c.id !== newClub.id), newClub];
      const catClubs = updatedClubs.filter(
        (c) => c.tournamentId === activeTournament.id && c.category === data.category
      );
      if (catClubs.length >= 2) {
        const { matches: newFixtures } = generateRoundRobinFixtures(
          catClubs,
          activeTournament.id,
          data.category,
          activeTournament.venue,
          activeTournament.startDate || new Date().toISOString().split('T')[0],
          activeTournament.format === 'double_round'
        );
        setAllMatches((prev) => {
          const preserved = prev.filter(
            (m) => !(m.tournamentId === activeTournament.id && m.category === data.category)
          );
          return [...preserved, ...newFixtures];
        });
      }
    }

    showToast('Club Registrado', `Se creó el club "${newClub.name}" y se actualizaron los cruces oficiales.`, 'club');
    return { club: newClub, invite: newInvite };
  }, [activeTournament, allClubs, allMatches, showToast]);

  // Delete Club
  const deleteClub = useCallback((clubId: string) => {
    const club = allClubs.find((c) => c.id === clubId);
    if (!club) return;

    const hasStarted = allMatches.some(
      (m) =>
        m.tournamentId === club.tournamentId &&
        m.category === club.category &&
        (m.status === 'live' || m.status === 'finished')
    );

    setAllClubs((prev) => prev.filter((c) => c.id !== clubId));
    setInvites((prev) => prev.filter((inv) => inv.clubId !== clubId));

    if (!hasStarted) {
      // Auto-regenerate fixtures for remaining clubs in this category
      const remainingClubs = allClubs.filter(
        (c) => c.id !== clubId && c.tournamentId === club.tournamentId && c.category === club.category
      );
      if (remainingClubs.length >= 2) {
        const tourId = club.tournamentId || activeTournament.id;
        const clubCat = club.category || selectedCategory;
        const tour = tournaments.find((t) => t.id === tourId) || activeTournament;
        const { matches: newFixtures } = generateRoundRobinFixtures(
          remainingClubs,
          tourId,
          clubCat,
          tour.venue,
          tour.startDate || new Date().toISOString().split('T')[0],
          tour.format === 'double_round'
        );
        setAllMatches((prev) => {
          const preserved = prev.filter(
            (m) => !(m.tournamentId === tourId && m.category === clubCat)
          );
          return [...preserved, ...newFixtures];
        });
      } else {
        setAllMatches((prev) => prev.filter((m) => m.homeTeamId !== clubId && m.awayTeamId !== clubId));
      }
    } else {
      setAllMatches((prev) => prev.filter((m) => m.homeTeamId !== clubId && m.awayTeamId !== clubId));
    }

    showToast('Club Eliminado', `El club ${club.name} fue retirado y los cruces se ajustaron.`, 'club');
  }, [allClubs, allMatches, activeTournament, selectedCategory, tournaments, showToast]);

  // Roster & Staff Registration Management
  const updateFullRoster = useCallback((clubId: string, roster: Player[], staff?: CoachStaff) => {
    const club = allClubs.find((c) => c.id === clubId);
    setAllClubs((prev) =>
      prev.map((c) => (c.id === clubId ? { ...c, roster, staff: staff || c.staff } : c))
    );
    if (club) {
      const notif = buildRosterModificationNotification({
        tournamentId: club.tournamentId || activeTournament.id,
        club,
        actionTitle: 'Actualización de Nómina Oficial',
        detailMessage: `Guardó su nómina oficial con ${roster.length} jugadores inscritos${
          staff?.headCoach ? ` y DT ${staff.headCoach}` : ''
        }.`,
        actorName: currentUser?.fullName || club.managerName || club.name,
      });
      setNotifications((prev) => [notif, ...prev]);
    }
    showToast(
      'Inscripción Oficial Guardada',
      `Se actualizaron ${roster.length} jugadores y el cuerpo técnico del equipo.`,
      'roster'
    );
  }, [allClubs, activeTournament.id, currentUser?.fullName, showToast]);

  const addPlayerToClub = useCallback((clubId: string, player: Omit<Player, 'id' | 'clubId'>) => {
    const club = allClubs.find((c) => c.id === clubId);
    const newPlayer: Player = {
      ...player,
      id: 'ply-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      clubId,
    };
    setAllClubs((prev) =>
      prev.map((c) => {
        if (c.id !== clubId) return c;
        return { ...c, roster: [...c.roster, newPlayer] };
      })
    );
    if (club) {
      const fullName = `${newPlayer.name} ${newPlayer.paternalSurname || ''}`.trim();
      const notif = buildRosterModificationNotification({
        tournamentId: club.tournamentId || activeTournament.id,
        club,
        actionTitle: 'Nuevo Jugador Inscrito',
        detailMessage: `Inscribió al jugador #${newPlayer.dorsal} ${fullName} (${newPlayer.position}).`,
        actorName: currentUser?.fullName || club.managerName || club.name,
      });
      setNotifications((prev) => [notif, ...prev]);
    }
    showToast('Jugador Agregado', `${newPlayer.name} ${newPlayer.paternalSurname || ''} fue inscrito.`, 'roster');
  }, [allClubs, activeTournament.id, currentUser?.fullName, showToast]);

  const updatePlayerInClub = useCallback((clubId: string, player: Player) => {
    const club = allClubs.find((c) => c.id === clubId);
    setAllClubs((prev) =>
      prev.map((c) => {
        if (c.id !== clubId) return c;
        return {
          ...c,
          roster: c.roster.map((p) => (p.id === player.id ? player : p)),
        };
      })
    );
    if (club) {
      const fullName = `${player.name} ${player.paternalSurname || ''}`.trim();
      const notif = buildRosterModificationNotification({
        tournamentId: club.tournamentId || activeTournament.id,
        club,
        actionTitle: 'Jugador Modificado en Nómina',
        detailMessage: `Actualizó la ficha del jugador #${player.dorsal} ${fullName} (${player.position}).`,
        actorName: currentUser?.fullName || club.managerName || club.name,
      });
      setNotifications((prev) => [notif, ...prev]);
    }
  }, [allClubs, activeTournament.id, currentUser?.fullName]);

  const removePlayerFromClub = useCallback((clubId: string, playerId: string) => {
    const club = allClubs.find((c) => c.id === clubId);
    const removedPlayer = club?.roster.find((p) => p.id === playerId);
    setAllClubs((prev) =>
      prev.map((c) => {
        if (c.id !== clubId) return c;
        return {
          ...c,
          roster: c.roster.filter((p) => p.id !== playerId),
        };
      })
    );
    if (club && removedPlayer) {
      const fullName = `${removedPlayer.name} ${removedPlayer.paternalSurname || ''}`.trim();
      const notif = buildRosterModificationNotification({
        tournamentId: club.tournamentId || activeTournament.id,
        club,
        actionTitle: 'Baja de Jugador en Nómina',
        detailMessage: `Retiró al jugador #${removedPlayer.dorsal} ${fullName} de la nómina oficial.`,
        actorName: currentUser?.fullName || club.managerName || club.name,
      });
      setNotifications((prev) => [notif, ...prev]);
    }
  }, [allClubs, activeTournament.id, currentUser?.fullName]);

  const assignSpecialRole = useCallback((
    clubId: string,
    playerId: string,
    role: 'capitan' | 'libero_1' | 'libero_2' | 'regular'
  ) => {
    const club = allClubs.find((c) => c.id === clubId);
    const targetPlayer = club?.roster.find((p) => p.id === playerId);
    setAllClubs((prev) =>
      prev.map((c) => {
        if (c.id !== clubId) return c;
        return {
          ...c,
          roster: c.roster.map((p) => {
            if (p.id === playerId) {
              if (role === 'capitan') return { ...p, isCaptain: true, isLibero: false };
              if (role === 'libero_1') return { ...p, isLibero: true, liberoType: 'principal' as const, isCaptain: false };
              if (role === 'libero_2') return { ...p, isLibero: true, liberoType: 'secundario' as const, isCaptain: false };
              return { ...p, isCaptain: false, isLibero: false, liberoType: undefined };
            }
            if (role === 'capitan' && p.isCaptain) return { ...p, isCaptain: false };
            if (role === 'libero_1' && p.isLibero && p.liberoType === 'principal') return { ...p, isLibero: false, liberoType: undefined };
            if (role === 'libero_2' && p.isLibero && p.liberoType === 'secundario') return { ...p, isLibero: false, liberoType: undefined };
            return p;
          }),
        };
      })
    );
    if (club && targetPlayer) {
      const roleLabels: Record<typeof role, string> = {
        capitan: 'Capitán',
        libero_1: 'Líbero Principal',
        libero_2: 'Líbero Secundario',
        regular: 'Jugador Regular',
      };
      const notif = buildRosterModificationNotification({
        tournamentId: club.tournamentId || activeTournament.id,
        club,
        actionTitle: 'Cambio de Rol en Nómina',
        detailMessage: `Designó a #${targetPlayer.dorsal} ${targetPlayer.name} como ${roleLabels[role]}.`,
        actorName: currentUser?.fullName || club.managerName || club.name,
      });
      setNotifications((prev) => [notif, ...prev]);
    }
  }, [allClubs, activeTournament.id, currentUser?.fullName]);

  const updateClubStaff = useCallback((clubId: string, staff: CoachStaff) => {
    const club = allClubs.find((c) => c.id === clubId);
    setAllClubs((prev) =>
      prev.map((c) => (c.id === clubId ? { ...c, staff } : c))
    );
    if (club) {
      const notif = buildRosterModificationNotification({
        tournamentId: club.tournamentId || activeTournament.id,
        club,
        actionTitle: 'Modificación de Cuerpo Técnico',
        detailMessage: `Actualizó su cuerpo técnico (Entrenador: ${staff.headCoach || 'Sin definir'}${
          staff.assistantCoach ? `, Asistente: ${staff.assistantCoach}` : ''
        }${staff.analyst ? `, Analista: ${staff.analyst}` : ''}).`,
        actorName: currentUser?.fullName || club.managerName || club.name,
      });
      setNotifications((prev) => [notif, ...prev]);
    }
    showToast('Cuerpo Técnico', 'Staff de entrenadores actualizado exitosamente.', 'roster');
  }, [allClubs, activeTournament.id, currentUser?.fullName, showToast]);

  const updateClubSocialLinks = useCallback((clubId: string, socialLinks: ClubSocialLinks) => {
    setAllClubs((prev) =>
      prev.map((c) => (c.id === clubId ? { ...c, socialLinks } : c))
    );
    showToast('Redes Sociales Guardadas', 'Los enlaces públicos del club han sido actualizados.', 'club');
  }, [showToast]);

  // Match Management
  const updateMatchSets = useCallback((
    matchId: string,
    homeSetsWon: number,
    awaySetsWon: number,
    status?: MatchStatus
  ) => {
    const existingMatch = allMatches.find((m) => m.id === matchId);
    setAllMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;
        const newStatus = status || m.status;
        let winnerId = m.winnerId;
        if (newStatus === 'finished') {
          if (homeSetsWon > awaySetsWon) winnerId = m.homeTeamId;
          else if (awaySetsWon > homeSetsWon) winnerId = m.awayTeamId;
        }
        return {
          ...m,
          homeSetsWon,
          awaySetsWon,
          status: newStatus,
          winnerId,
        };
      })
    );

    if (existingMatch) {
      const newStatus = status || existingMatch.status;
      let winnerId = existingMatch.winnerId;
      if (newStatus === 'finished') {
        if (homeSetsWon > awaySetsWon) winnerId = existingMatch.homeTeamId;
        else if (awaySetsWon > homeSetsWon) winnerId = existingMatch.awayTeamId;
      }
      const updatedMatch: Match = {
        ...existingMatch,
        homeSetsWon,
        awaySetsWon,
        status: newStatus,
        winnerId,
      };
      const homeClub = allClubs.find((c) => c.id === existingMatch.homeTeamId);
      const awayClub = allClubs.find((c) => c.id === existingMatch.awayTeamId);
      const matchNotif = buildMatchResultNotification({
        tournamentId: existingMatch.tournamentId || activeTournament.id,
        match: updatedMatch,
        homeClubName: homeClub?.name || 'Local',
        awayClubName: awayClub?.name || 'Visita',
        actorName: currentUser?.fullName || 'Mesa de Control TORNOW',
        sport: activeTournament.sport,
      });
      setNotifications((prev) => [matchNotif, ...prev]);
    }
  }, [allMatches, allClubs, activeTournament.id, activeTournament.sport, currentUser?.fullName]);

  const updateMatchDetails = useCallback((matchId: string, data: Partial<Match>) => {
    const existingMatch = allMatches.find((m) => m.id === matchId);
    setAllMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, ...data } : m))
    );

    if (existingMatch) {
      const merged: Match = { ...existingMatch, ...data };
      const homeClub = allClubs.find((c) => c.id === merged.homeTeamId);
      const awayClub = allClubs.find((c) => c.id === merged.awayTeamId);
      const homeName = homeClub?.name || 'Local';
      const awayName = awayClub?.name || 'Visita';

      const scoreChanged =
        (data.homeSetsWon !== undefined && data.homeSetsWon !== existingMatch.homeSetsWon) ||
        (data.awaySetsWon !== undefined && data.awaySetsWon !== existingMatch.awaySetsWon) ||
        (data.status !== undefined && data.status !== existingMatch.status);

      const scheduleChanged =
        (data.date !== undefined && data.date !== existingMatch.date) ||
        (data.time !== undefined && data.time !== existingMatch.time) ||
        (data.court !== undefined && data.court !== existingMatch.court);

      if (scoreChanged) {
        const matchNotif = buildMatchResultNotification({
          tournamentId: merged.tournamentId || activeTournament.id,
          match: merged,
          homeClubName: homeName,
          awayClubName: awayName,
          actorName: currentUser?.fullName || 'Organización TORNOW',
          sport: activeTournament.sport,
        });
        setNotifications((prev) => [matchNotif, ...prev]);
      } else if (scheduleChanged) {
        const schedNotif: LeagueNotification = {
          id: `notif-sched-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          tournamentId: merged.tournamentId || activeTournament.id,
          title: `Cambio de Programación: ${homeName} vs ${awayName}`,
          message: `El partido de ${merged.round} (${merged.category}) se programó para el ${merged.date} a las ${merged.time} hrs en ${merged.court}.`,
          category: 'cambio_horario',
          targetRole: 'all',
          targetClubId: 'ALL',
          matchId: merged.id,
          priority: 'alta',
          sender: currentUser?.fullName || 'Organización TORNOW',
          timestamp: 'Ahora mismo',
          readBy: [],
        };
        setNotifications((prev) => [schedNotif, ...prev]);
      }
    }
  }, [allMatches, allClubs, activeTournament.id, activeTournament.sport, currentUser?.fullName]);

  const createMatch = useCallback((matchData: Omit<Match, 'id'>) => {
    const newMatch: Match = {
      ...matchData,
      id: 'match-' + Date.now(),
      tournamentId: matchData.tournamentId || activeTournament.id,
    };
    setAllMatches((prev) => [...prev, newMatch]);
    const homeClub = allClubs.find((c) => c.id === newMatch.homeTeamId);
    const awayClub = allClubs.find((c) => c.id === newMatch.awayTeamId);
    if (homeClub || awayClub) {
      const schedNotif: LeagueNotification = {
        id: `notif-newmatch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        tournamentId: newMatch.tournamentId || activeTournament.id,
        title: `Nuevo Partido Programado: ${homeClub?.name || 'Local'} vs ${awayClub?.name || 'Visita'}`,
        message: `${newMatch.round} (${newMatch.category}) • Fecha: ${newMatch.date} a las ${newMatch.time} hrs en ${newMatch.court}.`,
        category: 'cambio_horario',
        targetRole: 'all',
        targetClubId: 'ALL',
        matchId: newMatch.id,
        priority: 'normal',
        sender: currentUser?.fullName || 'Organización TORNOW',
        timestamp: 'Ahora mismo',
        readBy: [],
      };
      setNotifications((prev) => [schedNotif, ...prev]);
    }
    showToast('Partido Creado', `Se programó ${newMatch.round} para ${newMatch.date}`, 'match');
  }, [activeTournament.id, allClubs, currentUser?.fullName, showToast]);

  // Generate Official Fixtures with Round Robin / Circle Method and odd-teams "Libre" handling
  const generateOfficialFixtures = useCallback((
    targetTournamentId?: string,
    targetCategory?: string,
    force: boolean = false
  ): { success: boolean; started?: boolean; message: string; matchesCount?: number } => {
    const tourId = targetTournamentId || activeTournament.id;
    const tour = tournaments.find((t) => t.id === tourId) || activeTournament;
    if (!tour || !tour.id) {
      return { success: false, message: 'No hay un torneo válido seleccionado.' };
    }

    const categoriesToSchedule = targetCategory ? [targetCategory] : tour.categories;

    // Check if tournament has started (any live or finished matches in target categories)
    const existingMatches = allMatches.filter(
      (m) => m.tournamentId === tourId && (targetCategory ? m.category === targetCategory : true)
    );
    const hasStarted = existingMatches.some((m) => m.status === 'live' || m.status === 'finished');

    if (hasStarted && !force) {
      return {
        success: false,
        started: true,
        message: 'El torneo ya cuenta con partidos iniciados o finalizados. Se requiere confirmación expresa del organizador para regenerar cruces.',
      };
    }

    let totalGenerated = 0;
    const newMatchesToAdd: Match[] = [];

    for (const cat of categoriesToSchedule) {
      const catClubs = allClubs.filter((c) => c.tournamentId === tourId && c.category === cat);
      if (catClubs.length < 2) continue;

      const { matches: catFixtures } = generateRoundRobinFixtures(
        catClubs,
        tourId,
        cat,
        tour.venue,
        tour.startDate || new Date().toISOString().split('T')[0],
        tour.format === 'double_round'
      );

      newMatchesToAdd.push(...catFixtures);
      totalGenerated += catFixtures.length;
    }

    setAllMatches((prev) => {
      const preserved = prev.filter((m) => {
        if (m.tournamentId !== tourId) return true;
        if (targetCategory && m.category !== targetCategory) return true;
        if (force) {
          // preserve already played or in progress matches
          return m.status === 'live' || m.status === 'finished';
        }
        return false;
      });
      return [...preserved, ...newMatchesToAdd];
    });

    if (totalGenerated > 0) {
      const fixtureNotif = buildSystemNotification({
        tournamentId: tourId,
        title: `Sistema • Fixture Oficial Generado (${totalGenerated} Partidos)`,
        message: `Se han generado oficialmente ${totalGenerated} encuentros para el torneo "${tour.name}"${
          targetCategory ? ` en la categoría ${targetCategory}` : ''
        }.`,
        targetRole: 'all',
        targetClubId: 'ALL',
        priority: 'normal',
      });
      setNotifications((prev) => [fixtureNotif, ...prev]);
    }

    showToast(
      'Cruces Generados',
      `Se generaron ${totalGenerated} partidos oficiales (método del círculo con gestión de equipos libres).`,
      'match'
    );
    return {
      success: true,
      message: `Se programaron ${totalGenerated} partidos exitosamente.`,
      matchesCount: totalGenerated,
    };
  }, [activeTournament, tournaments, allMatches, allClubs, showToast]);

  // Notifications
  const sendLeagueNotification = useCallback((data: {
    title: string;
    message: string;
    category: LeagueNotification['category'];
    targetClubId: string;
    priority: LeagueNotification['priority'];
    targetRole?: LeagueNotification['targetRole'];
  }) => {
    const newNotif: LeagueNotification = {
      id: 'notif-' + Date.now(),
      tournamentId: activeTournament.id,
      title: data.title,
      message: data.message,
      category: data.category,
      targetClubId: data.targetClubId,
      targetRole: data.targetRole || 'all',
      priority: data.priority,
      sender: currentUser?.fullName || 'Comisión Organizadora TORNOW',
      timestamp: 'Ahora mismo',
      readBy: currentUser ? [currentUser.id] : [],
    };

    setNotifications((prev) => [newNotif, ...prev]);
    if (soundEnabled) playNotificationChime('announcement');
    showToast(data.title, data.message, data.category);
  }, [activeTournament.id, currentUser, soundEnabled, showToast]);

  const markNotificationRead = useCallback((id: string) => {
    const userId = currentUser?.id || 'guest';
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        if (n.readBy.includes(userId)) return n;
        return { ...n, readBy: [...n.readBy, userId] };
      })
    );
  }, [currentUser?.id]);

  const markAllNotificationsRead = useCallback(() => {
    const userId = currentUser?.id || 'guest';
    const visibleIds = new Set(visibleNotifications.map((n) => n.id));
    setNotifications((prev) =>
      prev.map((n) => {
        if (!visibleIds.has(n.id)) return n;
        if (n.readBy.includes(userId)) return n;
        return { ...n, readBy: [...n.readBy, userId] };
      })
    );
  }, [currentUser?.id, visibleNotifications]);

  const clearReadNotifications = useCallback(() => {
    const userId = currentUser?.id || 'guest';
    const visibleIds = new Set(visibleNotifications.map((n) => n.id));
    setNotifications((prev) =>
      prev.filter((n) => !(visibleIds.has(n.id) && n.readBy.includes(userId)))
    );
  }, [currentUser?.id, visibleNotifications]);

  // ---------------------------------------------------------------------------
  // SANCTIONS & ORGANIZER INBOX (TRIBUNAL DE DISCIPLINA)
  // ---------------------------------------------------------------------------
  const issuePlayerSanction = useCallback(
    (input: {
      clubId: string;
      playerId: string;
      reason: string;
      matchesSuspended: number;
      issuedBy?: string;
    }): { success: boolean; message: string; sanction?: PlayerSanction } => {
      const val = validateSanctionInput(input);
      if (!val.isValid) {
        return { success: false, message: val.error || 'Datos de sanción inválidos.' };
      }

      const targetClub = allClubs.find((c) => c.id === input.clubId);
      if (!targetClub) {
        return { success: false, message: 'Club no encontrado en el torneo.' };
      }

      const targetPlayer = targetClub.roster.find((p) => p.id === input.playerId);
      if (!targetPlayer) {
        return { success: false, message: 'Jugador no encontrado en la nómina del club.' };
      }

      const { sanction, playerPatch } = buildPlayerSanction({
        tournamentId: activeTournament.id,
        clubId: targetClub.id,
        clubName: targetClub.name,
        player: targetPlayer,
        reason: input.reason,
        matchesSuspended: input.matchesSuspended,
        issuedBy: input.issuedBy || currentUser?.fullName || 'Comité Organizador',
      });

      // 1. Update club roster so player appears as INHABILITADO immediately
      setAllClubs((prev) =>
        prev.map((club) => {
          if (club.id !== targetClub.id) return club;
          return {
            ...club,
            roster: club.roster.map((p) =>
              p.id === targetPlayer.id ? { ...p, ...playerPatch } : p
            ),
          };
        })
      );

      // 2. Append sanction to active tournament
      const existingSanctions = activeTournament.sanctions || [];
      updateTournament(activeTournament.id, {
        sanctions: [sanction, ...existingSanctions],
      });

      // 3. Send disciplinary notification to the club delegates
      const notif: LeagueNotification = {
        id: `notif-sanc-${Date.now()}`,
        tournamentId: activeTournament.id,
        title: `Sanción Oficial: #${sanction.playerDorsal} ${sanction.playerName} (${targetClub.name})`,
        message: `El Comité Organizador ha inhabilitado al jugador #${sanction.playerDorsal} ${sanction.playerName} por ${sanction.matchesSuspended} fecha(s). Motivo: ${sanction.reason}.`,
        category: 'disciplinaria',
        targetClubId: targetClub.id,
        targetRole: 'all',
        clubId: targetClub.id,
        clubName: targetClub.name,
        priority: 'urgente',
        sender: sanction.issuedBy,
        timestamp: 'Ahora mismo',
        readBy: currentUser ? [currentUser.id] : [],
      };
      setNotifications((prev) => [notif, ...prev]);
      if (soundEnabled) playNotificationChime('announcement');
      showToast(notif.title, notif.message, 'disciplinaria');

      return {
        success: true,
        message: `Jugador #${sanction.playerDorsal} ${sanction.playerName} inhabilitado por ${sanction.matchesSuspended} fecha(s).`,
        sanction,
      };
    },
    [allClubs, activeTournament, currentUser, updateTournament, soundEnabled, showToast]
  );

  const revokeOrUpdateSanction = useCallback(
    (sanctionId: string, status: 'resolved' | 'revoked', resolutionNote?: string) => {
      const existingSanctions = activeTournament.sanctions || [];
      const targetSanction = existingSanctions.find((s) => s.id === sanctionId);
      if (!targetSanction) return;

      const updatedSanctions = existingSanctions.map((s) =>
        s.id === sanctionId
          ? {
              ...s,
              status,
              appealResolution: resolutionNote || (status === 'revoked' ? 'Sanción levantada por el organizador' : 'Sanción cumplida'),
            }
          : s
      );

      updateTournament(activeTournament.id, { sanctions: updatedSanctions });

      // Re-enable player in club roster
      setAllClubs((prev) =>
        prev.map((club) => {
          if (club.id !== targetSanction.clubId) return club;
          return {
            ...club,
            roster: club.roster.map((p) =>
              p.id === targetSanction.playerId
                ? { ...p, isSuspended: false, suspendedMatchesRemaining: 0, sanctionReason: undefined }
                : p
            ),
          };
        })
      );

      const notif: LeagueNotification = {
        id: `notif-sanc-rev-${Date.now()}`,
        tournamentId: activeTournament.id,
        title: `Jugador Habilitado: #${targetSanction.playerDorsal} ${targetSanction.playerName}`,
        message: `El Comité Organizador ha actualizado el estado de la sanción de #${targetSanction.playerDorsal} ${targetSanction.playerName} (${targetSanction.clubName}). El jugador se encuentra habilitado para jugar.`,
        category: 'disciplinaria',
        targetClubId: targetSanction.clubId,
        targetRole: 'all',
        clubId: targetSanction.clubId,
        clubName: targetSanction.clubName,
        priority: 'alta',
        sender: currentUser?.fullName || 'Comité Organizador',
        timestamp: 'Ahora mismo',
        readBy: currentUser ? [currentUser.id] : [],
      };
      setNotifications((prev) => [notif, ...prev]);
      showToast(notif.title, notif.message, 'disciplinaria');
    },
    [activeTournament, updateTournament, currentUser, showToast]
  );

  const toggleAllowAppeals = useCallback(
    (tournamentId: string, allow: boolean) => {
      updateTournament(tournamentId, { allowSanctionAppeals: allow });
      showToast(
        allow ? 'Apelaciones Activadas' : 'Apelaciones Desactivadas',
        allow
          ? 'Los delegados de club ahora pueden presentar apelaciones ante sanciones.'
          : 'Se ha cerrado la recepción de apelaciones para delegados de club.',
        'sistema'
      );
    },
    [updateTournament, showToast]
  );

  const submitSanctionAppeal = useCallback(
    (sanctionId: string, appealText: string, senderName?: string): { success: boolean; message: string } => {
      const existingSanctions = activeTournament.sanctions || [];
      const targetSanction = existingSanctions.find((s) => s.id === sanctionId);
      if (!targetSanction) {
        return { success: false, message: 'No se encontró la sanción indicada.' };
      }

      const allowAppeals = activeTournament.allowSanctionAppeals !== false;
      const res = createSanctionAppeal({
        sanction: targetSanction,
        allowAppeals,
        appealText,
        senderName: senderName || currentUser?.fullName || `Delegado ${targetSanction.clubName}`,
      });

      if (!res.ok || !res.updatedSanction || !res.inboxMessage) {
        return { success: false, message: res.error || 'No se pudo enviar la apelación.' };
      }

      const updatedSanctions = existingSanctions.map((s) =>
        s.id === sanctionId ? res.updatedSanction! : s
      );
      const existingInbox = activeTournament.inboxMessages || [];

      updateTournament(activeTournament.id, {
        sanctions: updatedSanctions,
        inboxMessages: [res.inboxMessage, ...existingInbox],
      });

      // Notify Organizer
      const notif: LeagueNotification = {
        id: `notif-appeal-${Date.now()}`,
        tournamentId: activeTournament.id,
        title: `Nueva Apelación Recibida · ${targetSanction.clubName}`,
        message: `El delegado de ${targetSanction.clubName} presentó una apelación formal por la sanción de #${targetSanction.playerDorsal} ${targetSanction.playerName}. Revisa tu Bandeja de Entrada.`,
        category: 'disciplinaria',
        targetClubId: 'ALL',
        targetRole: 'organizer',
        clubId: targetSanction.clubId,
        clubName: targetSanction.clubName,
        priority: 'alta',
        sender: res.inboxMessage.senderName,
        timestamp: 'Ahora mismo',
        readBy: currentUser ? [currentUser.id] : [],
      };
      setNotifications((prev) => [notif, ...prev]);
      showToast('Apelación Enviada al Comité', 'El organizador revisará tu solicitud en su bandeja de entrada.', 'disciplinaria');

      return { success: true, message: 'Apelación enviada correctamente al Comité Organizador.' };
    },
    [activeTournament, currentUser, updateTournament, showToast]
  );

  const sendDelegateMessageToOrganizer = useCallback(
    (input: {
      clubId: string;
      senderName: string;
      subject: string;
      content: string;
      type?: 'mensaje_delegado' | 'consulta';
    }): { success: boolean; message: string } => {
      const clubObj = allClubs.find((c) => c.id === input.clubId);
      const cleanSubject = input.subject.trim();
      const cleanContent = input.content.trim();
      if (!cleanSubject || cleanContent.length < 5) {
        return { success: false, message: 'Completa el asunto y el mensaje (mínimo 5 caracteres).' };
      }

      const newMessage: DelegateMessage = {
        id: `msg-del-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tournamentId: activeTournament.id,
        clubId: input.clubId,
        clubName: clubObj?.name || 'Club Delegado',
        senderName: input.senderName.trim() || currentUser?.fullName || 'Delegado Oficial',
        type: input.type || 'mensaje_delegado',
        subject: cleanSubject,
        content: cleanContent,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      const existingInbox = activeTournament.inboxMessages || [];
      updateTournament(activeTournament.id, {
        inboxMessages: [newMessage, ...existingInbox],
      });

      const notif: LeagueNotification = {
        id: `notif-msg-${Date.now()}`,
        tournamentId: activeTournament.id,
        title: `Mensaje de Delegado · ${newMessage.clubName}`,
        message: `${newMessage.senderName}: "${cleanSubject}" — Disponible en tu Bandeja de Entrada.`,
        category: 'convocatoria',
        targetClubId: 'ALL',
        targetRole: 'organizer',
        clubId: newMessage.clubId,
        clubName: newMessage.clubName,
        priority: 'normal',
        sender: newMessage.senderName,
        timestamp: 'Ahora mismo',
        readBy: currentUser ? [currentUser.id] : [],
      };
      setNotifications((prev) => [notif, ...prev]);
      showToast('Mensaje Enviado', 'Tu mensaje fue recibido en la bandeja del organizador.', 'convocatoria');

      return { success: true, message: 'Mensaje enviado a la bandeja del organizador.' };
    },
    [allClubs, activeTournament, currentUser, updateTournament, showToast]
  );

  const replyToInboxMessage = useCallback(
    (
      messageId: string,
      decision: 'approved' | 'rejected' | 'replied',
      replyText: string
    ) => {
      const existingInbox = activeTournament.inboxMessages || [];
      const targetMsg = existingInbox.find((m) => m.id === messageId);
      if (!targetMsg) return;

      const existingSanctions = activeTournament.sanctions || [];
      const { updatedMessage, updatedSanctions, reEnabledPlayerId } = resolveOrganizerInboxMessage({
        message: targetMsg,
        decision,
        replyText,
        sanctions: existingSanctions,
      });

      const nextInbox = existingInbox.map((m) => (m.id === messageId ? updatedMessage : m));
      updateTournament(activeTournament.id, {
        inboxMessages: nextInbox,
        sanctions: updatedSanctions,
      });

      if (reEnabledPlayerId) {
        setAllClubs((prev) =>
          prev.map((club) => {
            if (club.id !== targetMsg.clubId) return club;
            return {
              ...club,
              roster: club.roster.map((p) =>
                p.id === reEnabledPlayerId
                  ? { ...p, isSuspended: false, suspendedMatchesRemaining: 0, sanctionReason: undefined }
                  : p
              ),
            };
          })
        );
      }

      const notif: LeagueNotification = {
        id: `notif-reply-${Date.now()}`,
        tournamentId: activeTournament.id,
        title:
          decision === 'approved'
            ? `Apelación Aprobada · ${targetMsg.clubName}`
            : decision === 'rejected'
            ? `Apelación Rechazada · ${targetMsg.clubName}`
            : `Respuesta del Organizador · ${targetMsg.clubName}`,
        message: `${updatedMessage.organizerReply}`,
        category: 'disciplinaria',
        targetClubId: targetMsg.clubId,
        targetRole: 'all',
        clubId: targetMsg.clubId,
        clubName: targetMsg.clubName,
        priority: 'alta',
        sender: currentUser?.fullName || 'Comité Organizador',
        timestamp: 'Ahora mismo',
        readBy: currentUser ? [currentUser.id] : [],
      };
      setNotifications((prev) => [notif, ...prev]);
      showToast(notif.title, notif.message, 'disciplinaria');
    },
    [activeTournament, updateTournament, currentUser, showToast]
  );

  // Venue Entrance Sheets Methods
  const saveVenueTemplate = useCallback(
    (template: VenueTemplate) => {
      setVenueTemplates((prev) => {
        const filtered = prev.filter((t) => t.id !== template.id);
        return [template, ...filtered];
      });

      const notif: LeagueNotification = {
        id: `notif-venue-${Date.now()}`,
        tournamentId: activeTournament.id,
        title: `Plantilla de Acceso a Recinto: ${template.venueName}`,
        message: `El organizador ha configurado la plantilla oficial de ingreso para ${template.venueName}. Recuerda subir la nómina de tu club a más tardar 1 día antes del partido.`,
        category: 'sistema',
        targetRole: 'club_admin',
        priority: 'alta',
        sender: currentUser?.fullName || 'Comité Organizador',
        timestamp: 'Ahora mismo',
        readBy: currentUser ? [currentUser.id] : [],
      };
      setNotifications((prev) => [notif, ...prev]);
      showToast(notif.title, notif.message, 'sistema');
    },
    [activeTournament, currentUser, showToast]
  );

  const submitClubVenueRoster = useCallback(
    (roster: MatchVenueRoster) => {
      const key = `${roster.matchId}-${roster.clubId}`;
      setMatchVenueRosters((prev) => ({
        ...prev,
        [key]: roster,
      }));

      const notif: LeagueNotification = {
        id: `notif-vr-${Date.now()}`,
        tournamentId: activeTournament.id,
        title: `Nómina de Ingreso Confirmada · ${roster.clubName}`,
        message: `${roster.clubName} ha confirmado su nómina oficial (${roster.attendees.length} personas) para el recinto ${roster.venue} (${roster.matchDate}).`,
        category: 'modificacion_nomina',
        targetRole: 'organizer',
        clubId: roster.clubId,
        clubName: roster.clubName,
        priority: 'normal',
        sender: currentUser?.fullName || roster.clubName,
        timestamp: 'Ahora mismo',
        readBy: currentUser ? [currentUser.id] : [],
      };
      setNotifications((prev) => [notif, ...prev]);
      showToast(notif.title, notif.message, 'modificacion_nomina');

      return { success: true, message: 'Nómina de ingreso registrada exitosamente.' };
    },
    [activeTournament, currentUser, showToast]
  );

  const getVenueRosterForMatch = useCallback(
    (matchId: string, clubId: string) => {
      return matchVenueRosters[`${matchId}-${clubId}`];
    },
    [matchVenueRosters]
  );

  const autoFillRosterForMatch = useCallback(
    (matchId: string, clubId: string): MatchVenueRoster => {
      const match = allMatches.find((m) => m.id === matchId) || matches.find((m) => m.id === matchId);
      const club = allClubs.find((c) => c.id === clubId) || clubs.find((c) => c.id === clubId);

      if (!club || !match) {
        throw new Error('Club o partido no encontrado.');
      }

      const attendees = autoFillClubVenueRoster(club, { excludeSuspended: true });

      const roster: MatchVenueRoster = {
        id: `mvr-${match.id}-${club.id}`,
        matchId: match.id,
        tournamentId: activeTournament.id,
        clubId: club.id,
        clubName: club.name,
        category: String(match.category || 'General'),
        venue: match.court || activeTournament.venue,
        matchDate: match.date,
        matchTime: match.time,
        round: match.round,
        attendees,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setMatchVenueRosters((prev) => ({
        ...prev,
        [`${match.id}-${club.id}`]: roster,
      }));

      return roster;
    },
    [allMatches, matches, allClubs, clubs, activeTournament]
  );

  // ---------------------------------------------------------------------------
  // USER FEEDBACK & ADMIN INBOX (VENTANA EMERGENTE CADA HORA + BANDEJA ADMIN)
  // ---------------------------------------------------------------------------
  const submitUserFeedback = useCallback(
    (input: {
      rating: number;
      category?: FeedbackCategory;
      comment: string;
      authorName?: string;
    }): { success: boolean; message: string } => {
      const val = validateFeedbackSubmission(input);
      if (!val.isValid) {
        return {
          success: false,
          message: val.error || 'Por favor verifica los datos de tu feedback.',
        };
      }

      const now = new Date();
      const formattedDate = `${now.toISOString().split('T')[0]} ${now
        .toTimeString()
        .slice(0, 5)}`;

      const resolvedAuthor =
        input.authorName && input.authorName.trim()
          ? val.cleanAuthorName
          : currentUser?.fullName || 'Visitante TorNow';

      const newFeedback: UserFeedbackItem = {
        id: `fb-${Date.now()}`,
        rating: val.cleanRating,
        category: val.cleanCategory,
        comment: val.cleanComment,
        authorName: resolvedAuthor,
        authorRole: currentUser?.role || 'visitante',
        authorEmail: currentUser?.email,
        tournamentId: activeTournament?.id,
        tournamentName: activeTournament?.name || 'Plataforma General TorNow',
        createdAt: formattedDate,
        status: 'nuevo',
      };

      setUserFeedbacks((prev) => [newFeedback, ...prev]);

      // Apply 1-hour general cookie & cache synchronization immediately
      syncHourlyFeedbackCookieAndCache(Date.now());

      showToast(
        '¡Gracias por tu Feedback!',
        'Tu opinión fue enviada a la Bandeja de Entrada de los Administradores.',
        'sistema'
      );

      return {
        success: true,
        message: 'Feedback enviado exitosamente a los administradores.',
      };
    },
    [currentUser, activeTournament, showToast]
  );

  const updateUserFeedbackStatus = useCallback(
    (
      feedbackId: string,
      status: UserFeedbackItem['status'],
      adminNote?: string
    ) => {
      const cleanNote =
        adminNote !== undefined ? sanitizeSafeInput(adminNote, 300) : undefined;
      setUserFeedbacks((prev) =>
        prev.map((item) =>
          item.id === feedbackId
            ? {
                ...item,
                status,
                adminNote: cleanNote !== undefined ? cleanNote : item.adminNote,
                reviewedAt: new Date().toISOString().split('T')[0],
              }
            : item
        )
      );
      showToast(
        'Bandeja Actualizada',
        'El estado del feedback fue actualizado en el panel de administración.',
        'admin'
      );
    },
    [showToast]
  );

  const deleteUserFeedback = useCallback(
    (feedbackId: string) => {
      setUserFeedbacks((prev) => prev.filter((item) => item.id !== feedbackId));
      showToast(
        'Feedback Eliminado',
        'El registro fue eliminado de la bandeja de entrada de administración.',
        'admin'
      );
    },
    [showToast]
  );

  const contextValue = useMemo<TournamentContextType>(
    () => ({
      tournaments,
      activeTournamentId,
      activeTournament,
      setActiveTournamentId,
      createTournament,
      updateTournament,
      toggleTournamentVisibility,
      deleteTournament,
      clubs,
      allClubs,
      matches,
      allMatches,
      users,
      invites,
      organizerKeys,
      currentUser,
      notifications,
      visibleNotifications,
      notificationPreferences,
      updateNotificationPreferences,
      standings,
      activeLiveMatchId,
      setActiveLiveMatchId,
      selectedCategory,
      setSelectedCategory,
      selectedGroup,
      setSelectedGroup,
      soundEnabled,
      setSoundEnabled,
      browserNotificationsEnabled,
      requestBrowserNotifications,
      activeToasts,
      dismissToast,
      unreadCount,
      login,
      loginWithGoogle,
      logout,
      changePassword,
      updateUserProfile,
      sessionHistory,
      closeOtherSessions,
      deleteUser,
      updateUserRole,
      createOrganizerKey,
      renewOrganizerKey,
      deleteOrganizerKey,
      toggleBlockOrganizerKey,
      submitKeyRenewalAppeal,
      validateOrganizerKey,
      redeemOrganizerKey,
      redeemAdditionalOrganizerKey,
      validateInviteKey,
      redeemInviteKey,
      generateNewInviteForClub,
      canCurrentUserEditRoster,
      addClub,
      deleteClub,
      updateFullRoster,
      addPlayerToClub,
      updatePlayerInClub,
      removePlayerFromClub,
      assignSpecialRole,
      updateClubStaff,
      updateClubSocialLinks,
      updateMatchSets,
      updateMatchDetails,
      createMatch,
      generateOfficialFixtures,
      sendLeagueNotification,
      markNotificationRead,
      markAllNotificationsRead,
      clearReadNotifications,
      issuePlayerSanction,
      revokeOrUpdateSanction,
      toggleAllowAppeals,
      submitSanctionAppeal,
      sendDelegateMessageToOrganizer,
      replyToInboxMessage,
      venueTemplates,
      matchVenueRosters,
      saveVenueTemplate,
      submitClubVenueRoster,
      getVenueRosterForMatch,
      autoFillRosterForMatch,
      userFeedbacks,
      submitUserFeedback,
      updateUserFeedbackStatus,
      deleteUserFeedback,
    }),
    [
      tournaments,
      activeTournamentId,
      activeTournament,
      setActiveTournamentId,
      createTournament,
      updateTournament,
      toggleTournamentVisibility,
      deleteTournament,
      clubs,
      allClubs,
      matches,
      allMatches,
      users,
      invites,
      organizerKeys,
      currentUser,
      notifications,
      visibleNotifications,
      notificationPreferences,
      updateNotificationPreferences,
      standings,
      activeLiveMatchId,
      selectedCategory,
      selectedGroup,
      soundEnabled,
      browserNotificationsEnabled,
      requestBrowserNotifications,
      activeToasts,
      dismissToast,
      unreadCount,
      login,
      loginWithGoogle,
      logout,
      changePassword,
      updateUserProfile,
      sessionHistory,
      closeOtherSessions,
      deleteUser,
      updateUserRole,
      createOrganizerKey,
      renewOrganizerKey,
      deleteOrganizerKey,
      toggleBlockOrganizerKey,
      submitKeyRenewalAppeal,
      validateOrganizerKey,
      redeemOrganizerKey,
      redeemAdditionalOrganizerKey,
      validateInviteKey,
      redeemInviteKey,
      generateNewInviteForClub,
      canCurrentUserEditRoster,
      addClub,
      deleteClub,
      updateFullRoster,
      addPlayerToClub,
      updatePlayerInClub,
      removePlayerFromClub,
      assignSpecialRole,
      updateClubStaff,
      updateClubSocialLinks,
      updateMatchSets,
      updateMatchDetails,
      createMatch,
      generateOfficialFixtures,
      sendLeagueNotification,
      markNotificationRead,
      markAllNotificationsRead,
      clearReadNotifications,
      issuePlayerSanction,
      revokeOrUpdateSanction,
      toggleAllowAppeals,
      submitSanctionAppeal,
      sendDelegateMessageToOrganizer,
      replyToInboxMessage,
      venueTemplates,
      matchVenueRosters,
      saveVenueTemplate,
      submitClubVenueRoster,
      getVenueRosterForMatch,
      autoFillRosterForMatch,
      userFeedbacks,
      submitUserFeedback,
      updateUserFeedbackStatus,
      deleteUserFeedback,
    ]
  );

  return (
    <TournamentContext.Provider value={contextValue}>
      {children}
    </TournamentContext.Provider>
  );
};

export const useTournament = () => {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
};
