export const OFFICIAL_CATEGORIES = [
  'Sub10',
  'Sub12',
  'Sub14',
  'Sub16',
  'Sub18',
  'Sub20',
  'Sub21',
  'TC (Todo Competidor)',
  'Máster (+30)',
] as const;

export type OfficialCategory = (typeof OFFICIAL_CATEGORIES)[number];
export type TournamentCategory = OfficialCategory | string;

export type Position = 'Armador' | 'Central' | 'Punta Receptor' | 'Opuesto' | 'Líbero';

export type SportType = 'volleyball' | 'football' | 'futsal' | 'basketball' | 'padel';

export type TournamentFormat =
  | 'round_robin' // Todos contra todos en tabla general
  | 'short_league_groups' // Liga corta con grupos (Fases + Playoffs)
  | 'playoffs_single' // Eliminación directa
  | 'double_round'; // Doble rueda (Ida y Vuelta)

export type OrganizerType = 'empresa' | 'persona_natural';

export type PlayoffStage = 'octavos' | 'cuartos' | 'semifinal' | 'final';

export interface PlayoffMatchup {
  id: string;
  stage: PlayoffStage;
  roundLabel: string; // e.g. "Octavos 1", "Cuartos 2", "Semifinal 1", "Gran Final"
  team1Label: string; // e.g. "1° Grupo A" o nombre de club
  team2Label: string; // e.g. "2° Grupo B" o nombre de club
  team1ClubId?: string;
  team2ClubId?: string;
  score1?: number;
  score2?: number;
  winnerClubId?: string;
  court?: string;
  date?: string;
  time?: string;
}

export interface TournamentRegulations {
  title: string;
  content: string; // Bases oficiales y reglamento
  lastUpdated: string;
  fileAttachmentName?: string;
}

export interface TournamentPlayoffConfig {
  enabled: boolean;
  startingStage: PlayoffStage; // Desde octavos, cuartos, semifinal o final
  matchups: PlayoffMatchup[];
}

export interface TournamentRules {
  pointsWin: number;
  pointsLoss: number;
  pointsTie: number;
  setsToWin?: number;
  pointsPerSet?: number;
  matchDurationMinutes?: number;
}

export interface PlayerSanction {
  id: string;
  tournamentId: string;
  clubId: string;
  clubName: string;
  playerId: string;
  playerName: string;
  playerDorsal: number;
  reason: string; // Detalle reglamentario de la sanción
  matchesSuspended: number; // Cantidad de fechas de inhabilitación
  matchesServed: number; // Fechas cumplidas
  status: 'active' | 'appealed' | 'resolved' | 'revoked';
  issuedBy: string; // Comité Organizador / Organizador
  createdAt: string;
  appealText?: string;
  appealDate?: string;
  appealResolution?: string;
}

export interface DelegateMessage {
  id: string;
  tournamentId: string;
  clubId: string;
  clubName: string;
  senderName: string;
  type: 'apelacion' | 'mensaje_delegado' | 'consulta';
  subject: string;
  content: string;
  sanctionId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'replied';
  organizerReply?: string;
  createdAt: string;
}

export interface TournamentSponsor {
  id: string;
  name: string;
  logoUrl?: string;
  websiteUrl?: string;
}

export interface Tournament {
  id: string;
  name: string;
  organizerUserId?: string; // ID del usuario organizador dueño del torneo
  organizerName: string;
  organizerType: OrganizerType; // 'empresa' | 'persona_natural'
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
  groups?: string[]; // e.g. ['Grupo A', 'Grupo B']
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  venue: string; // Recinto deportivo principal
  secondaryVenues?: string[];
  description?: string;
  bannerColor?: string; // hex
  themeGradient?: string;
  logoUrl?: string;
  status: 'activo' | 'proximo' | 'finalizado' | 'borrador';
  visibility?: 'public' | 'hidden'; // Público u oculto validado por el organizador
  isValidatedByOrganizer?: boolean; // Confirmación/validación oficial del organizador
  validatedAt?: string;
  rules: TournamentRules;
  allowRosterEditing: boolean; // ¿El organizador permite a los delegados modificar nómina?
  allowSanctionAppeals?: boolean; // ¿El organizador permite apelaciones de sanciones a los delegados?
  sanctions?: PlayerSanction[]; // Registro oficial de sanciones del torneo
  inboxMessages?: DelegateMessage[]; // Bandeja de entrada de apelaciones y mensajes de delegados
  regulations?: TournamentRegulations; // Bases oficiales y reglamento del torneo
  playoffs?: TournamentPlayoffConfig; // Cruces de etapas finales
  requiresVenueSheet?: boolean; // ¿El torneo requiere planilla de ingreso al recinto?
  venueSheetTemplatePending?: boolean; // ¿El organizador aún no tiene la plantilla pero la subirá más adelante?
  venueSheetTemplateFileName?: string; // Nombre del archivo de plantilla subido al crear o configurar el torneo
  sponsors?: TournamentSponsor[]; // Auspiciadores oficiales del torneo (logo y/o nombre)
  isDemo?: boolean; // Torneo demo limitado creado por usuario básico
  createdAt: string;
}

export interface Player {
  id: string;
  clubId: string;
  dorsal: number; // Número de camiseta
  name: string; // Nombre
  paternalSurname?: string; // Apellido Paterno
  maternalSurname?: string; // Apellido Materno
  rut?: string; // RUT
  birthDate?: string; // Fecha de nacimiento opcional
  phone?: string; // Teléfono opcional
  position: Position;
  isCaptain: boolean;
  isLibero: boolean;
  liberoType?: 'principal' | 'secundario';
  isSuspended?: boolean; // Jugador inhabilitado por sanción
  suspendedMatchesRemaining?: number; // Fechas restantes de suspensión
  sanctionReason?: string; // Motivo de la sanción activa
}

export type StaffMemberRole = 'entrenador' | 'asistente' | 'analista';

export interface StaffMember {
  id: string;
  clubId: string;
  role: StaffMemberRole; // 'entrenador' | 'asistente' | 'analista'
  name: string;
  paternalSurname?: string;
  maternalSurname?: string;
  rut?: string;
  phone?: string;
  dorsal?: number; // Número de camiseta o credencial técnica
}

export interface CoachStaff {
  headCoach: string;
  assistantCoach: string;
  analyst?: string;
  members?: StaffMember[];
}

// Clave única para delegados de club
export interface ClubInvite {
  id: string; // The unique key, e.g. "INV-TORNOW-7X2K"
  tournamentId?: string;
  clubId: string;
  clubName: string;
  category: TournamentCategory;
  recipientEmail: string;
  recipientName: string;
  recipientPhone?: string;
  createdAt: string;
  status: 'pending' | 'redeemed';
  redeemedByUserId?: string;
  redeemedByUsername?: string;
  redeemedAt?: string;
}

export type KeyDurationUnit = 'days' | 'months' | 'annual';

// Clave única otorgada por Administradores a Organizadores (Temporal: días, meses o anual)
export interface OrganizerKey {
  id: string; // e.g. "KEY-ORG-TORNOW-8841"
  tournamentName?: string; // Nombre del torneo para el cual se emite la Key
  organizerName: string;
  organizerEmail: string;
  organizerPhone?: string;
  notes?: string;
  createdAt: string;
  expiresAt?: string; // Fecha de vencimiento de la Key temporal
  trialDays?: number; // Días totales de vigencia
  durationUnit?: KeyDurationUnit; // 'days' | 'months' | 'annual'
  durationValue?: number; // Cantidad de días, meses o años
  renewedAt?: string; // Fecha de última renovación
  renewalCount?: number; // Número de veces que se ha renovado
  isBlocked?: boolean; // Si el administrador o el sistema bloqueó la Key por falta de renovación
  blockedReason?: 'non_renewal' | 'manual_admin';
  gracePeriodStartAt?: string; // Inicio de la cuenta regresiva de 7 días antes de eliminar key y torneo
  renewalAppealSubmittedAt?: string; // Si el organizador envió solicitud de renovación a soporte
  status: 'pending' | 'redeemed' | 'blocked';
  redeemedByUserId?: string;
  redeemedByUsername?: string;
  redeemedAt?: string;
}

export interface ClubSocialLinks {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  twitter?: string;
  website?: string;
}

export interface Club {
  id: string;
  tournamentId?: string;
  group?: string; // Para torneos con grupos (Grupo A, Grupo B, etc.)
  name: string;
  shortName: string;
  color: string;
  secondaryColor: string;
  category: TournamentCategory;
  managerUsername: string;
  managerName: string;
  managerEmail: string;
  managerPhone?: string;
  homeCourt: string;
  staff: CoachStaff;
  roster: Player[];
  inviteKey?: string;
  socialLinks?: ClubSocialLinks; // Redes sociales públicas del club
}

export type MatchStatus = 'scheduled' | 'live' | 'finished';

export interface Match {
  id: string;
  tournamentId?: string;
  group?: string;
  round: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  court: string;
  category: TournamentCategory;
  homeTeamId: string;
  awayTeamId: string;
  status: MatchStatus; // 'scheduled' | 'live' ('En juego') | 'finished'
  homeSetsWon: number; // Sets ganados o goles local
  awaySetsWon: number; // Sets ganados o goles visita
  homeScore?: number;
  awayScore?: number;
  winnerId?: string;
  refereeMain?: string;
  youtubeLiveUrl?: string; // Link opcional de transmisión en vivo por YouTube
}

export interface StandingRow {
  clubId: string;
  clubName: string;
  shortName: string;
  category: TournamentCategory;
  group?: string;
  played: number; // PJ
  won: number; // PG
  lost: number; // PP
  tied?: number; // PE
  setsFor: number; // SF o Goles a favor
  setsAgainst: number; // SC o Goles en contra
  diffSets: number; // DS o Dif Gol
  pts: number; // Ptos
  form: ('W' | 'L' | 'D')[];
}

export interface Standing {
  clubId: string;
  played: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  pointsWon: number;
  pointsLost: number;
  setsRatio: number;
  pointsRatio: number;
  points: number;
}

export type UserRole = 'super_admin' | 'organizer' | 'club_admin' | 'usuario';

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  clubId?: string; // Para delegados de club
  organizerTournamentIds?: string[]; // IDs de torneos gestionados por el organizador
  email: string;
  phone?: string;
  inviteKeyUsed?: string;
  organizerKeyUsed?: string;
  tournamentQuota?: number; // Cantidad de torneos que puede crear (1 por key)
  additionalOrganizerKeys?: string[]; // Claves adicionales canjeadas por el organizador
  createdAt?: string;
}

export type NotificationCategory =
  | 'sistema'
  | 'marcador'
  | 'modificacion_nomina'
  | 'cambio_horario'
  | 'convocatoria'
  | 'disciplinaria'
  | 'circular_general';

export interface NotificationPreferences {
  sistema: boolean;
  marcador: boolean;
  modificacion_nomina: boolean;
  cambio_horario: boolean;
  oficiales: boolean;
}

export interface LeagueNotification {
  id: string;
  tournamentId?: string;
  title: string;
  message: string;
  category: NotificationCategory;
  targetClubId?: string | 'ALL';
  targetRole?: 'organizer' | 'club_admin' | 'all';
  targetUserId?: string;
  clubId?: string;
  clubName?: string;
  isSystemGlobal?: boolean;
  priority: 'normal' | 'alta' | 'urgente';
  sender: string;
  timestamp: string;
  readBy: string[];
  matchId?: string;
}

export interface LoginSessionRecord {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  role: UserRole;
  device: string;
  ipLocation: string;
  loginAt: string;
  lastActiveAt: string;
  isCurrentSession: boolean;
  status: 'active' | 'closed';
}

export type FeedbackCategory = 'sugerencia' | 'experiencia' | 'error' | 'elogio';

export interface UserFeedbackItem {
  id: string;
  rating: number; // 1 to 5
  category: FeedbackCategory;
  comment: string;
  authorName: string;
  authorRole: UserRole | 'visitante';
  authorEmail?: string;
  tournamentId?: string;
  tournamentName?: string;
  createdAt: string;
  status: 'nuevo' | 'leido' | 'destacado' | 'archivado';
  adminNote?: string;
  reviewedAt?: string;
}

