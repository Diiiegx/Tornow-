import React, { useState, useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import {
  Trophy,
  Sliders,
  Calendar,
  FileSpreadsheet,
  FileText,
  Key,
  Shield,
  Plus,
  Save,
  CheckCircle2,
  Clock,
  Radio,
  ExternalLink,
  Copy,
  Check,
  Building,
  Users,
  MessageCircle,
  AlertCircle,
  Lock,
  Unlock,
  ChevronDown,
  Trash2,
  Send,
  Sparkles,
  Share2,
  Globe,
  CalendarDays,
  BarChart3,
  X,
  RefreshCw,
  EyeOff,
  Building2,
  Play,
  VideoOff,
  Mail,
  Award,
  Image as ImageIcon,
} from 'lucide-react';
import {
  TournamentCategory,
  PlayoffStage,
  PlayoffMatchup,
  TournamentPlayoffConfig,
  TournamentRegulations,
  TournamentSponsor,
  MatchStatus,
  OFFICIAL_CATEGORIES,
  Standing,
} from '../types';
import { PlayoffNodeGraph } from './PlayoffNodeGraph';
import { SanctionsAndInboxPanel } from './SanctionsAndInboxPanel';
import { DEFAULT_REGULATIONS_TEMPLATE } from '../constants/tournamentPresets';
import { ExcelRosterModal } from './ExcelRosterModal';
import { VenueEntranceModal } from './VenueEntranceModal';
import { AdaptiveMenuSlider } from './AdaptiveMenuSlider';
import {
  validateHumanReadableText,
  validateTournamentName,
  cleanTournamentString,
  MIN_TOURNAMENT_NAME_LENGTH,
  MAX_TOURNAMENT_NAME_LENGTH,
} from '../utils/textValidation';
import { calculateKeyTrialCountdown } from '../logic/venueEntranceEngine';
import { validateYoutubeUrl, sanitizeSafeInput } from '../utils/securityShield';

interface OrganizerDashboardViewProps {
  onOpenLiveScore?: (matchId: string) => void;
  onNavigateToClub?: (clubId: string) => void;
  onOpenCreateTournament?: () => void;
}

export const OrganizerDashboardView: React.FC<OrganizerDashboardViewProps> = ({
  onOpenLiveScore,
  onNavigateToClub,
  onOpenCreateTournament,
}) => {
  const {
    activeTournament,
    updateTournament,
    toggleTournamentVisibility,
    tournaments,
    setActiveTournamentId,
    matches,
    clubs,
    invites,
    generateNewInviteForClub,
    addClub,
    deleteClub,
    deleteTournament,
    updateMatchSets,
    updateMatchDetails,
    createMatch,
    generateOfficialFixtures,
    currentUser,
    organizerKeys,
    submitKeyRenewalAppeal,
    standings,
  } = useTournament();

  const activeOrganizerKey = useMemo(() => {
    if (!currentUser) return organizerKeys[0];
    return (
      organizerKeys.find(
        (k) =>
          k.id === currentUser.organizerKeyUsed ||
          k.redeemedByUserId === currentUser.id ||
          (currentUser.additionalOrganizerKeys || []).includes(k.id)
      ) || organizerKeys[0]
    );
  }, [currentUser, organizerKeys]);

  const organizerTrialInfo = useMemo(() => {
    return calculateKeyTrialCountdown({
      createdAt: activeOrganizerKey?.createdAt || activeTournament?.createdAt,
      expiresAt: activeOrganizerKey?.expiresAt,
      trialDays: activeOrganizerKey?.trialDays || 30,
      isBlocked: activeOrganizerKey?.isBlocked || false,
      gracePeriodStartAt: activeOrganizerKey?.gracePeriodStartAt,
      renewalAppealSubmittedAt: activeOrganizerKey?.renewalAppealSubmittedAt,
    });
  }, [activeOrganizerKey, activeTournament?.createdAt]);

  // If the organizer key is expired or blocked for non-renewal (and user is not super_admin), lock the panel
  const isOrganizerPanelBlocked =
    currentUser?.role !== 'super_admin' && organizerTrialInfo.isPanelLockedForNonRenewal;

  const [renewalAppealNote, setRenewalAppealNote] = useState('');
  const [renewalAppealFeedback, setRenewalAppealFeedback] = useState<string | null>(null);

  const formattedStandings: Standing[] = useMemo(() => {
    return standings.map((s) => ({
      clubId: s.clubId,
      played: s.played,
      wins: s.won,
      losses: s.lost,
      setsWon: s.setsFor,
      setsLost: s.setsAgainst,
      pointsWon: s.setsFor * 25,
      pointsLost: s.setsAgainst * 21,
      setsRatio: s.setsAgainst > 0 ? Number((s.setsFor / s.setsAgainst).toFixed(2)) : s.setsFor,
      pointsRatio: 1,
      points: s.pts,
    }));
  }, [standings]);

  // Confirmation modal state for regenerating fixtures once tournament has started
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [regenerateMessage, setRegenerateMessage] = useState('');

  // Active section tab within Organizer Dashboard (default to 'invites' so Club Creation, Club Keys & Player Registration are immediately visible!)
  const [activeTab, setActiveTab] = useState<'matches' | 'playoffs' | 'sanctions' | 'regulations' | 'invites' | 'settings'>('invites');
  const [registrationClubId, setRegistrationClubId] = useState<string | null>(null);
  const [showVenueModal, setShowVenueModal] = useState(false);

  // Copied feedback helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Share Tournament Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedShareType, setCopiedShareType] = useState<string | null>(null);

  const handleCopyShare = (url: string, type: string) => {
    navigator.clipboard.writeText(url);
    setCopiedShareType(type);
    setTimeout(() => setCopiedShareType(null), 2500);
  };

  const handleNativeShare = async (title: string, text: string, url: string) => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        handleCopyShare(url, 'native');
      }
    } else {
      handleCopyShare(url, 'native');
    }
  };

  // 1. Matches / Results Quick Edit State
  const [selectedRound, setSelectedRound] = useState<string>('ALL');
  const [confirmDeleteClubId, setConfirmDeleteClubId] = useState<string | null>(null);
  const rounds = useMemo(() => Array.from(new Set(matches.map((m) => m.round))), [matches]);
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (selectedRound !== 'ALL' && m.round !== selectedRound) return false;
      return true;
    });
  }, [matches, selectedRound]);

  // Modal to quickly add match
  const [showAddMatchModal, setShowAddMatchModal] = useState(false);
  const [newMatchRound, setNewMatchRound] = useState('Jornada 1');
  const [newMatchDate, setNewMatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [newMatchTime, setNewMatchTime] = useState('18:00');
  const [newMatchCourt, setNewMatchCourt] = useState(activeTournament.venue || 'Cancha Central');
  const [newMatchCategory, setNewMatchCategory] = useState<TournamentCategory>(activeTournament.categories?.[0] || 'GENERAL');
  const [newMatchHomeId, setNewMatchHomeId] = useState(clubs[0]?.id || '');
  const [newMatchAwayId, setNewMatchAwayId] = useState(clubs[1]?.id || '');
  const [newMatchYoutubeUrl, setNewMatchYoutubeUrl] = useState('');
  const [matchYoutubeError, setMatchYoutubeError] = useState<string | null>(null);

  // 2. Regulations State
  const [regulationsTitle, setRegulationsTitle] = useState(
    activeTournament.regulations?.title || `Bases Oficiales: ${activeTournament.name}`
  );
  const [regulationsContent, setRegulationsContent] = useState(
    activeTournament.regulations?.content || DEFAULT_REGULATIONS_TEMPLATE
  );
  const [regulationsFile, setRegulationsFile] = useState(
    activeTournament.regulations?.fileAttachmentName || 'Bases_Oficiales_Tornow.pdf'
  );
  const [regulationsSaved, setRegulationsSaved] = useState(false);

  // 3. Playoffs Config State
  const initialPlayoffs = activeTournament.playoffs || {
    enabled: true,
    startingStage: 'cuartos',
    matchups: [
      {
        id: 'pl-1',
        stage: 'cuartos',
        roundLabel: 'Cuartos 1',
        team1Label: '1° Grupo A',
        team2Label: '4° Grupo B',
        score1: 0,
        score2: 0,
      },
      {
        id: 'pl-2',
        stage: 'cuartos',
        roundLabel: 'Cuartos 2',
        team1Label: '2° Grupo B',
        team2Label: '3° Grupo A',
        score1: 0,
        score2: 0,
      },
      {
        id: 'pl-3',
        stage: 'cuartos',
        roundLabel: 'Cuartos 3',
        team1Label: '1° Grupo B',
        team2Label: '4° Grupo A',
        score1: 0,
        score2: 0,
      },
      {
        id: 'pl-4',
        stage: 'cuartos',
        roundLabel: 'Cuartos 4',
        team1Label: '2° Grupo A',
        team2Label: '3° Grupo B',
        score1: 0,
        score2: 0,
      },
    ],
  };

  const [playoffsConfig, setPlayoffsConfig] = useState<TournamentPlayoffConfig>(initialPlayoffs);
  const [playoffsSaved, setPlayoffsSaved] = useState(false);

  // 4. Add Club & Key Generator State
  const [showAddClubModal, setShowAddClubModal] = useState(false);
  const [showInlineClubForm, setShowInlineClubForm] = useState(true);
  const [newClubName, setNewClubName] = useState('');
  const [newClubShortName, setNewClubShortName] = useState('');
  const [newClubCategory, setNewClubCategory] = useState<TournamentCategory>(activeTournament.categories?.[0] || 'Sub16');
  const [newClubGroup, setNewClubGroup] = useState<string>(activeTournament.groups?.[0] || 'Grupo A');
  const [newClubColor, setNewClubColor] = useState('#0052fe');
  const [newClubManagerName, setNewClubManagerName] = useState('');
  const [newClubManagerEmail, setNewClubManagerEmail] = useState('');
  const [newClubManagerPhone, setNewClubManagerPhone] = useState('');
  const [newClubHeadCoach, setNewClubHeadCoach] = useState('');
  const [clubFormError, setClubFormError] = useState<string | null>(null);
  const [lastCreatedClubInvite, setLastCreatedClubInvite] = useState<{
    clubId: string;
    clubName: string;
    inviteKey: string;
    inviteLink: string;
  } | null>(null);

  // 5. Tournament General Settings Edit State
  const [editTourName, setEditTourName] = useState(activeTournament.name);
  const [editStartDate, setEditStartDate] = useState(activeTournament.startDate);
  const [editEndDate, setEditEndDate] = useState(activeTournament.endDate);
  const [editDescription, setEditDescription] = useState(activeTournament.description || '');
  const [editCategories, setEditCategories] = useState<string[]>(activeTournament.categories || ['TC (Todo Competidor)']);
  const [editPointsWin, setEditPointsWin] = useState<number>(activeTournament.rules?.pointsWin ?? 3);
  const [editPointsTie, setEditPointsTie] = useState<number>(activeTournament.rules?.pointsTie ?? 1);
  const [editPointsLoss, setEditPointsLoss] = useState<number>(activeTournament.rules?.pointsLoss ?? 0);
  const [editSponsors, setEditSponsors] = useState<TournamentSponsor[]>(activeTournament.sponsors || []);
  const [newSponsorName, setNewSponsorName] = useState('');
  const [newSponsorLogoUrl, setNewSponsorLogoUrl] = useState('');
  const [newSponsorWebsiteUrl, setNewSponsorWebsiteUrl] = useState('');
  const [settingsSavedMsg, setSettingsSavedMsg] = useState(false);
  const [confirmDeleteThisTour, setConfirmDeleteThisTour] = useState(false);

  // Sync settings state when activeTournament changes
  React.useEffect(() => {
    setEditTourName(activeTournament.name);
    setEditStartDate(activeTournament.startDate);
    setEditEndDate(activeTournament.endDate);
    setEditDescription(activeTournament.description || '');
    setEditCategories(activeTournament.categories || ['TC (Todo Competidor)']);
    setEditPointsWin(activeTournament.rules?.pointsWin ?? 3);
    setEditPointsTie(activeTournament.rules?.pointsTie ?? 1);
    setEditPointsLoss(activeTournament.rules?.pointsLoss ?? 0);
    setEditSponsors(activeTournament.sponsors || []);
    setNewClubCategory(activeTournament.categories?.[0] || 'Sub16');
  }, [activeTournament.id]);

  // Toggle Roster Editing Permission
  const handleToggleRosterEditing = () => {
    const newValue = !activeTournament.allowRosterEditing;
    updateTournament(activeTournament.id, { allowRosterEditing: newValue });
  };

  // Save Regulations
  const handleSaveRegulations = () => {
    const updatedRegulations: TournamentRegulations = {
      title: regulationsTitle,
      content: regulationsContent,
      lastUpdated: new Date().toISOString().split('T')[0],
      fileAttachmentName: regulationsFile,
    };
    updateTournament(activeTournament.id, { regulations: updatedRegulations });
    setRegulationsSaved(true);
    setTimeout(() => setRegulationsSaved(false), 3000);
  };

  // Load Regulations Preset
  const handleLoadTemplate = () => {
    setRegulationsContent(DEFAULT_REGULATIONS_TEMPLATE);
    setRegulationsTitle(`Bases y Reglamento Oficial: ${activeTournament.name}`);
  };

  // Save Playoffs Config
  const handleSavePlayoffs = () => {
    updateTournament(activeTournament.id, { playoffs: playoffsConfig });
    setPlayoffsSaved(true);
    setTimeout(() => setPlayoffsSaved(false), 3000);
  };

  // Change Starting Playoff Stage
  const handleSelectStartingStage = (stage: PlayoffStage) => {
    let generatedMatchups: PlayoffMatchup[] = [];

    if (stage === 'octavos') {
      generatedMatchups = Array.from({ length: 8 }, (_, i) => ({
        id: `pl-oct-${i + 1}`,
        stage: 'octavos',
        roundLabel: `Octavos ${i + 1}`,
        team1Label: `Clasificado ${i * 2 + 1}`,
        team2Label: `Clasificado ${i * 2 + 2}`,
        score1: 0,
        score2: 0,
      }));
    } else if (stage === 'cuartos') {
      generatedMatchups = Array.from({ length: 4 }, (_, i) => ({
        id: `pl-cua-${i + 1}`,
        stage: 'cuartos',
        roundLabel: `Cuartos ${i + 1}`,
        team1Label: `1° Llave ${String.fromCharCode(65 + i)}`,
        team2Label: `2° Llave ${String.fromCharCode(68 - i)}`,
        score1: 0,
        score2: 0,
      }));
    } else if (stage === 'semifinal') {
      generatedMatchups = [
        {
          id: 'pl-semi-1',
          stage: 'semifinal',
          roundLabel: 'Semifinal 1',
          team1Label: '1° Ganador Grupo A',
          team2Label: '2° Ganador Grupo B',
          score1: 0,
          score2: 0,
        },
        {
          id: 'pl-semi-2',
          stage: 'semifinal',
          roundLabel: 'Semifinal 2',
          team1Label: '1° Ganador Grupo B',
          team2Label: '2° Ganador Grupo A',
          score1: 0,
          score2: 0,
        },
      ];
    } else {
      generatedMatchups = [
        {
          id: 'pl-fin-1',
          stage: 'final',
          roundLabel: 'Gran Final',
          team1Label: 'Finalista 1',
          team2Label: 'Finalista 2',
          score1: 0,
          score2: 0,
        },
      ];
    }

    setPlayoffsConfig({
      enabled: true,
      startingStage: stage,
      matchups: generatedMatchups,
    });
  };

  // Add Match Submit
  const handleAddMatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMatchYoutubeError(null);
    if (!newMatchHomeId || !newMatchAwayId || newMatchHomeId === newMatchAwayId) return;

    const ytCheck = validateYoutubeUrl(newMatchYoutubeUrl);
    if (!ytCheck.isValid) {
      setMatchYoutubeError(ytCheck.error || 'Ingresa un enlace válido de YouTube.');
      return;
    }

    createMatch({
      round: newMatchRound,
      date: newMatchDate,
      time: newMatchTime,
      court: newMatchCourt,
      category: newMatchCategory,
      homeTeamId: newMatchHomeId,
      awayTeamId: newMatchAwayId,
      status: 'scheduled',
      homeSetsWon: 0,
      awaySetsWon: 0,
      youtubeLiveUrl: ytCheck.cleanUrl || undefined,
    });

    setNewMatchYoutubeUrl('');
    setShowAddMatchModal(false);
  };

  // Add Club Submit (validates human readable name and generates unique Club Key)
  const handleAddClubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClubFormError(null);

    const clubNameVal = validateHumanReadableText(newClubName, 'El nombre del club', 3);
    if (!clubNameVal.isValid) {
      setClubFormError(clubNameVal.error || 'Ingresa un nombre de club real y válido.');
      return;
    }

    if (newClubManagerName.trim()) {
      const mgrVal = validateHumanReadableText(newClubManagerName, 'El nombre del delegado', 3);
      if (!mgrVal.isValid) {
        setClubFormError(mgrVal.error || 'Ingresa un nombre de delegado válido.');
        return;
      }
    }

    const { club, invite } = addClub({
      name: newClubName.trim(),
      shortName: newClubShortName.trim() || newClubName.trim().slice(0, 3).toUpperCase(),
      category: newClubCategory,
      group: newClubGroup,
      homeCourt: activeTournament.venue,
      color: newClubColor,
      managerName: newClubManagerName.trim() || 'Delegado Oficial',
      managerEmail: newClubManagerEmail.trim() || 'delegado@club.cl',
      managerPhone: newClubManagerPhone.trim(),
      headCoach: newClubHeadCoach.trim() || 'Director Técnico',
      assistantCoach: 'Asistente',
    });

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    setLastCreatedClubInvite({
      clubId: club.id,
      clubName: club.name,
      inviteKey: invite.id,
      inviteLink: `${origin}/?invite=${invite.id}`,
    });

    setNewClubName('');
    setNewClubShortName('');
    setNewClubManagerName('');
    setNewClubManagerEmail('');
    setNewClubManagerPhone('');
    setNewClubHeadCoach('');
    setShowAddClubModal(false);
  };

  // Get current host URL for invite links
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const myTournamentsCount = tournaments.filter((t) => t.organizerUserId === currentUser?.id).length;
  const organizerQuota = currentUser?.tournamentQuota || 1;
  const hasNoTournaments = tournaments.length === 0 || !activeTournament.id || activeTournament.id === 'none';

  return (
    <div className="relative space-y-6 pb-20 animate-in fade-in duration-300">
      {/* CUADRO DE DIÁLOGO BLOQUEANTE POR FALTA DE RENOVACIÓN DE KEY (7 DÍAS DE GRACIA) */}
      {isOrganizerPanelBlocked && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="non-renewal-lock-title"
        >
          <div className="bg-white rounded-[32px] max-w-lg w-full p-6 sm:p-7 shadow-2xl border-2 border-rose-500 space-y-4 text-slate-900">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-600/30">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black uppercase tracking-wider mb-1">
                  Panel de Organizador Bloqueado • Falta de Renovación
                </span>
                <h2 id="non-renewal-lock-title" className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                  Tu Key de Organizador requiere renovación para continuar editando
                </h2>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2 text-xs text-rose-950">
              <p className="font-bold leading-relaxed">
                🔒 El acceso a modificaciones en el Panel de Organizador se encuentra bloqueado porque tu Key (
                <span className="font-mono font-black">{activeOrganizerKey?.id || 'KEY'}</span>) ha finalizado su vigencia o no ha sido renovada.
              </p>
              <p className="text-[11px] text-rose-900 leading-relaxed">
                ✅ <strong>Tu torneo o liga (&ldquo;{activeTournament.name}&rdquo;) NO ha sido eliminado</strong> y sigue resguardado en el sistema.
              </p>
              <div className="pt-1.5 border-t border-rose-200/80 flex items-center gap-2 font-black text-rose-700">
                <Clock className="w-4 h-4 shrink-0" />
                <span>
                  Plazo de 7 días antes de eliminación automática: Quedan {organizerTrialInfo.graceDaysRemaining} días y{' '}
                  {organizerTrialInfo.graceHoursRemaining} horas.
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Ponte en contacto ahora con nuestro equipo de soporte vía <strong>WhatsApp</strong> o <strong>Correo Electrónico</strong> para apelar o gestionar la renovación de tu Key. Si no te pones en contacto dentro de los 7 días, la Key se eliminará automáticamente junto con el torneo.
            </p>

            {/* Botones directos de contacto a Soporte Oficial */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <a
                href={`https://wa.me/56957950579?text=${encodeURIComponent(
                  `¡Hola soporte TorNow! 👋 Solicito renovar / apelar el bloqueo de mi Key de Organizador (${
                    activeOrganizerKey?.id || ''
                  }) para el torneo "${activeTournament.name}".`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Contactar por WhatsApp</span>
              </a>

              <a
                href={`mailto:tornowcl@gmail.com?subject=${encodeURIComponent(
                  `Apelación y Renovación de Key ${activeOrganizerKey?.id || ''} - ${activeTournament.name}`
                )}&body=${encodeURIComponent(
                  `Hola equipo de soporte TorNow (tornowcl@gmail.com),\n\nMe pongo en contacto para gestionar la renovación de mi Key de Organizador (${
                    activeOrganizerKey?.id || ''
                  }) correspondiente al torneo "${activeTournament.name}".\n\nQuedo atento(a) a los pasos de renovación.`
                )}`}
                className="py-3 px-4 rounded-2xl bg-[#0052fe] hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>Correo (tornowcl@gmail.com)</span>
              </a>
            </div>

            {/* Formulario rápido de apelación / aviso de contacto */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!activeOrganizerKey) return;
                const res = submitKeyRenewalAppeal(activeOrganizerKey.id, renewalAppealNote);
                setRenewalAppealFeedback(res.message);
                setRenewalAppealNote('');
              }}
              className="pt-2 border-t border-slate-200 space-y-2"
            >
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                Dejar constancia de apelación / contacto en plataforma (detiene el borrado automático):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={renewalAppealNote}
                  onChange={(e) => setRenewalAppealNote(e.target.value)}
                  placeholder="Ej. Ya escribí por WhatsApp para renovar al Plan Now!..."
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0052fe]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black shrink-0 cursor-pointer"
                >
                  Enviar Aviso
                </button>
              </div>
              {renewalAppealFeedback && (
                <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5">
                  ✓ {renewalAppealFeedback}
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Contenedor del Panel (se deshabilita toda interacción si está bloqueado por no renovación) */}
      <div
        className={
          isOrganizerPanelBlocked
            ? 'pointer-events-none select-none blur-[3px] opacity-50 space-y-6'
            : 'space-y-6'
        }
      >
      {hasNoTournaments && (
        <section className="bg-gradient-to-r from-[#081223] via-[#0d1b33] to-[#0052fe] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <span className="px-3 py-0.5 rounded-full bg-[#0052fe] text-white text-[10px] font-black uppercase tracking-wider">
              Panel de Organizador Oficial
            </span>
            <h2 className="text-lg sm:text-xl font-black text-white">
              Explora las herramientas del organizador o crea tu torneo oficial
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              Puedes gestionar clubes, cruces con red neuronal, sanciones disciplinarias y bandeja de entrada, o publicar un nuevo torneo oficial.
            </p>
          </div>
          {onOpenCreateTournament && (
            <button
              onClick={onOpenCreateTournament}
              className="px-5 py-2.5 rounded-full bg-white text-[#081223] hover:bg-blue-50 font-black text-xs uppercase tracking-wider inline-flex items-center gap-2 shadow-lg transition-all active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4 text-[#0052fe]" />
              <span>Crear Torneo Oficial</span>
            </button>
          )}
        </section>
      )}

      {/* Top Header Card */}
      <section className="relative bg-gradient-to-r from-[#081223] via-[#0d1b33] to-[#0052fe] text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 space-y-4">
        {/* Recuadro pequeño en la esquina superior derecha con los días restantes de prueba gratuita */}
        <div className="flex justify-end -mb-1">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-xs font-black shadow-md backdrop-blur-md ${
              organizerTrialInfo.isBlocked
                ? 'bg-rose-600/90 border-rose-300/40 text-white'
                : organizerTrialInfo.isExpired
                ? 'bg-amber-500/90 border-amber-300/40 text-slate-950'
                : 'bg-white/15 border-cyan-300/40 text-white'
            }`}
            title="Cuenta atrás oficial de tu mes de prueba gratuita (30 días)"
          >
            <Clock className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
            <span>
              {organizerTrialInfo.isBlocked
                ? '🔒 Key Bloqueada por Administración'
                : organizerTrialInfo.isExpired
                ? '⏳ Prueba Gratuita Finalizada (0 días)'
                : `🎁 Prueba Gratuita: Quedan ${organizerTrialInfo.daysRemaining} ${
                    organizerTrialInfo.daysRemaining === 1 ? 'día' : 'días'
                  } (${organizerTrialInfo.hoursRemaining}h)`}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#0052fe] text-white text-[10px] font-black uppercase tracking-wider">
                Panel de Organizador
              </span>
              <span className="text-xs text-blue-200 font-bold">
                {activeTournament.sport.toUpperCase()} • {activeTournament.format.toUpperCase()}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {activeTournament.name}
            </h1>
            <p className="text-xs text-slate-300">
              Organizado por: <strong className="text-white">{activeTournament.organizerName}</strong>
            </p>
            {activeTournament.organizerContact && (
              <div className="pt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-blue-200">
                {activeTournament.organizerContact.rut && (
                  <span className="inline-flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-md border border-white/10 font-mono" title="Dato oficial bloqueado e inmodificable">
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                    <span>RUT: {activeTournament.organizerContact.rut}</span>
                  </span>
                )}
                {activeTournament.organizerContact.phone && (
                  <span className="inline-flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-md border border-white/10 font-mono" title="Dato oficial bloqueado e inmodificable">
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                    <span>Tel: {activeTournament.organizerContact.phone}</span>
                  </span>
                )}
                {activeTournament.organizerContact.email && (
                  <span className="inline-flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-md border border-white/10" title="Dato oficial bloqueado e inmodificable">
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                    <span className="truncate max-w-[180px]">{activeTournament.organizerContact.email}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-md border border-white/10" title="Sede oficial bloqueada e inmodificable">
                  <Lock className="w-2.5 h-2.5 text-amber-400" />
                  <span className="truncate max-w-[200px]">Sede: {activeTournament.venue}</span>
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Botón Directo: Validar Torneo como Organizador (Público / Oculto) */}
            <button
              type="button"
              onClick={() => toggleTournamentVisibility(activeTournament.id)}
              className={`px-3.5 py-1.5 rounded-full font-black text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 ${
                (activeTournament.visibility || 'public') === 'public'
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-300/40'
                  : 'bg-amber-400 hover:bg-amber-500 text-slate-950 border border-amber-300'
              }`}
              title="Validar torneo como organizador y alternar entre estado Público y Oculto"
            >
              {(activeTournament.visibility || 'public') === 'public' ? (
                <>
                  <Globe className="w-3.5 h-3.5" />
                  <span>Validado: Público (Ocultar)</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Oculto: Validar y Hacer Público</span>
                </>
              )}
            </button>

            {/* Share Tournament Button */}
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="px-3.5 py-1.5 rounded-full bg-white text-[#081223] hover:bg-blue-50 font-black text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
              title="Compartir programación, resultados y vista pública"
            >
              <Share2 className="w-3.5 h-3.5 text-[#0052fe]" />
              <span>Compartir</span>
            </button>

            <button
              type="button"
              onClick={() => setShowVenueModal(true)}
              className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 border border-blue-400/30 cursor-pointer"
              title="Control de acceso, previsualización por club y planillas de ingreso a recintos con IA"
            >
              <Building2 className="w-3.5 h-3.5 text-cyan-200" />
              <Sparkles className="w-3 h-3 text-amber-200" />
              <span>
                {activeTournament.venueSheetTemplatePending
                  ? 'Subir Planilla Acceso (Pendiente)'
                  : 'Planillas Recinto (IA)'}
              </span>
            </button>

            {onOpenCreateTournament && (
              <button
                onClick={onOpenCreateTournament}
                className="px-3.5 py-1.5 rounded-full bg-[#0052fe] hover:bg-[#0042d0] text-white font-bold text-xs border border-white/20 flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Torneo</span>
              </button>
            )}

            {currentUser?.role === 'organizer' && (
              <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-black/30 border border-white/10 text-white text-[10px] font-mono font-bold">
                Cupo: {myTournamentsCount}/{organizerQuota}
              </span>
            )}

            {tournaments.length > 1 && (
              <select
                value={activeTournament.id}
                onChange={(e) => setActiveTournamentId(e.target.value)}
                className="px-3 py-1.5 rounded-full bg-slate-900 text-white font-bold text-xs border border-slate-700 focus:outline-none"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Master Controls Grid: Organizer Tournament Validation (Public/Hidden) & Roster Editing Switch */}
        <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Control 1: Validar Torneo como Organizador (Público / Oculto) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/25 p-3.5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  (activeTournament.visibility || 'public') === 'public'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {(activeTournament.visibility || 'public') === 'public' ? (
                  <Globe className="w-5 h-5" />
                ) : (
                  <EyeOff className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs text-white">
                    Validación del Torneo (Público / Oculto)
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      (activeTournament.visibility || 'public') === 'public'
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/30'
                        : 'bg-amber-500/30 text-amber-300 border border-amber-400/30'
                    }`}
                  >
                    {(activeTournament.visibility || 'public') === 'public' ? 'Público' : 'Oculto'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-300 block mt-0.5">
                  {(activeTournament.visibility || 'public') === 'public'
                    ? 'Torneo validado por el organizador y visible públicamente.'
                    : 'Torneo oculto: solo visible para ti mientras configuras clubes y cruces.'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => toggleTournamentVisibility(activeTournament.id, 'public')}
                className={`px-3 py-1.5 rounded-full font-extrabold text-[11px] flex items-center gap-1 transition-all ${
                  (activeTournament.visibility || 'public') === 'public'
                    ? 'bg-emerald-500 text-white shadow'
                    : 'bg-white/10 hover:bg-white/20 text-slate-300'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Público</span>
              </button>
              <button
                type="button"
                onClick={() => toggleTournamentVisibility(activeTournament.id, 'hidden')}
                className={`px-3 py-1.5 rounded-full font-extrabold text-[11px] flex items-center gap-1 transition-all ${
                  activeTournament.visibility === 'hidden'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'bg-white/10 hover:bg-white/20 text-slate-300'
                }`}
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Oculto</span>
              </button>
            </div>
          </div>

          {/* Control 2: Allow Roster Editing Switch */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/25 p-3.5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${activeTournament.allowRosterEditing ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {activeTournament.allowRosterEditing ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              <div>
                <span className="font-extrabold text-xs text-white block">
                  Permiso de Edición de Nóminas para Delegados
                </span>
                <span className="text-[11px] text-slate-300">
                  {activeTournament.allowRosterEditing
                    ? 'ABIERTA: Los delegados pueden inscribir y editar jugadores.'
                    : 'CERRADA: Nóminas bloqueadas en modo solo lectura.'}
                </span>
              </div>
            </div>

            <button
              onClick={handleToggleRosterEditing}
              className={`px-3.5 py-1.5 rounded-full font-bold text-[11px] flex items-center justify-center gap-1.5 shadow transition-all shrink-0 ${
                activeTournament.allowRosterEditing
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              {activeTournament.allowRosterEditing ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Bloquear Nóminas</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Permitir Edición</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Control 3: Planilla de Ingreso al Recinto (Opcional / Subir Plantilla Pendiente) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/25 p-3.5 rounded-2xl border border-white/10">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                activeTournament.requiresVenueSheet
                  ? activeTournament.venueSheetTemplatePending
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-cyan-500/20 text-cyan-300'
                  : 'bg-white/10 text-slate-300'
              }`}
            >
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-xs text-white">
                  Planilla de Acceso al Recinto (Opcional)
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                    activeTournament.requiresVenueSheet
                      ? activeTournament.venueSheetTemplatePending
                        ? 'bg-amber-500/30 text-amber-200 border border-amber-400/30'
                        : 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/30'
                      : 'bg-white/10 text-slate-300 border border-white/15'
                  }`}
                >
                  {activeTournament.requiresVenueSheet
                    ? activeTournament.venueSheetTemplatePending
                      ? '⏳ Plantilla Pendiente de Subir'
                      : `✓ Plantilla Activa (${activeTournament.venueSheetTemplateFileName || 'Oficial'})`
                    : 'No Requerida'}
                </span>
              </div>
              <span className="text-[11px] text-slate-300 block mt-0.5">
                {activeTournament.requiresVenueSheet
                  ? activeTournament.venueSheetTemplatePending
                    ? 'Indicaste que necesitas planilla de acceso pero aún no tenías el archivo. Súbelo aquí cuando lo tengas.'
                    : 'La IA rellena automáticamente la planilla por club 1 día antes de cada fecha. Puedes previsualizarla y descargarla en .XLSX o .PDF.'
                  : 'Este torneo no exige planilla de ingreso en portería (puedes activarla cuando quieras).'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() =>
                updateTournament(activeTournament.id, {
                  requiresVenueSheet: !activeTournament.requiresVenueSheet,
                })
              }
              className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-colors cursor-pointer"
            >
              {activeTournament.requiresVenueSheet ? 'Desactivar Planilla' : 'Activar Planilla de Acceso'}
            </button>
            <button
              type="button"
              onClick={() => setShowVenueModal(true)}
              className="px-3.5 py-1.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-[11px] flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {activeTournament.venueSheetTemplatePending
                  ? 'Subir Plantilla Ahora'
                  : 'Previsualizar / Gestionar Planillas'}
              </span>
            </button>
          </div>
        </div>

        {/* Quick KPI stats */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Clubes Inscritos</span>
            <span className="text-lg font-black text-cyan-300">{clubs.length}</span>
          </div>
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Partidos Jugados</span>
            <span className="text-lg font-black text-amber-300">
              {matches.filter((m) => m.status === 'finished').length} / {matches.length}
            </span>
          </div>
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Delegados Activos</span>
            <span className="text-lg font-black text-emerald-300">
              {invites.filter((inv) => inv.status === 'redeemed').length} / {invites.length}
            </span>
          </div>
        </div>
      </section>

      {/* Organizer Navigation Tabs con Slider Simple Adaptativo */}
      <AdaptiveMenuSlider ariaLabel="Menú de secciones del organizador" className="font-bold text-xs">
        <button
          onClick={() => setActiveTab('invites')}
          className={`px-4 py-2.5 rounded-full transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            activeTab === 'invites'
              ? 'bg-[#0052fe] text-white shadow-md font-extrabold'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-white" />
          <span>1. Crear Club, Keys e Inscripción de Jugadores ({clubs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('matches')}
          className={`px-4 py-2.5 rounded-full transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            activeTab === 'matches'
              ? 'bg-[#121316] text-white shadow'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-[#0052fe]" />
          <span>2. Partidos & Fixture ({matches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('playoffs')}
          className={`px-4 py-2.5 rounded-full transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            activeTab === 'playoffs'
              ? 'bg-[#121316] text-white shadow'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span>3. Cruces de Playoffs</span>
        </button>

        <button
          onClick={() => setActiveTab('sanctions')}
          className={`px-4 py-2.5 rounded-full transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            activeTab === 'sanctions'
              ? 'bg-rose-600 text-white shadow-md font-extrabold'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <AlertCircle className={`w-3.5 h-3.5 ${activeTab === 'sanctions' ? 'text-white' : 'text-rose-500'}`} />
          <span>
            4. Sanciones y Bandeja ({(activeTournament.sanctions || []).length} / {(activeTournament.inboxMessages || []).filter((m) => m.status === 'pending').length})
          </span>
        </button>

        <button
          onClick={() => setActiveTab('regulations')}
          className={`px-4 py-2.5 rounded-full transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            activeTab === 'regulations'
              ? 'bg-[#121316] text-white shadow'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-blue-500" />
          <span>5. Bases & Reglamento</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 rounded-full transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            activeTab === 'settings'
              ? 'bg-[#121316] text-white shadow'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-cyan-500" />
          <span>6. Configuración & Auspiciadores</span>
        </button>

        <button
          onClick={() => setShowVenueModal(true)}
          className="px-4 py-2.5 rounded-full transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-300 shadow-xs font-black"
        >
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>7. Planillas de Recinto (IA & 12h)</span>
        </button>
      </AdaptiveMenuSlider>

      {/* SECTION 1: Matches & Quick Score Upload */}
      {activeTab === 'matches' && (
        <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0052fe]" />
                Gestión y Carga Rápida de Resultados
              </h2>
              <p className="text-xs text-slate-500">
                Actualiza marcadores, inicia el live score o programa nuevos encuentros.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {rounds.length > 1 && (
                <select
                  value={selectedRound}
                  onChange={(e) => setSelectedRound(e.target.value)}
                  className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border-none focus:ring-1 focus:ring-[#0052fe]"
                >
                  <option value="ALL">Todas las Jornadas</option>
                  {rounds.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={() => {
                  const res = generateOfficialFixtures(activeTournament.id, undefined, false);
                  if (!res.success && res.started) {
                    setRegenerateMessage(res.message);
                    setShowRegenerateConfirm(true);
                  }
                }}
                className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 border border-slate-300 transition-colors"
                title="Regenerar cruces oficiales con lógica Berger / Round Robin y descansos de equipos impares"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#0052fe]" />
                <span>Regenerar Cruces</span>
              </button>

              <button
                onClick={() => setShowAddMatchModal(true)}
                className="px-3.5 py-1.5 rounded-full bg-[#0052fe] hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Programar Partido</span>
              </button>
            </div>
          </div>

          {filteredMatches.length === 0 ? (
            <div className="text-center py-8 text-slate-400 space-y-2">
              <Calendar className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-bold">No hay partidos en esta jornada.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMatches.map((match) => {
                const homeClub = clubs.find((c) => c.id === match.homeTeamId);
                const awayClub = clubs.find((c) => c.id === match.awayTeamId);

                return (
                  <div
                    key={match.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-bold text-[#0052fe]">
                        {match.round} • {match.court}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px]">{match.date} {match.time}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            match.status === 'live'
                              ? 'bg-red-500 text-white animate-pulse'
                              : match.status === 'finished'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {match.status === 'live' ? 'En Juego' : match.status === 'finished' ? 'Finalizado' : 'Programado'}
                        </span>
                      </div>
                    </div>

                    {/* Match Score Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      {/* Home Team */}
                      <div className="sm:col-span-5 flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-extrabold text-xs shadow-sm flex-shrink-0"
                          style={{ backgroundColor: homeClub?.color || '#0052fe' }}
                        >
                          {homeClub?.shortName?.slice(0, 2) || 'L'}
                        </div>
                        <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {homeClub?.name || 'Local'}
                        </span>
                      </div>

                      {/* Sets / Goals Inputs */}
                      <div className="sm:col-span-2 flex items-center justify-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="99"
                          value={match.homeSetsWon}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateMatchSets(match.id, val, match.awaySetsWon, match.status);
                          }}
                          className="w-12 h-10 text-center font-mono font-black text-base bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052fe]"
                        />
                        <span className="font-bold text-slate-400">-</span>
                        <input
                          type="number"
                          min="0"
                          max="99"
                          value={match.awaySetsWon}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateMatchSets(match.id, match.homeSetsWon, val, match.status);
                          }}
                          className="w-12 h-10 text-center font-mono font-black text-base bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052fe]"
                        />
                      </div>

                      {/* Away Team */}
                      <div className="sm:col-span-5 flex items-center justify-end gap-2.5 text-right">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {awayClub?.name || 'Visita'}
                        </span>
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-extrabold text-xs shadow-sm flex-shrink-0"
                          style={{ backgroundColor: awayClub?.color || '#475569' }}
                        >
                          {awayClub?.shortName?.slice(0, 2) || 'V'}
                        </div>
                      </div>
                    </div>

                    {/* Quick action controls for this match */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200/60 text-xs">
                      {match.status !== 'finished' ? (
                        <button
                          onClick={() => updateMatchSets(match.id, match.homeSetsWon, match.awaySetsWon, 'finished')}
                          className="px-3 py-1 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors"
                        >
                          Marcar como Finalizado
                        </button>
                      ) : (
                        <button
                          onClick={() => updateMatchSets(match.id, match.homeSetsWon, match.awaySetsWon, 'scheduled')}
                          className="px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold transition-colors"
                        >
                          Reabrir Partido
                        </button>
                      )}

                      {match.status !== 'live' && (
                        <button
                          onClick={() => {
                            updateMatchSets(match.id, match.homeSetsWon, match.awaySetsWon, 'live');
                            if (onOpenLiveScore) onOpenLiveScore(match.id);
                          }}
                          className="px-3 py-1 rounded-full bg-red-100 hover:bg-red-200 text-red-700 font-bold flex items-center gap-1 transition-colors"
                        >
                          <Radio className="w-3.5 h-3.5" />
                          <span>Poner en Vivo</span>
                        </button>
                      )}

                      {onOpenLiveScore && (
                        <button
                          onClick={() => onOpenLiveScore(match.id)}
                          className="px-3 py-1 rounded-full bg-[#0052fe] hover:bg-blue-700 text-white font-bold flex items-center gap-1 transition-colors"
                        >
                          <Radio className="w-3.5 h-3.5" />
                          <span>Abrir Marcador</span>
                        </button>
                      )}
                    </div>

                    {/* Link de YouTube Opcional para Transmisión en Vivo */}
                    <div className="pt-2.5 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 flex-1">
                        <Play className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">
                          Link YouTube (Opcional):
                        </span>
                        <input
                          type="url"
                          defaultValue={match.youtubeLiveUrl || ''}
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            const check = validateYoutubeUrl(val);
                            if (check.isValid) {
                              updateMatchDetails(match.id, { youtubeLiveUrl: check.cleanUrl });
                            }
                          }}
                          placeholder="https://www.youtube.com/watch?v=... (Dejar vacío si no hay transmisión)"
                          className="w-full bg-white border border-slate-300 rounded-xl py-1.5 px-3 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                        />
                      </div>

                      {match.youtubeLiveUrl ? (
                        <a
                          href={match.youtubeLiveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] inline-flex items-center gap-1.5 shrink-0 shadow-2xs"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          <span>Ver partido</span>
                        </a>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-slate-200/70 text-slate-600 font-bold text-[11px] inline-flex items-center gap-1.5 shrink-0">
                          <VideoOff className="w-3.5 h-3.5 text-slate-500" />
                          <span>Partido sin transmisión en vivo</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* SECTION 2: Playoffs and Final Crosses con Nodos Interactivos */}
      {activeTab === 'playoffs' && (
        <section className="space-y-4">
          <PlayoffNodeGraph
            clubs={clubs}
            standings={formattedStandings}
            savedMatchups={playoffsConfig.matchups}
            isOrganizer={true}
            onSavePlayoffs={(matchups, stage) => {
              const updatedConfig = {
                enabled: true,
                startingStage: stage,
                matchups,
              };
              setPlayoffsConfig(updatedConfig);
              updateTournament(activeTournament.id, { playoffs: updatedConfig });
              setPlayoffsSaved(true);
              setTimeout(() => setPlayoffsSaved(false), 3000);
            }}
          />
        </section>
      )}

      {/* SECTION 2B: Ventana de Sanciones, Apelaciones y Bandeja de Entrada */}
      {activeTab === 'sanctions' && <SanctionsAndInboxPanel />}

      {/* SECTION 3: Tournament Regulations & Bases */}
      {activeTab === 'regulations' && (
        <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Bases Oficiales y Reglamento del Torneo
              </h2>
              <p className="text-xs text-slate-500">
                Sube o edita las normas de participación, sistema de puntuación, W.O. y sanciones.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleLoadTemplate}
                className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Cargar Plantilla Estándar
              </button>

              <button
                onClick={handleSaveRegulations}
                className="px-4 py-1.5 rounded-full bg-[#0052fe] hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{regulationsSaved ? '¡Bases Guardadas!' : 'Guardar Bases'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Título del Documento de Bases
              </label>
              <input
                type="text"
                value={regulationsTitle}
                onChange={(e) => setRegulationsTitle(e.target.value)}
                placeholder="Ej. Bases y Reglamento Oficial Copa Apertura 2026"
                className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0052fe]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre de Archivo PDF Adjunto para Descarga
              </label>
              <input
                type="text"
                value={regulationsFile}
                onChange={(e) => setRegulationsFile(e.target.value)}
                placeholder="Bases_Oficiales.pdf"
                className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0052fe]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Artículos, Normas y Reglamento (Visible para todos los delegados)
              </label>
              <textarea
                rows={12}
                value={regulationsContent}
                onChange={(e) => setRegulationsContent(e.target.value)}
                className="w-full font-mono text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0052fe] leading-relaxed"
                placeholder="Escribe el articulado oficial del torneo aquí..."
              />
            </div>
          </div>
        </section>
      )}

      {/* SECTION 4: Creación de Clubes, Generador de Keys de Club e Inscripción de Jugadores */}
      {activeTab === 'invites' && (
        <section className="space-y-5">
          {/* SUB-PANEL A: CREACIÓN DIRECTA DE CLUB Y GENERADOR DE KEY DE CLUB */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0052fe] text-[10px] font-black uppercase tracking-wider">
                    Paso 1: Clubes y Keys
                  </span>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-[#0052fe]" />
                    <span>Creación de Club y Generación de Key de Club</span>
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Registra un equipo en el torneo para generar su Key Única de Club y habilitar su menú de inscripción de jugadores y cuerpo técnico.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowInlineClubForm(!showInlineClubForm)}
                className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 self-start sm:self-center transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-[#0052fe]" />
                <span>{showInlineClubForm ? 'Ocultar Formulario' : 'Mostrar Formulario de Creación'}</span>
              </button>
            </div>

            {/* Banner de Key recién generada */}
            {lastCreatedClubInvite && (
              <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 space-y-3 animate-in fade-in">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-xs sm:text-sm text-emerald-950">
                        ¡Club "{lastCreatedClubInvite.clubName}" Creado y Key Generada!
                      </h4>
                      <p className="text-[11px] text-emerald-800">
                        Comparte esta Key Única con el delegado del club o inscribe tú mismo a sus jugadores ahora:
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLastCreatedClubInvite(null)}
                    className="text-emerald-700 hover:text-emerald-950 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-xl border border-emerald-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">Key de Club:</span>
                    <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      {lastCreatedClubInvite.inviteKey}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(lastCreatedClubInvite.inviteKey, 'new-club-key')}
                      className="px-3 py-1.5 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1"
                    >
                      {copiedKey === 'new-club-key' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'new-club-key' ? 'Key Copiada' : 'Copiar Key'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(lastCreatedClubInvite.inviteLink, 'new-club-link')}
                      className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1"
                    >
                      {copiedKey === 'new-club-link' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'new-club-link' ? 'Enlace Copiado' : 'Copiar Link'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegistrationClubId(lastCreatedClubInvite.clubId)}
                      className="px-3.5 py-1.5 rounded-full bg-[#0052fe] hover:bg-blue-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Inscribir Jugadores Ahora</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Formulario Directo de Creación de Club + Generación de Key */}
            {showInlineClubForm && (
              <form onSubmit={handleAddClubSubmit} className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
                {clubFormError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{clubFormError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                  <div className="sm:col-span-5">
                    <label className="block font-bold text-slate-700 mb-1">
                      Nombre Oficial del Club o Equipo *
                    </label>
                    <input
                      type="text"
                      required
                      value={newClubName}
                      onChange={(e) => {
                        setNewClubName(e.target.value);
                        setClubFormError(null);
                      }}
                      placeholder="Ej: Club Deportivo Manquehue, Selección Sub18..."
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0052fe]/20"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Sigla (3-4 letras)
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={newClubShortName}
                      onChange={(e) => setNewClubShortName(e.target.value.toUpperCase())}
                      placeholder="CDM"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono font-bold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0052fe]/20"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block font-bold text-slate-700 mb-1">
                      Categoría del Torneo *
                    </label>
                    <select
                      value={newClubCategory}
                      onChange={(e) => setNewClubCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold text-slate-900 focus:outline-none"
                    >
                      {(activeTournament.categories || ['TC (Todo Competidor)']).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Color Camiseta
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={newClubColor}
                        onChange={(e) => setNewClubColor(e.target.value)}
                        className="w-10 h-9 rounded-xl border border-slate-300 cursor-pointer bg-white p-0.5"
                      />
                      <span className="font-mono text-[11px] text-slate-600">{newClubColor}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nombre Delegado / Encargado *
                    </label>
                    <input
                      type="text"
                      required
                      value={newClubManagerName}
                      onChange={(e) => {
                        setNewClubManagerName(e.target.value);
                        setClubFormError(null);
                      }}
                      placeholder="Ej: Roberto Soto"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Correo del Delegado *
                    </label>
                    <input
                      type="email"
                      required
                      value={newClubManagerEmail}
                      onChange={(e) => setNewClubManagerEmail(e.target.value)}
                      placeholder="delegado@club.cl"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Teléfono Delegado
                    </label>
                    <input
                      type="tel"
                      value={newClubManagerPhone}
                      onChange={(e) => setNewClubManagerPhone(e.target.value)}
                      placeholder="+56 9 1234 5678"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Entrenador Principal (DT)
                    </label>
                    <input
                      type="text"
                      value={newClubHeadCoach}
                      onChange={(e) => setNewClubHeadCoach(e.target.value)}
                      placeholder="Ej: Prof. Carlos Díaz"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-semibold text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/80">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Al crear el club se genera automáticamente una <strong>Key de Club única</strong> y se actualizan los cruces.</span>
                  </span>

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-full bg-[#0052fe] hover:bg-[#0042d0] text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear Club y Generar Key de Club</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* SUB-PANEL B: LISTADO DE CLUBES, KEYS DE CLUB E INSCRIPCIÓN DE JUGADORES (CON N° DE CAMISETA) */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                    Paso 2: Nóminas y Jugadores
                  </span>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>Clubes Inscritos, Keys de Club e Inscripción de Jugadores ({clubs.length})</span>
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inscribe directamente a los jugadores (con su Número de Camiseta), entrenadores, asistentes y analistas, o envía la Key de Club al delegado.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddClubModal(true)}
                className="px-4 py-2 rounded-full bg-[#081223] hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 shadow self-start sm:self-center"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>Nuevo Club (Modal)</span>
              </button>
            </div>

            {clubs.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0052fe] flex items-center justify-center mx-auto">
                  <Shield className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Aún no hay clubes creados en "{activeTournament.name}"
                  </h3>
                  <p className="text-xs text-slate-500">
                    Usa el formulario superior <strong>"Creación de Club y Generación de Key de Club"</strong> para inscribir el primer equipo, obtener su Key de Club e inscribir a sus jugadores con número de camiseta.
                  </p>
                </div>
                {!showInlineClubForm && (
                  <button
                    type="button"
                    onClick={() => setShowInlineClubForm(true)}
                    className="px-5 py-2.5 rounded-full bg-[#0052fe] text-white font-bold text-xs inline-flex items-center gap-1.5 shadow"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear Primer Club Ahora</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {clubs.map((club) => {
                  const invite = invites.find((inv) => inv.clubId === club.id);
                  const inviteKey = invite?.id || club.inviteKey || `INV-${club.id.toUpperCase()}`;
                  const inviteLink = `${baseUrl}/?invite=${inviteKey}`;
                  const isRedeemed = invite?.status === 'redeemed';

                  const whatsappText = encodeURIComponent(
                    `Hola estimado delegado de ${club.name}, te enviamos la invitación oficial para participar en "${activeTournament.name}".\n\nTu Clave de Acceso para cargar la nómina de jugadores es: ${inviteKey}\n\nIngresa directamente aquí para registrarte: ${inviteLink}`
                  );

                  return (
                    <div
                      key={club.id}
                      className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3.5 hover:border-slate-300 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0"
                            style={{ backgroundColor: club.color }}
                          >
                            {club.shortName}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-sm sm:text-base text-slate-900">{club.name}</h4>
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#0052fe] font-bold text-[10px] border border-blue-200">
                                {club.category}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 block mt-0.5">
                              {club.group || 'Fase General'} • Delegado: <strong>{club.managerName}</strong> ({club.managerEmail}) • <strong>{club.roster?.length || 0} Jugadores inscritos</strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => setRegistrationClubId(club.id)}
                            className="px-4 py-2 rounded-full bg-[#0052fe] hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Inscribir Jugadores / Cuerpo Técnico</span>
                          </button>

                          {confirmDeleteClubId === club.id ? (
                            <div className="flex items-center gap-1 animate-in fade-in">
                              <button
                                type="button"
                                onClick={() => {
                                  deleteClub(club.id);
                                  setConfirmDeleteClubId(null);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-xs transition-colors"
                              >
                                ¿Eliminar?
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteClubId(null)}
                                className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700"
                                title="Cancelar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteClubId(club.id)}
                              className="p-2 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Eliminar Club"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Unique Key & Sharing Strip */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <Key className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span className="text-slate-600 font-bold">Key de Club:</span>
                          <span className="font-mono font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                            {inviteKey}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase flex items-center gap-1 ${
                              isRedeemed
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isRedeemed ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Activa (@{invite?.redeemedByUsername || 'Delegado'})</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Pendiente de Canje</span>
                              </>
                            )}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(inviteKey, `key-${club.id}`)}
                            className="px-3 py-1.5 rounded-full bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1 transition-colors"
                          >
                            {copiedKey === `key-${club.id}` ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Key Copiada</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copiar Key</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const newInv = generateNewInviteForClub(
                                club.id,
                                club.managerEmail || 'delegado@club.cl',
                                club.managerName || 'Delegado Oficial',
                                club.managerPhone
                              );
                              handleCopy(newInv.id, `regen-${club.id}`);
                            }}
                            className="px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs flex items-center gap-1 transition-colors"
                            title="Generar una nueva Key Única para este club"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                            <span>
                              {copiedKey === `regen-${club.id}` ? '¡Nueva Key Generada y Copiada!' : 'Generar Nueva Key'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopy(inviteLink, club.id)}
                            className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors"
                          >
                            {copiedKey === club.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Enlace Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copiar Enlace</span>
                              </>
                            )}
                          </button>

                          <a
                            href={`https://wa.me/?text=${whatsappText}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>

                          {onNavigateToClub && (
                            <button
                              type="button"
                              onClick={() => onNavigateToClub(club.id)}
                              className="px-3 py-1.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors"
                            >
                              Ver Ficha
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Vista previa rápida de jugadores inscritos con su N° de Camiseta */}
                      <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-500 mr-1">
                            Plantel ({club.roster?.length || 0}):
                          </span>
                          {(!club.roster || club.roster.length === 0) ? (
                            <span className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200 font-semibold">
                              Sin jugadores inscritos aún — Haz clic en "Inscribir Jugadores / Cuerpo Técnico"
                            </span>
                          ) : (
                            club.roster.slice(0, 8).map((p) => (
                              <span
                                key={p.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-800"
                              >
                                <strong className="font-mono text-[#0052fe]">#{p.dorsal}</strong>
                                <span>{p.name} {p.paternalSurname || ''}</span>
                              </span>
                            ))
                          )}
                          {club.roster && club.roster.length > 8 && (
                            <span className="text-[11px] font-bold text-slate-500">
                              +{club.roster.length - 8} más
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* SECTION 5: Configuración General del Torneo */}
      {activeTab === 'settings' && (() => {
        const tourNameCheck = validateTournamentName(editTourName);
        return (
          <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#0052fe]" />
                  <span>Configuración General del Torneo</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Actualiza los parámetros competitivos, visibilidad pública/oculta, fechas, categorías y puntuación. Los datos del organizador y sede están bloqueados por seguridad.
                </p>
              </div>
              {settingsSavedMsg && (
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>¡Cambios guardados oficialmente!</span>
                </span>
              )}
            </div>

            {/* Validación del Torneo como Organizador (Público vs Oculto) */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-slate-900 tracking-wider">
                    Validar Visibilidad del Torneo (Organizador)
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      (activeTournament.visibility || 'public') === 'public'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {(activeTournament.visibility || 'public') === 'public'
                      ? '🌐 Validado • Público'
                      : '🔒 Oculto • Privado'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Como organizador del torneo puedes ponerlo en <strong>Público</strong> para que todos vean las tablas y partidos, o en <strong>Oculto</strong> mientras preparas la competencia.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleTournamentVisibility(activeTournament.id, 'public')}
                  className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all ${
                    (activeTournament.visibility || 'public') === 'public'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Validar y Hacer Público</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleTournamentVisibility(activeTournament.id, 'hidden')}
                  className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all ${
                    activeTournament.visibility === 'hidden'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Poner en Oculto</span>
                </button>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!tourNameCheck.isValid) return;
                if (editCategories.length === 0) return;
                const cleaned = cleanTournamentString(editTourName, true).slice(0, MAX_TOURNAMENT_NAME_LENGTH);
                setEditTourName(cleaned);
                updateTournament(activeTournament.id, {
                  name: cleaned,
                  startDate: editStartDate,
                  endDate: editEndDate,
                  description: editDescription.trim(),
                  categories: editCategories,
                  sponsors: editSponsors,
                  rules: {
                    pointsWin: Number(editPointsWin),
                    pointsTie: Number(editPointsTie),
                    pointsLoss: Number(editPointsLoss),
                  },
                });
                setSettingsSavedMsg(true);
                setTimeout(() => setSettingsSavedMsg(false), 3000);
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">
                      Nombre Oficial del Torneo *
                    </label>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        tourNameCheck.charCount < MIN_TOURNAMENT_NAME_LENGTH ||
                        tourNameCheck.charCount > MAX_TOURNAMENT_NAME_LENGTH
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tourNameCheck.charCount}/{MAX_TOURNAMENT_NAME_LENGTH}
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={MAX_TOURNAMENT_NAME_LENGTH + 15}
                    value={editTourName}
                    onChange={(e) =>
                      setEditTourName(e.target.value.replace(/^\s+/, '').replace(/\s{2,}/g, ' '))
                    }
                    onBlur={() => {
                      if (editTourName.trim()) {
                        setEditTourName(cleanTournamentString(editTourName, true));
                      }
                    }}
                    className={`w-full px-3.5 py-2 rounded-xl border font-bold text-slate-900 focus:outline-none ${
                      tourNameCheck.isValid ? 'border-slate-300 bg-slate-50' : 'border-rose-400 bg-rose-50/30'
                    }`}
                  />
                  {!tourNameCheck.isValid && (
                    <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{tourNameCheck.error}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha de Inicio</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha de Término</label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-slate-900"
                  />
                </div>
              </div>

              {/* Categorías Habilitadas */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Categorías Oficiales Habilitadas (Mínimo 1) *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {OFFICIAL_CATEGORIES.map((cat) => {
                    const checked = editCategories.includes(cat);
                    return (
                      <label
                        key={cat}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                          checked
                            ? 'bg-blue-50/80 border-[#0052fe] text-[#0052fe] font-extrabold'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              if (editCategories.length > 1) {
                                setEditCategories(editCategories.filter((c) => c !== cat));
                              }
                            } else {
                              setEditCategories([...editCategories, cat]);
                            }
                          }}
                          className="rounded text-[#0052fe]"
                        />
                        <span>{cat}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Reglas de Puntuación */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Puntos por Victoria</label>
                  <input
                    type="number"
                    value={editPointsWin}
                    onChange={(e) => setEditPointsWin(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Puntos por Empate</label>
                  <input
                    type="number"
                    value={editPointsTie}
                    onChange={(e) => setEditPointsTie(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Puntos por Derrota</label>
                  <input
                    type="number"
                    value={editPointsLoss}
                    onChange={(e) => setEditPointsLoss(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-mono font-bold"
                  />
                </div>
              </div>

              {/* SECCIÓN DE AUSPICIADORES OFICIALES (LOGO Y/O NOMBRE) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-[#0052fe]" />
                      <span>Auspiciadores Oficiales del Torneo ({editSponsors.length})</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Agrega el logo de tus auspiciadores (subiendo imagen o link) o simplemente el nombre de cada auspiciador para mostrarlos en la página del torneo.
                    </p>
                  </div>
                </div>

                {/* Formulario para añadir un nuevo auspiciador */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-white p-3.5 rounded-2xl border border-slate-200">
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nombre del Auspiciador *
                    </label>
                    <input
                      type="text"
                      value={newSponsorName}
                      onChange={(e) => setNewSponsorName(e.target.value)}
                      placeholder="Ej. Mikasa Chile / Gatorade / Municipalidad"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Logo del Auspiciador <span className="text-slate-400 font-normal">(Opcional: Subir imagen o URL)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={newSponsorLogoUrl}
                        onChange={(e) => setNewSponsorLogoUrl(e.target.value)}
                        placeholder="https://... o sube archivo ->"
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800"
                      />
                      <label className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0052fe] border border-blue-200 font-bold text-[11px] cursor-pointer flex items-center gap-1 shrink-0">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Subir Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === 'string') {
                                setNewSponsorLogoUrl(reader.result);
                                if (!newSponsorName.trim()) {
                                  setNewSponsorName(file.name.replace(/\.[^/.]+$/, ''));
                                }
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="sm:col-span-3 flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        const cleanName = sanitizeSafeInput(newSponsorName, 80);
                        const cleanLogo = newSponsorLogoUrl.trim();
                        if (!cleanName && !cleanLogo) return;
                        const sponsor: TournamentSponsor = {
                          id: 'sp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
                          name: cleanName || 'Auspiciador Oficial',
                          logoUrl: cleanLogo || undefined,
                          websiteUrl: newSponsorWebsiteUrl.trim() || undefined,
                        };
                        const updated = [...editSponsors, sponsor];
                        setEditSponsors(updated);
                        updateTournament(activeTournament.id, { sponsors: updated });
                        setNewSponsorName('');
                        setNewSponsorLogoUrl('');
                        setNewSponsorWebsiteUrl('');
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-[#0052fe] hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Auspiciador</span>
                    </button>
                  </div>
                </div>

                {/* Lista de Auspiciadores Actuales */}
                {editSponsors.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic px-1">
                    Aún no has agregado auspiciadores a este torneo.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    {editSponsors.map((sp) => (
                      <div
                        key={sp.id}
                        className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white border border-slate-200 shadow-2xs"
                      >
                        {sp.logoUrl ? (
                          <img
                            src={sp.logoUrl}
                            alt={sp.name}
                            className="h-8 w-auto max-w-[90px] object-contain rounded"
                          />
                        ) : (
                          <span className="w-7 h-7 rounded-lg bg-blue-50 text-[#0052fe] font-black text-xs flex items-center justify-center">
                            {sp.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="font-extrabold text-xs text-slate-800">{sp.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = editSponsors.filter((item) => item.id !== sp.id);
                            setEditSponsors(updated);
                            updateTournament(activeTournament.id, { sponsors: updated });
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Eliminar auspiciador"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Datos Bloqueados del Organizador */}
              <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 text-slate-700 font-black uppercase text-[11px]">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Datos Oficiales del Organizador y Sede (Bloqueados Permanentemente)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-[11px] text-slate-600">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-bold">Organizador / RUT</span>
                    <strong className="text-slate-800">{activeTournament.organizerName} ({activeTournament.organizerContact?.rut || 'Verificado'})</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-bold">Teléfono Oficial</span>
                    <strong className="text-slate-800 font-mono">{activeTournament.organizerContact?.phone || 'Verificado'}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-bold">Correo Oficial</span>
                    <strong className="text-slate-800">{activeTournament.organizerContact?.email || 'Verificado'}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-bold">Sede Oficial (Google Maps)</span>
                    <strong className="text-slate-800">{activeTournament.venue}</strong>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div>
                  {confirmDeleteThisTour ? (
                    <div className="flex items-center gap-2">
                      <span className="text-rose-700 font-bold">¿Eliminar definitivamente este torneo?</span>
                      <button
                        type="button"
                        onClick={() => deleteTournament(activeTournament.id)}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                      >
                        Sí, Eliminar Torneo
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteThisTour(false)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteThisTour(true)}
                      className="px-3.5 py-2 rounded-full text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Eliminar Torneo</span>
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!tourNameCheck.isValid}
                  className={`px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all ${
                    tourNameCheck.isValid
                      ? 'bg-[#0052fe] hover:bg-blue-700 text-white active:scale-95'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Configuración del Torneo</span>
                </button>
              </div>
            </form>
          </section>
        );
      })()}

      {/* Program Match Modal */}
      {showAddMatchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900">Programar Nuevo Partido</h3>
              <button
                onClick={() => setShowAddMatchModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMatchSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Jornada o Ronda</label>
                <input
                  type="text"
                  required
                  value={newMatchRound}
                  onChange={(e) => setNewMatchRound(e.target.value)}
                  placeholder="Ej. Jornada 1"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={newMatchDate}
                    onChange={(e) => setNewMatchDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hora</label>
                  <input
                    type="time"
                    required
                    value={newMatchTime}
                    onChange={(e) => setNewMatchTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cancha / Recinto</label>
                <input
                  type="text"
                  required
                  value={newMatchCourt}
                  onChange={(e) => setNewMatchCourt(e.target.value)}
                  placeholder="Cancha Central"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Equipo Local</label>
                  <select
                    value={newMatchHomeId}
                    onChange={(e) => setNewMatchHomeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  >
                    {clubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Equipo Visita</label>
                  <select
                    value={newMatchAwayId}
                    onChange={(e) => setNewMatchAwayId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  >
                    {clubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Link de YouTube para Transmisión en Vivo <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="url"
                  value={newMatchYoutubeUrl}
                  onChange={(e) => setNewMatchYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... (Opcional)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
                {matchYoutubeError && (
                  <p className="text-[11px] font-bold text-rose-600 mt-1">{matchYoutubeError}</p>
                )}
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMatchModal(false)}
                  className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#0052fe] text-white font-bold"
                >
                  Programar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Club Modal */}
      {showAddClubModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900">Inscribir Nuevo Club al Torneo</h3>
              <button
                onClick={() => setShowAddClubModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddClubSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre Oficial del Club *</label>
                <input
                  type="text"
                  required
                  value={newClubName}
                  onChange={(e) => setNewClubName(e.target.value)}
                  placeholder="Ej. Club Deportivo Universidad"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sigla / Corto (3-4 letras)</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={newClubShortName}
                    onChange={(e) => setNewClubShortName(e.target.value)}
                    placeholder="CDU"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Color Principal</label>
                  <input
                    type="color"
                    value={newClubColor}
                    onChange={(e) => setNewClubColor(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoría</label>
                  <select
                    value={newClubCategory}
                    onChange={(e) => setNewClubCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  >
                    {(activeTournament.categories || ['GENERAL']).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Grupo (Opcional)</label>
                  <select
                    value={newClubGroup}
                    onChange={(e) => setNewClubGroup(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  >
                    {(activeTournament.groups || ['Grupo A']).map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre del Delegado *</label>
                <input
                  type="text"
                  required
                  value={newClubManagerName}
                  onChange={(e) => setNewClubManagerName(e.target.value)}
                  placeholder="Ej. Carlos Silva"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Correo Delegado *</label>
                  <input
                    type="email"
                    required
                    value={newClubManagerEmail}
                    onChange={(e) => setNewClubManagerEmail(e.target.value)}
                    placeholder="delegado@club.cl"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teléfono Delegado</label>
                  <input
                    type="tel"
                    value={newClubManagerPhone}
                    onChange={(e) => setNewClubManagerPhone(e.target.value)}
                    placeholder="+56 9 1234 5678"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddClubModal(false)}
                  className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#0052fe] hover:bg-[#0042d0] text-white font-bold transition-colors"
                >
                  Inscribir y Generar Clave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Compartir Torneo */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 animate-in zoom-in-95">
            <div className="px-5 py-4 bg-[#081223] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#0052fe] text-white flex items-center justify-center shadow-xs">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Compartir Torneo</h3>
                  <p className="text-[10px] text-blue-300 font-bold uppercase tracking-wider truncate max-w-[250px]">
                    {activeTournament.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 text-xs">
                Comparte los enlaces públicos oficiales para que delegados, jugadores y el público sigan el torneo en tiempo real:
              </p>

              {/* 1. Vista General Pública */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-[#0052fe]" />
                    <span>Visualización General y Pública</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyShare(`${baseUrl}/?tab=resumen&tournament=${activeTournament.id}`, 'general')}
                    className="px-3 py-1 rounded-full bg-[#0052fe] hover:bg-[#0042d0] text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                  >
                    {copiedShareType === 'general' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedShareType === 'general' ? '¡Copiado!' : 'Copiar Enlace'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 font-mono truncate bg-white px-2.5 py-1.5 rounded-xl border border-slate-200">
                  {baseUrl}/?tab=resumen&tournament={activeTournament.id}
                </p>
              </div>

              {/* 2. Tabla de Posiciones */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                    <span>Tabla de Posiciones y Resultados</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyShare(`${baseUrl}/?tab=posiciones&tournament=${activeTournament.id}`, 'standings')}
                    className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                  >
                    {copiedShareType === 'standings' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedShareType === 'standings' ? '¡Copiado!' : 'Copiar Enlace'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 font-mono truncate bg-white px-2.5 py-1.5 rounded-xl border border-slate-200">
                  {baseUrl}/?tab=posiciones&tournament={activeTournament.id}
                </p>
              </div>

              {/* 3. Programación y Fixture */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-cyan-600" />
                    <span>Programación Oficial y Fixture</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyShare(`${baseUrl}/?tab=calendario&tournament=${activeTournament.id}`, 'fixture')}
                    className="px-3 py-1 rounded-full bg-cyan-700 hover:bg-cyan-800 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                  >
                    {copiedShareType === 'fixture' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedShareType === 'fixture' ? '¡Copiado!' : 'Copiar Enlace'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 font-mono truncate bg-white px-2.5 py-1.5 rounded-xl border border-slate-200">
                  {baseUrl}/?tab=calendario&tournament={activeTournament.id}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `🏆 ¡Sigue el torneo oficial "${activeTournament.name}" en TORNOW!\n\nConsulta partidos, fixture y resultados en vivo en el siguiente enlace:\n${baseUrl}/?tab=resumen&tournament=${activeTournament.id}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-4 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Compartir en WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() =>
                    handleNativeShare(
                      activeTournament.name,
                      `Sigue el torneo "${activeTournament.name}" en tiempo real en TORNOW:`,
                      `${baseUrl}/?tab=resumen&tournament=${activeTournament.id}`
                    )
                  }
                  className="py-2.5 px-4 rounded-full bg-[#081223] hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Compartir</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Regenerate Fixtures once Tournament has Started */}
      {showRegenerateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  ¿Confirmar Regeneración de Cruces?
                </h3>
                <p className="text-[11px] text-slate-500">
                  Acción requerida por el organizador
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs text-amber-900 space-y-1">
              <p className="font-bold">
                {regenerateMessage || 'El torneo ya cuenta con partidos iniciados o finalizados.'}
              </p>
              <p className="text-[11px] text-amber-800">
                Al confirmar, se recalcularán los cruces pendientes y descansos (fechas libres). Los partidos ya jugados o en curso se mantendrán intactos.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRegenerateConfirm(false)}
                className="px-4 py-2 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  generateOfficialFixtures(activeTournament.id, undefined, true);
                  setShowRegenerateConfirm(false);
                }}
                className="px-4 py-2 rounded-full text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Confirmar y Regenerar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player & Coaching Staff Registration Menu Modal */}
      {registrationClubId && clubs.find((c) => c.id === registrationClubId) && (
        <ExcelRosterModal
          club={clubs.find((c) => c.id === registrationClubId)!}
          isOpen={true}
          onClose={() => setRegistrationClubId(null)}
        />
      )}

      {/* Venue Entrance Sheets & AI Control Modal */}
      <VenueEntranceModal
        isOpen={showVenueModal}
        onClose={() => setShowVenueModal(false)}
      />
      </div>
    </div>
  );
};
