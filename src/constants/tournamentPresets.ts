import { SportType, TournamentFormat, OrganizerType, TournamentRules, PlayoffStage, OFFICIAL_CATEGORIES } from '../types';

export interface SportConfig {
  id: SportType;
  name: string;
  emoji: string;
  badge: string;
  description: string;
  defaultCategories: string[];
  rules: TournamentRules;
  scoreTerm: string;
  scoringSummary: string;
}

export const SPORT_CONFIGS: Record<SportType, SportConfig> = {
  volleyball: {
    id: 'volleyball',
    name: 'Voleibol',
    emoji: '🏐',
    badge: 'Vóley',
    description: 'Sets al mejor de 3 o 5 sets. 25 puntos por set (tie-break a 15). Diferencia de 2 puntos.',
    defaultCategories: [...OFFICIAL_CATEGORIES],
    rules: {
      pointsWin: 3,
      pointsLoss: 0,
      pointsTie: 0,
      setsToWin: 2,
      pointsPerSet: 25,
    },
    scoreTerm: 'Sets',
    scoringSummary: '3 pts por victoria 3-0/3-1 o 2-0. 2 pts por 3-2 o 2-1. 1 pt derrota por tie-break.',
  },
  football: {
    id: 'football',
    name: 'Fútbol / Futbolito 7',
    emoji: '⚽',
    badge: 'Fútbol',
    description: 'Fútbol 11, Futbolito 7 u 8. Tiempos de 25 o 45 minutos. Puntuación clásica con diferencia de goles.',
    defaultCategories: [...OFFICIAL_CATEGORIES],
    rules: {
      pointsWin: 3,
      pointsLoss: 0,
      pointsTie: 1,
      matchDurationMinutes: 50,
    },
    scoreTerm: 'Goles',
    scoringSummary: '3 pts por victoria, 1 pt por empate, 0 pts por derrota.',
  },
  futsal: {
    id: 'futsal',
    name: 'Futsal FIFA',
    emoji: '🥅',
    badge: 'Futsal',
    description: 'Fútbol sala 5 vs 5 en cancha techada. Tiempos cronometrados con acumulación de faltas.',
    defaultCategories: [...OFFICIAL_CATEGORIES],
    rules: {
      pointsWin: 3,
      pointsLoss: 0,
      pointsTie: 1,
      matchDurationMinutes: 40,
    },
    scoreTerm: 'Goles',
    scoringSummary: '3 pts por victoria, 1 pt por empate, 0 pts por derrota.',
  },
  basketball: {
    id: 'basketball',
    name: 'Básquetbol',
    emoji: '🏀',
    badge: 'Básquet',
    description: '4 cuartos de 10 o 12 minutos. Puntuación estándar FIBA (2 puntos victoria, 1 por presentación).',
    defaultCategories: [...OFFICIAL_CATEGORIES],
    rules: {
      pointsWin: 2,
      pointsLoss: 1,
      pointsTie: 0,
      matchDurationMinutes: 40,
    },
    scoreTerm: 'Puntos',
    scoringSummary: '2 pts por partido ganado, 1 pt por partido perdido jugado.',
  },
  padel: {
    id: 'padel',
    name: 'Pádel',
    emoji: '🎾',
    badge: 'Pádel',
    description: 'Torneo por parejas. Al mejor de 3 sets (games a 6 con punto de oro o ventaja y tie-break).',
    defaultCategories: [...OFFICIAL_CATEGORIES],
    rules: {
      pointsWin: 2,
      pointsLoss: 0,
      pointsTie: 0,
      setsToWin: 2,
    },
    scoreTerm: 'Sets',
    scoringSummary: '2 pts por triunfo, 0 pts por derrota.',
  },
};

export interface FormatConfig {
  id: TournamentFormat;
  title: string;
  shortLabel: string;
  badge: string;
  description: string;
  recommendedFor: string;
  hasGroups: boolean;
  defaultGroups: string[];
}

export const FORMAT_CONFIGS: Record<TournamentFormat, FormatConfig> = {
  short_league_groups: {
    id: 'short_league_groups',
    title: 'Liga Corta con Grupos (Fases + Playoffs)',
    shortLabel: 'Fase de Grupos',
    badge: 'Grupos + Finales',
    description: 'Los clubes se dividen en Grupo A, Grupo B (o más). Cada grupo juega su fase y los mejores avanzan a semifinales o cuartos.',
    recommendedFor: 'Torneos masivos de 8 a 32 equipos con tiempo acotado.',
    hasGroups: true,
    defaultGroups: ['Grupo A', 'Grupo B'],
  },
  round_robin: {
    id: 'round_robin',
    title: 'Todos contra Todos en Tabla General (Round-Robin)',
    shortLabel: 'Tabla General',
    badge: 'Liga Regular',
    description: 'Todos los equipos de la categoría se enfrentan entre sí en una sola tabla continua.',
    recommendedFor: 'Ligas oficiales, torneos de apertura/clausura con fixture regular.',
    hasGroups: false,
    defaultGroups: [],
  },
  playoffs_single: {
    id: 'playoffs_single',
    title: 'Eliminación Directa (Playoffs / Bracket)',
    shortLabel: 'Eliminación Directa',
    badge: 'Cuadro KO',
    description: 'Cuadro de llaves clásico (Octavos, Cuartos, Semifinal y Gran Final).',
    recommendedFor: 'Copas relámpago, torneos de fin de semana o pádel.',
    hasGroups: false,
    defaultGroups: [],
  },
  double_round: {
    id: 'double_round',
    title: 'Doble Rueda (Ida y Vuelta)',
    shortLabel: 'Ida y Vuelta',
    badge: 'Temporada Completa',
    description: 'Cada equipo juega contra todos los demás en dos oportunidades (local y visita).',
    recommendedFor: 'Ligas anuales o torneos federados de larga duración.',
    hasGroups: false,
    defaultGroups: [],
  },
};

export interface OrganizerTypeConfig {
  id: OrganizerType;
  title: string;
  subtitle: string;
  example: string;
}

export const ORGANIZER_TYPES: OrganizerTypeConfig[] = [
  {
    id: 'empresa',
    title: 'Empresa / Organización / Club',
    subtitle: 'Club deportivo, productora, colegio, federación o empresa con personería jurídica.',
    example: 'Ej: Club Deportivo Israelita, Productora Global Sports SpA, Colegio San Ignacio',
  },
  {
    id: 'persona_natural',
    title: 'Organizador Particular (Persona Natural)',
    subtitle: 'Organizador individual, árbitro independiente, profesor o coordinador de liga.',
    example: 'Ej: Rodrigo Valenzuela, Camilo Morales (Coordinador Deportivo)',
  },
];

export const PLAYOFF_STAGE_OPTIONS: { id: PlayoffStage; label: string; matchesCount: number }[] = [
  { id: 'octavos', label: 'Octavos de Final (16 clasificados)', matchesCount: 8 },
  { id: 'cuartos', label: 'Cuartos de Final (8 clasificados)', matchesCount: 4 },
  { id: 'semifinal', label: 'Semifinales (4 clasificados)', matchesCount: 2 },
  { id: 'final', label: 'Gran Final Directa (2 clasificados)', matchesCount: 1 },
];

export const DEFAULT_REGULATIONS_TEMPLATE = `# BASES Y REGLAMENTO OFICIAL DEL TORNEO

## 1. DISPOSICIONES GENERALES
El presente reglamento rige el desarrollo del campeonato oficial. La participación implica el conocimiento y aceptación irrestricta de estas normas por parte de clubes, dirigentes, entrenadores y jugadores.

## 2. INSCRIPCIÓN Y NÓMINAS DE JUGADORES
- Cada club tiene una Clave Única otorgada por la Organización para registrar su plantilla oficial.
- Las nóminas quedarán cerradas según el plazo fijado por la Organización. Solo se permitirán modificaciones si el Organizador mantiene habilitada la edición de nóminas.
- Todo jugador deberá estar debidamente registrado con su nombre completo, dorsal y documento de identidad antes de ingresar a la cancha.

## 3. SISTEMA DE PUNTUACIÓN Y CLASIFICACIÓN
- Partidos ganados, empatados o perdidos según las reglas específicas de la disciplina.
- En caso de empate en la tabla de posiciones general o de grupos, se aplicarán los siguientes criterios sucesivos:
  1. Mayor cantidad de puntos acumulados.
  2. Mayor cantidad de partidos ganados.
  3. Diferencia de gol o diferencia de sets.
  4. Mayor cantidad de goles o sets a favor.
  5. Resultado del enfrentamiento directo entre los clubes empatados.

## 4. ETAPAS FINALES Y CRUCES DE PLAYOFFS
- Los clasificados a las rondas eliminatorias (Octavos, Cuartos, Semifinales o Final) jugarán según el cuadro y cruces definidos por la Organización.
- En partidos de eliminación directa, en caso de empate se procederá a definición por penales o set de desempate (según corresponda a la disciplina).

## 5. DISCIPLINA Y FAIR PLAY
- Se sancionará cualquier conducta antideportiva, agresión verbal o física.
- El tribunal de disciplina de la Organización resolverá fallos inapelables ante infracciones graves.
`;
