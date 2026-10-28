import React, { useState, useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import { MatchStatus, TournamentCategory, ClubInvite, UserRole, KeyDurationUnit } from '../types';
import {
  Sliders,
  Calendar,
  Save,
  CheckCircle2,
  Clock,
  Radio,
  ChevronDown,
  Plus,
  Send,
  AlertCircle,
  Users,
  Shield,
  Mail,
  Phone,
  Trash2,
  Copy,
  ExternalLink,
  Check,
  Building,
  Key,
  RefreshCw,
  Search,
  Trophy,
  Sparkles,
  Layers,
  MapPin,
  Settings,
  User,
  Briefcase,
  X,
  Globe,
  EyeOff,
  Lock,
  Unlock,
  Play,
  VideoOff,
  Inbox,
  Star,
  MessageSquare,
  Cookie,
} from 'lucide-react';
import { CreateTournamentModal } from './CreateTournamentModal';
import { ExcelRosterModal } from './ExcelRosterModal';
import { AdaptiveMenuSlider } from './AdaptiveMenuSlider';
import { SPORT_CONFIGS, FORMAT_CONFIGS } from '../constants/tournamentPresets';
import { validateHumanReadableText } from '../utils/textValidation';
import {
  calculateKeyTrialCountdown,
  formatKeyDurationLabel,
  calculateDurationDays,
} from '../logic/venueEntranceEngine';
import { validateYoutubeUrl } from '../utils/securityShield';

interface AdminPanelViewProps {
  onOpenTournamentConfig?: (tournamentId?: string) => void;
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({ onOpenTournamentConfig }) => {
  const {
    activeTournament,
    tournaments,
    setActiveTournamentId,
    toggleTournamentVisibility,
    deleteTournament,
    matches,
    clubs,
    users,
    invites,
    organizerKeys,
    createOrganizerKey,
    renewOrganizerKey,
    deleteOrganizerKey,
    toggleBlockOrganizerKey,
    currentUser,
    selectedCategory,
    setSelectedCategory,
    updateMatchSets,
    updateMatchDetails,
    createMatch,
    sendLeagueNotification,
    addClub,
    deleteClub,
    deleteUser,
    updateUserRole,
    generateNewInviteForClub,
    userFeedbacks,
    updateUserFeedbackStatus,
    deleteUserFeedback,
    notifications,
  } = useTournament();

  // Active admin section
  const [activeTab, setActiveTab] = useState<'tournaments' | 'org_keys' | 'clubs' | 'users' | 'matches' | 'new_match' | 'notify' | 'inbox'>('tournaments');
  const [adminInboxSubTab, setAdminInboxSubTab] = useState<'feedback' | 'solicitudes'>('feedback');
  const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState<'all' | 'sugerencia' | 'experiencia' | 'error' | 'elogio'>('all');
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<'all' | 'nuevo' | 'leido' | 'destacado' | 'archivado'>('all');
  const [adminNoteDrafts, setAdminNoteDrafts] = useState<Record<string, string>>({});

  const newFeedbacksCount = useMemo(
    () => userFeedbacks.filter((f) => f.status === 'nuevo').length,
    [userFeedbacks]
  );
  const averageFeedbackRating = useMemo(() => {
    if (userFeedbacks.length === 0) return '5.0';
    const sum = userFeedbacks.reduce((acc, f) => acc + (Number(f.rating) || 5), 0);
    return (sum / userFeedbacks.length).toFixed(1);
  }, [userFeedbacks]);

  const [showCreateTourModal, setShowCreateTourModal] = useState(false);
  const [showCreateOrgKeyModal, setShowCreateOrgKeyModal] = useState(false);
  const [newKeyTournamentName, setNewKeyTournamentName] = useState('');
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgEmail, setNewOrgEmail] = useState('');
  const [newOrgPhone, setNewOrgPhone] = useState('');
  const [newOrgNotes, setNewOrgNotes] = useState('');
  const [newKeyDurationUnit, setNewKeyDurationUnit] = useState<KeyDurationUnit>('months');
  const [newKeyDurationValue, setNewKeyDurationValue] = useState<number>(1);

  // Key Renewal Modal / Popover state
  const [renewingKeyId, setRenewingKeyId] = useState<string | null>(null);
  const [renewUnit, setRenewUnit] = useState<KeyDurationUnit>('months');
  const [renewValue, setRenewValue] = useState<number>(1);

  // Role filter and confirmation states
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | UserRole>('all');
  const [confirmDeleteTourId, setConfirmDeleteTourId] = useState<string | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [confirmDeleteClubId, setConfirmDeleteClubId] = useState<string | null>(null);
  const [registrationClubId, setRegistrationClubId] = useState<string | null>(null);

  // Copied feedback helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const categories: TournamentCategory[] = activeTournament.categories || ['GENERAL'];

  // Add Club Form State
  const [showAddClubModal, setShowAddClubModal] = useState(false);
  const [clubName, setClubName] = useState('');
  const [clubShortName, setClubShortName] = useState('');
  const [clubCategory, setClubCategory] = useState<TournamentCategory>(categories[0] || 'MASTER VARONES');
  const [clubGroup, setClubGroup] = useState<string>(activeTournament.groups?.[0] || 'Grupo A');
  const [clubCourt, setClubCourt] = useState('');
  const [clubColor, setClubColor] = useState('#0052fe');
  const [clubManagerName, setClubManagerName] = useState('');
  const [clubManagerEmail, setClubManagerEmail] = useState('');
  const [clubManagerPhone, setClubManagerPhone] = useState('');
  const [clubHeadCoach, setClubHeadCoach] = useState('');
  const [clubAssistantCoach, setClubAssistantCoach] = useState('');

  // Newly created invite state for email modal
  const [activeEmailInvite, setActiveEmailInvite] = useState<{
    clubName: string;
    category: TournamentCategory;
    recipientName: string;
    recipientEmail: string;
    inviteKey: string;
    inviteLink: string;
  } | null>(null);

  // User management search/filter
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // Match management state
  const uniqueDates = Array.from(new Set(matches.map((m) => m.date))).sort();
  const [selectedDate, setSelectedDate] = useState<string>('ALL');

  // New Match State
  const [newRound, setNewRound] = useState('Jornada 1');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState('19:00');
  const [newCourt, setNewCourt] = useState('Cancha Central Mikasa');
  const [newCategory, setNewCategory] = useState<TournamentCategory>(selectedCategory);
  const [newHomeId, setNewHomeId] = useState(clubs[0]?.id || '');
  const [newAwayId, setNewAwayId] = useState(clubs[1]?.id || '');
  const [newMatchYoutubeUrl, setNewMatchYoutubeUrl] = useState('');

  // Announcement State
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTargetClubId, setNotifTargetClubId] = useState('ALL');

  // Filtered list of matches
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (selectedCategory && m.category !== selectedCategory) return false;
      if (selectedDate !== 'ALL' && m.date !== selectedDate) return false;
      return true;
    });
  }, [matches, selectedCategory, selectedDate]);

  // Filtered users by search and by role
  const filteredUsers = useMemo(() => {
    const q = userSearchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
      if (!q) return true;
      const clubName = clubs.find((c) => c.id === u.clubId)?.name.toLowerCase() || '';
      return (
        u.username.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        clubName.includes(q)
      );
    });
  }, [users, userRoleFilter, userSearchQuery, clubs]);

  // Build the email body and mailto link
  const buildEmailDispatch = (invite: {
    clubName: string;
    category: TournamentCategory;
    recipientName: string;
    recipientEmail: string;
    inviteKey: string;
    inviteLink: string;
  }) => {
    const subject = encodeURIComponent(`Invitación Oficial Liga Mikasa - Registro de Organizador: ${invite.clubName}`);
    const body = encodeURIComponent(
      `Estimado(a) ${invite.recipientName},\n\n` +
      `Has sido designado(a) oficialmente como el Delegado y Organizador del club ${invite.clubName} (${invite.category}) en el Torneo Oficial Liga Mikasa.\n\n` +
      `Para activar tu cuenta de organizador y gestionar la nómina oficial de tu equipo, haz clic en el siguiente enlace:\n` +
      `${invite.inviteLink}\n\n` +
      `O bien, ingresa a la plataforma y canjea tu clave única:\n` +
      `Clave de Invitación Única: ${invite.inviteKey}\n\n` +
      `* IMPORTANTE: Esta clave es de uso único y exclusivo para 1 solo organizador por club.\n\n` +
      `Saludos cordiales,\n` +
      `Comisión Directiva Liga Mikasa`
    );
    return `mailto:${encodeURIComponent(invite.recipientEmail)}?subject=${subject}&body=${body}`;
  };

  const handleCreateClub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubName.trim() || !clubManagerEmail.trim() || !clubManagerName.trim()) {
      sendLeagueNotification({
        title: 'Campos Obligatorios',
        message: 'Por favor complete los campos obligatorios del club y contacto del organizador.',
        category: 'convocatoria',
        targetClubId: 'ALL',
        priority: 'alta',
      });
      return;
    }
    const nameCheck = validateHumanReadableText(clubName, 'El nombre del club', 3);
    if (!nameCheck.isValid) {
      sendLeagueNotification({
        title: 'Nombre de Club Inválido',
        message: nameCheck.error || 'Ingresa un nombre de club válido.',
        category: 'convocatoria',
        targetClubId: 'ALL',
        priority: 'alta',
      });
      return;
    }

    const { club, invite } = addClub({
      name: clubName.trim(),
      shortName: clubShortName.trim() || clubName.trim().slice(0, 10).toUpperCase(),
      category: clubCategory,
      group: activeTournament.format === 'short_league_groups' ? clubGroup : undefined,
      color: clubColor,
      homeCourt: clubCourt.trim() || activeTournament.venue,
      managerName: clubManagerName.trim(),
      managerEmail: clubManagerEmail.trim(),
      managerPhone: clubManagerPhone.trim(),
      headCoach: clubHeadCoach.trim(),
      assistantCoach: clubAssistantCoach.trim(),
    });

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const inviteLink = `${origin}/?invite=${invite.id}`;

    // Open functional email dispatch modal
    setActiveEmailInvite({
      clubName: club.name,
      category: club.category,
      recipientName: club.managerName,
      recipientEmail: club.managerEmail,
      inviteKey: invite.id,
      inviteLink,
    });

    // Reset form
    setClubName('');
    setClubShortName('');
    setClubCourt('');
    setClubManagerName('');
    setClubManagerEmail('');
    setClubManagerPhone('');
    setClubHeadCoach('');
    setClubAssistantCoach('');
    setShowAddClubModal(false);
  };

  const handleCreateMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (newHomeId === newAwayId) {
      sendLeagueNotification({
        title: 'Equipos Inválidos',
        message: 'El equipo local y visitante no pueden ser el mismo.',
        category: 'convocatoria',
        targetClubId: 'ALL',
        priority: 'alta',
      });
      return;
    }
    if (!newHomeId || !newAwayId) {
      sendLeagueNotification({
        title: 'Equipos Requeridos',
        message: 'Debes seleccionar un equipo local y un equipo visitante.',
        category: 'convocatoria',
        targetClubId: 'ALL',
        priority: 'alta',
      });
      return;
    }

    const ytCheck = validateYoutubeUrl(newMatchYoutubeUrl);
    if (!ytCheck.isValid) {
      sendLeagueNotification({
        title: 'Link de YouTube Inválido',
        message: ytCheck.error || 'Ingresa un enlace válido de YouTube.',
        category: 'convocatoria',
        targetClubId: 'ALL',
        priority: 'alta',
      });
      return;
    }

    createMatch({
      round: newRound,
      date: newDate,
      time: newTime,
      court: newCourt,
      category: newCategory,
      homeTeamId: newHomeId,
      awayTeamId: newAwayId,
      status: 'scheduled',
      homeSetsWon: 0,
      awaySetsWon: 0,
      youtubeLiveUrl: ytCheck.cleanUrl || undefined,
    });

    setNewMatchYoutubeUrl('');
    setActiveTab('matches');
  };

  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) return;

    sendLeagueNotification({
      title: notifTitle.trim(),
      message: notifMessage.trim(),
      category: 'convocatoria',
      targetClubId: notifTargetClubId,
      priority: 'alta',
    });

    setNotifTitle('');
    setNotifMessage('');
    setActiveTab('matches');
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* Banner Superior con Menú Desplegable de Administración */}
      <div className="bg-white rounded-[28px] p-5 shadow-[0_6px_25px_rgba(0,0,0,0.03)] border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="p-1.5 rounded-xl bg-slate-100 text-slate-800 flex-shrink-0">
                <Sliders className="w-4 h-4" />
              </span>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase font-['Teko',sans-serif] sm:font-bold truncate">
                Panel de Administración Oficial
              </h1>
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-black uppercase"
                title="Protección activa WAF Anti-XSS, Anti-SQLi, Cabeceras CSP/Nosniff y Bloqueo Anti-Fuerza Bruta"
              >
                <Shield className="w-3 h-3 text-emerald-600" />
                <span>Escudo Anti-Hackeo Activo</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              Gestión de equipos con claves únicas, keys temporales renovables y seguridad reforzada
            </p>
          </div>

          {/* Menú Desplegable de Secciones Administrativas */}
          <div className="relative flex-shrink-0">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              aria-label="Seleccionar sección administrativa"
              className="bg-slate-900 text-white hover:bg-black font-bold text-xs px-4 py-2.5 rounded-full cursor-pointer appearance-none pr-8 shadow-sm transition-colors focus:outline-none"
            >
              <option value="tournaments">🏆 Torneos Masivos ({tournaments.length})</option>
              <option value="clubs">🛡️ Clubes, Keys e Inscripción ({clubs.length})</option>
              <option value="org_keys">🔑 Claves de Organizador ({organizerKeys.length})</option>
              <option value="matches">📅 Partidos Diarios ({matches.length})</option>
              <option value="new_match">➕ Programar Partido</option>
              <option value="inbox">📥 Bandeja de Entrada • Feedback ({userFeedbacks.length})</option>
              <option value="users">👥 Usuarios ({users.length})</option>
              <option value="notify">📢 Aviso a Clubes</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-white/70 absolute right-2.5 top-3.5 pointer-events-none" />
          </div>
        </div>

        {/* Barra de Pestañas Visibles de Acceso Directo con Slider Adaptativo */}
        <div className="pt-3 mt-3 border-t border-slate-100">
          <AdaptiveMenuSlider ariaLabel="Menú de administración" className="text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('tournaments')}
              className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'tournaments'
                  ? 'bg-[#081223] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Torneos ({tournaments.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('inbox')}
              className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'inbox'
                  ? 'bg-[#081223] text-white shadow-xs'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <Inbox className="w-3.5 h-3.5 text-amber-500" />
              <span>Bandeja de Entrada & Feedback ({userFeedbacks.length})</span>
              {newFeedbacksCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                  {newFeedbacksCount} nuevos
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('clubs')}
              className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'clubs'
                  ? 'bg-[#0052fe] text-white shadow-xs'
                  : 'bg-blue-50 text-[#0052fe] hover:bg-blue-100 border border-blue-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Clubes, Keys e Inscripción de Jugadores ({clubs.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('matches')}
              className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'matches'
                  ? 'bg-[#081223] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-cyan-500" />
              <span>Partidos ({matches.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('org_keys')}
              className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'org_keys'
                  ? 'bg-[#081223] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Key className="w-3.5 h-3.5 text-emerald-500" />
              <span>Keys Temporales & Renovación ({organizerKeys.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'users'
                  ? 'bg-[#081223] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-purple-500" />
              <span>Usuarios ({users.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('new_match')}
              className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'new_match'
                  ? 'bg-[#081223] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-blue-500" />
              <span>Programar Partido</span>
            </button>
          </AdaptiveMenuSlider>
        </div>
      </div>

      {/* SECCIÓN 0: GESTIÓN DE TORNEOS DE FORMA MASIVA */}
      {activeTab === 'tournaments' && (
        <div className="space-y-4">
          <div className="bg-white rounded-[24px] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-black uppercase">
                  TORNOW Hub
                </span>
                <h2 className="text-sm font-bold text-slate-900">
                  Torneos Deportivos Masivos
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Gestiona y crea torneos para cualquier deporte, formato y organizador
              </p>
            </div>

            <button
              onClick={() => setShowCreateTourModal(true)}
              className="px-4 py-2 rounded-full bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Crear Nuevo Torneo</span>
            </button>
          </div>

          {/* Active Tournament Card */}
          <div className="p-5 rounded-3xl bg-slate-900 text-white shadow-xl border border-slate-800">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">
                  {SPORT_CONFIGS[activeTournament.sport]?.emoji || '🏆'}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Torneo Activo
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {SPORT_CONFIGS[activeTournament.sport]?.name}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-white mt-0.5">
                    {activeTournament.name}
                  </h3>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-white/10 text-slate-300 text-[10px] font-bold uppercase">
                {FORMAT_CONFIGS[activeTournament.format]?.badge || activeTournament.format}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/10 text-xs">
              <div className="space-y-1.5 text-slate-300">
                <p className="flex items-center justify-between">
                  <span className="text-slate-400">Organizador:</span>
                  <span className="font-bold text-white">
                    {activeTournament.organizerName} ({activeTournament.organizerType === 'empresa' ? 'Empresa' : 'Persona Natural'})
                  </span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-slate-400">Disciplina Deportiva:</span>
                  <span className="font-bold text-cyan-300">
                    {SPORT_CONFIGS[activeTournament.sport]?.name}
                  </span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-slate-400">Formato Oficial:</span>
                  <span className="font-semibold text-white">
                    {FORMAT_CONFIGS[activeTournament.format]?.title}
                  </span>
                </p>
              </div>

              <div className="space-y-1.5 text-slate-300">
                <p className="flex items-center justify-between">
                  <span className="text-slate-400">Sede Principal:</span>
                  <span className="font-semibold text-white truncate max-w-[180px]">
                    {activeTournament.venue}
                  </span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-slate-400">Fechas:</span>
                  <span className="font-semibold text-white">
                    {activeTournament.startDate} al {activeTournament.endDate}
                  </span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-slate-400">Categorías:</span>
                  <span className="font-bold text-white truncate max-w-[180px]">
                    {activeTournament.categories.join(', ')}
                  </span>
                </p>
              </div>
            </div>

            {/* Direct Action Buttons on Active Tournament Hero Card */}
            <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-wrap items-center gap-2">
              {onOpenTournamentConfig && (
                <button
                  type="button"
                  onClick={() => onOpenTournamentConfig(activeTournament.id)}
                  className="px-4 py-2 rounded-full bg-[#0052fe] hover:bg-blue-600 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Abrir Configuración Completa del Torneo</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('clubs');
                  setShowAddClubModal(true);
                }}
                className="px-3.5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear Club y Generar Key</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('clubs')}
                className="px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <Users className="w-3.5 h-3.5 text-cyan-300" />
                <span>Inscribir Jugadores / Clubes ({clubs.length})</span>
              </button>
              <button
                type="button"
                onClick={() => toggleTournamentVisibility(activeTournament.id)}
                className={`px-3.5 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all ${
                  activeTournament.visibility === 'hidden'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-xs'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs'
                }`}
              >
                {activeTournament.visibility === 'hidden' ? (
                  <>
                    <Globe className="w-3.5 h-3.5" />
                    <span>Validar y Hacer Público</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Validado Público • Ocultar</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('matches')}
                className="px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-300" />
                <span>Partidos y Fixture ({matches.length})</span>
              </button>
            </div>
          </div>

          {/* List of All Tournaments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-slate-600 px-1 tracking-wider">
                Listado de Torneos ({tournaments.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateTourModal(true)}
                className="px-3.5 py-1.5 rounded-full bg-[#0052fe] hover:bg-[#0042d0] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear Torneo (Sin Clave)</span>
              </button>
            </div>

            {tournaments.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-3 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0052fe] flex items-center justify-center mx-auto">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">No hay torneos registrados</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Como Administrador General, tienes permisos directos para crear cualquier torneo deportivo sin requerir claves comerciales.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateTourModal(true)}
                  className="px-5 py-2 rounded-full bg-[#0052fe] hover:bg-[#0042d0] text-white text-xs font-bold transition-all shadow-md inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Nuevo Torneo Ahora</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {tournaments.map((t) => {
                  const isActive = t.id === activeTournament.id;
                  const sportCfg = SPORT_CONFIGS[t.sport] || SPORT_CONFIGS.volleyball;
                  const fmtCfg = FORMAT_CONFIGS[t.format] || FORMAT_CONFIGS.round_robin;

                  return (
                    <div
                      key={t.id}
                      className={`p-4 rounded-2xl bg-white border transition-all ${
                        isActive
                          ? 'border-[#0052fe] shadow-sm ring-1 ring-[#0052fe]'
                          : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base">{sportCfg.emoji}</span>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                              {sportCfg.name}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#0052fe]">
                              {fmtCfg.badge}
                            </span>
                            {isActive && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#0052fe] text-white">
                                Activo
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                t.visibility === 'hidden'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {t.visibility === 'hidden' ? (
                                <>
                                  <EyeOff className="w-2.5 h-2.5" />
                                  <span>Oculto</span>
                                </>
                              ) : (
                                <>
                                  <Globe className="w-2.5 h-2.5" />
                                  <span>Público</span>
                                </>
                              )}
                            </span>
                          </div>

                          <h4 className="font-extrabold text-sm text-slate-900">{t.name}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Organiza: <strong className="text-slate-700">{t.organizerName}</strong> ({t.organizerType === 'empresa' ? 'Empresa' : 'Persona Natural'}) • Sede: {t.venue}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => toggleTournamentVisibility(t.id)}
                            className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition-colors ${
                              t.visibility === 'hidden'
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                            }`}
                            title="Validar torneo como organizador y alternar entre Público y Oculto"
                          >
                            {t.visibility === 'hidden' ? (
                              <>
                                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Hacer Público</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                                <span>Ocultar</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveTournamentId(t.id);
                              if (onOpenTournamentConfig) {
                                onOpenTournamentConfig(t.id);
                              } else {
                                setActiveTab('clubs');
                              }
                            }}
                            className="px-3.5 py-2 rounded-xl bg-[#0052fe] hover:bg-[#0042d0] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            <span>Configurar Torneo</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveTournamentId(t.id);
                              setActiveTab('clubs');
                              setShowAddClubModal(true);
                            }}
                            className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition-colors"
                          >
                            <Key className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Crear Club / Key</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveTournamentId(t.id);
                              setActiveTab('clubs');
                            }}
                            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 transition-colors"
                          >
                            <Users className="w-3.5 h-3.5 text-[#0052fe]" />
                            <span>Inscribir Jugadores</span>
                          </button>

                          {confirmDeleteTourId === t.id ? (
                            <div className="flex items-center gap-1 animate-in fade-in">
                              <button
                                type="button"
                                onClick={() => {
                                  deleteTournament(t.id);
                                  setConfirmDeleteTourId(null);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-xs transition-colors"
                              >
                                ¿Confirmar?
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteTourId(null)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                                title="Cancelar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteTourId(t.id)}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Eliminar torneo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECCIÓN CLAVES DE ORGANIZADOR (CONVENIO COMERCIAL) */}
      {activeTab === 'org_keys' && (
        <div className="space-y-4">
          <div className="bg-white rounded-[24px] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-black uppercase">
                  Convenios Comerciales
                </span>
                <h2 className="text-sm font-bold text-slate-900">
                  Claves de Organizador TORNOW ({organizerKeys.length})
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Otorga llaves únicas a empresas o personas naturales para gestionar sus torneos de forma oficial
              </p>
            </div>

            <button
              onClick={() => setShowCreateOrgKeyModal(true)}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Generar Key Organizador</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                Total Keys Generadas
              </span>
              <span className="text-2xl font-black text-slate-900 font-mono">
                {organizerKeys.length}
              </span>
            </div>
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block mb-0.5">
                Activas / Canjeadas
              </span>
              <span className="text-2xl font-black text-emerald-600 font-mono">
                {organizerKeys.filter((k) => k.status === 'redeemed').length}
              </span>
            </div>
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-600 block mb-0.5">
                Pendientes de Uso
              </span>
              <span className="text-2xl font-black text-cyan-700 font-mono">
                {organizerKeys.filter((k) => k.status === 'pending').length}
              </span>
            </div>
          </div>

          {/* List of Organizer Keys */}
          <div className="space-y-3">
            {organizerKeys.map((key) => {
              const isRedeemed = key.status === 'redeemed';
              const isBlocked = !!key.isBlocked || key.status === 'blocked';
              const trialCountdown = calculateKeyTrialCountdown({
                createdAt: key.createdAt,
                expiresAt: key.expiresAt,
                trialDays: key.trialDays || 30,
                isBlocked,
                gracePeriodStartAt: key.gracePeriodStartAt,
                renewalAppealSubmittedAt: key.renewalAppealSubmittedAt,
              });
              const durationLabel = formatKeyDurationLabel(
                key.durationUnit || 'months',
                key.durationValue || 1
              );
              const tourLabel = key.tournamentName || 'Torneo Oficial TorNow';
              const shareMessage = `¡Hola! 👋\n\nTu clave oficial de organizador (${durationLabel}) para el torneo "${tourLabel}" en la plataforma TORNOW ha sido generada:\n\n🔑 Key Única: ${key.id}\n\nIngresa a la plataforma, haz clic en "Activar Key de Organizador" y completa los datos de tu torneo para comenzar.`;

              return (
                <div
                  key={key.id}
                  className={`p-4 rounded-3xl border transition-all ${
                    isBlocked || trialCountdown.isExpired
                      ? 'bg-rose-50/40 border-rose-300 shadow-xs'
                      : isRedeemed
                      ? 'bg-white border-slate-200 shadow-xs'
                      : 'bg-white border-cyan-200 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            isBlocked
                              ? 'bg-rose-600 text-white'
                              : trialCountdown.isExpired
                              ? 'bg-amber-600 text-white'
                              : isRedeemed
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-cyan-100 text-cyan-800'
                          }`}
                        >
                          {isBlocked
                            ? '🔒 Key Bloqueada (No Renovada)'
                            : trialCountdown.isExpired
                            ? '⌛ Key Expirada (Bloqueo Activo)'
                            : isRedeemed
                            ? '✓ Cuenta Activada'
                            : '⏳ Pendiente de Canje'}
                        </span>

                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                          ⏱️ Duración: {durationLabel}
                        </span>

                        {/* Cuenta atrás de vigencia */}
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                            trialCountdown.isBlocked || trialCountdown.isExpired
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : trialCountdown.daysRemaining <= 5
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-blue-50 text-[#0052fe] border-blue-200'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>
                            {trialCountdown.isBlocked
                              ? 'Panel Bloqueado (Sin Renovar)'
                              : `Vigencia (${trialCountdown.totalTrialDays}d): ${trialCountdown.formattedCountdown}`}
                          </span>
                        </span>

                        {Boolean(key.renewalCount && key.renewalCount > 0) && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            🔄 Renovada {key.renewalCount}x
                          </span>
                        )}

                        <span className="text-[11px] text-slate-400 font-medium">
                          Creada: {key.createdAt.split('T')[0]}
                        </span>
                      </div>

                      {/* Aviso de Período de Gracia de 7 días antes de eliminación automática */}
                      {trialCountdown.isPanelLockedForNonRenewal && (
                        <div className="p-2.5 rounded-2xl bg-rose-100/80 border border-rose-300 text-rose-950 text-[11px] flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <strong className="font-black">
                              ⚠️ Panel de Organizador Bloqueado por Falta de Renovación:
                            </strong>{' '}
                            <span>
                              Si no se renueva o contacta en{' '}
                              <strong className="underline">
                                {trialCountdown.graceDaysRemaining}d {trialCountdown.graceHoursRemaining}h
                              </strong>{' '}
                              (plazo de 7 días), la Key y el torneo se eliminarán automáticamente.
                            </span>
                            {key.renewalAppealSubmittedAt && (
                              <span className="block text-emerald-800 font-extrabold mt-0.5">
                                📩 El organizador envió solicitud de contacto/apelación el{' '}
                                {key.renewalAppealSubmittedAt.split('T')[0]}.
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-slate-900 text-white">
                          🏆 {tourLabel}
                        </span>
                        <h3 className="text-sm font-black text-slate-900">
                          {key.organizerName}
                        </h3>
                      </div>

                      <p className="text-xs text-slate-500">
                        {key.organizerEmail
                          ? `${key.organizerEmail}${key.organizerPhone ? ` • ${key.organizerPhone}` : ''}`
                          : 'El organizador completará sus datos de contacto al activar la Key'}
                      </p>

                      {key.notes && (
                        <p className="text-[11px] text-slate-400 italic">
                          Nota: {key.notes}
                        </p>
                      )}

                      {isRedeemed && (
                        <p className="text-[11px] text-emerald-700 font-bold">
                          Usuario registrado: @{key.redeemedByUsername} (Canjeado el {key.redeemedAt})
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap sm:flex-col items-end gap-2">
                      <div className="flex items-center gap-1.5 p-2 rounded-2xl bg-slate-100 border border-slate-200 font-mono font-black text-xs text-slate-900">
                        <Key className="w-3.5 h-3.5 text-cyan-600" />
                        <span>{key.id}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopy(key.id, `key-${key.id}`)}
                          className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {copiedKey === `key-${key.id}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">Copiada</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copiar Key</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopy(shareMessage, `share-${key.id}`)}
                          className="px-3 py-1.5 rounded-full bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-xs font-bold flex items-center gap-1 transition-colors border border-cyan-200 cursor-pointer"
                        >
                          {copiedKey === `share-${key.id}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">Mensaje Copiado</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3 h-3" />
                              <span>Compartir</span>
                            </>
                          )}
                        </button>

                        {/* Botón Renovar Key */}
                        <button
                          type="button"
                          onClick={() => {
                            setRenewingKeyId(renewingKeyId === key.id ? null : key.id);
                            setRenewUnit('months');
                            setRenewValue(1);
                          }}
                          className="px-3 py-1.5 rounded-full bg-[#0052fe] hover:bg-blue-700 text-white text-xs font-black flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                          title="Renovar vigencia de esta Key por días, meses o anual"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Renovar Key</span>
                        </button>

                        {/* Botón Bloquear / Desbloquear Key */}
                        <button
                          type="button"
                          onClick={() => toggleBlockOrganizerKey(key.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-colors border cursor-pointer ${
                            isBlocked
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                          title={isBlocked ? 'Desbloquear esta Key' : 'Bloquear esta Key por no renovación'}
                        >
                          {isBlocked ? (
                            <>
                              <Unlock className="w-3 h-3" />
                              <span>Desbloquear</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3" />
                              <span>Bloquear</span>
                            </>
                          )}
                        </button>

                        {/* Botón Borrar Key */}
                        <button
                          type="button"
                          onClick={() => deleteOrganizerKey(key.id)}
                          className="px-2.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Borrar esta Key permanentemente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Borrar</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Panel Desplegable para Renovar Key (Días, Meses o Anual) */}
                  {renewingKeyId === key.id && (
                    <div className="mt-3 pt-3 border-t border-slate-200 bg-blue-50/60 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                      <div className="space-y-1">
                        <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 text-[#0052fe]" />
                          <span>Renovar y Desbloquear Key: {key.id}</span>
                        </span>
                        <p className="text-[11px] text-slate-600">
                          Elige el período de renovación (Días, Meses o Anual). Desbloqueará de inmediato el panel del organizador.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={renewValue}
                          onChange={(e) => setRenewValue(Math.max(1, Number(e.target.value)))}
                          className="w-16 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-900 text-center"
                          aria-label="Cantidad de tiempo a renovar"
                        />
                        <select
                          value={renewUnit}
                          onChange={(e) => setRenewUnit(e.target.value as KeyDurationUnit)}
                          className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900"
                          aria-label="Unidad de tiempo a renovar"
                        >
                          <option value="days">Días</option>
                          <option value="months">Mes(es)</option>
                          <option value="annual">Año(s) / Anual</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            renewOrganizerKey(key.id, renewUnit, renewValue);
                            setRenewingKeyId(null);
                          }}
                          className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
                        >
                          ✓ Confirmar Renovación (+{formatKeyDurationLabel(renewUnit, renewValue)})
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenewingKeyId(null)}
                          className="px-3 py-1.5 rounded-full bg-white border border-slate-300 text-slate-600 text-xs font-bold cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Modal Crear Nueva Key Temporal de Organizador (Días, Meses o Anual) */}
          {showCreateOrgKeyModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
            >
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <Key className="w-5 h-5 text-cyan-600" />
                      <span>Generar Key Temporal de Organizador</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Elige duración en días, meses o anual. Solo el nombre del torneo es obligatorio.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateOrgKeyModal(false)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                    aria-label="Cerrar modal"
                  >
                    ✕
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newKeyTournamentName.trim()) return;
                    createOrganizerKey({
                      tournamentName: newKeyTournamentName,
                      organizerName: newOrgName,
                      organizerEmail: newOrgEmail,
                      organizerPhone: newOrgPhone,
                      notes: newOrgNotes,
                      durationUnit: newKeyDurationUnit,
                      durationValue: newKeyDurationValue,
                    });
                    setNewKeyTournamentName('');
                    setNewOrgName('');
                    setNewOrgEmail('');
                    setNewOrgPhone('');
                    setNewOrgNotes('');
                    setNewKeyDurationUnit('months');
                    setNewKeyDurationValue(1);
                    setShowCreateOrgKeyModal(false);
                  }}
                  className="mt-4 space-y-3"
                >
                  <div className="p-3 rounded-2xl bg-cyan-50/70 border border-cyan-200">
                    <label className="block text-xs font-black text-slate-900 mb-1">
                      Nombre del Torneo * <span className="text-[10px] font-bold text-cyan-700">(Único campo obligatorio)</span>
                    </label>
                    <input
                      type="text"
                      value={newKeyTournamentName}
                      onChange={(e) => setNewKeyTournamentName(e.target.value)}
                      placeholder="Ej. Liga Apertura Voleibol 2026 / Copa Las Condes"
                      className="w-full bg-white border border-cyan-300 rounded-xl py-2.5 px-3 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      required
                    />
                  </div>

                  {/* Selector de Duración Temporal: Días, Meses o Anual */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#0052fe]" />
                        <span>Duración Temporal de la Key</span>
                      </label>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-[#0052fe]">
                        {formatKeyDurationLabel(newKeyDurationUnit, newKeyDurationValue)} (
                        {calculateDurationDays(newKeyDurationUnit, newKeyDurationValue)} días)
                      </span>
                    </div>

                    {/* Botones rápidos de unidad */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'days', label: 'Por Días' },
                          { id: 'months', label: 'Por Meses' },
                          { id: 'annual', label: 'Anual (Años)' },
                        ] as { id: KeyDurationUnit; label: string }[]
                      ).map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setNewKeyDurationUnit(u.id);
                            if (u.id === 'days') setNewKeyDurationValue(15);
                            if (u.id === 'months') setNewKeyDurationValue(1);
                            if (u.id === 'annual') setNewKeyDurationValue(1);
                          }}
                          className={`py-2 px-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                            newKeyDurationUnit === u.id
                              ? 'bg-[#0052fe] text-white border-[#0052fe] shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {u.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">Cantidad:</span>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={newKeyDurationValue}
                        onChange={(e) => setNewKeyDurationValue(Math.max(1, Number(e.target.value)))}
                        className="w-24 bg-white border border-slate-300 rounded-xl py-1.5 px-3 text-xs font-black text-slate-900 text-center"
                      />
                      <span className="text-xs font-bold text-slate-700">
                        {newKeyDurationUnit === 'days'
                          ? 'día(s)'
                          : newKeyDurationUnit === 'months'
                          ? 'mes(es) (30d c/u)'
                          : 'año(s) (365d c/u)'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-slate-100">
                    <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                      Datos Opcionales (El organizador los puede completar al recibir la Key)
                    </span>

                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">
                          Nombre del Organizador o Empresa <span className="text-slate-400 font-normal">(Opcional)</span>
                        </label>
                        <input
                          type="text"
                          value={newOrgName}
                          onChange={(e) => setNewOrgName(e.target.value)}
                          placeholder="Lo puede rellenar el organizador..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 font-semibold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            Correo <span className="text-slate-400 font-normal">(Opcional)</span>
                          </label>
                          <input
                            type="email"
                            value={newOrgEmail}
                            onChange={(e) => setNewOrgEmail(e.target.value)}
                            placeholder="contacto@club.cl"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            Teléfono <span className="text-slate-400 font-normal">(Opcional)</span>
                          </label>
                          <input
                            type="tel"
                            value={newOrgPhone}
                            onChange={(e) => setNewOrgPhone(e.target.value)}
                            placeholder="+56 9..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 font-semibold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">
                          Notas Internas <span className="text-slate-400 font-normal">(Opcional)</span>
                        </label>
                        <input
                          type="text"
                          value={newOrgNotes}
                          onChange={(e) => setNewOrgNotes(e.target.value)}
                          placeholder="Ej. 1 Mes de Prueba Gratuita solicitada por WhatsApp"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateOrgKeyModal(false)}
                      className="flex-1 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
                    >
                      Generar Key ({formatKeyDurationLabel(newKeyDurationUnit, newKeyDurationValue)})
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN 1: GESTIÓN DE EQUIPOS Y ENVÍO DE CLAVE ÚNICA */}
      {activeTab === 'clubs' && (
        <div className="space-y-4">
          {/* Header de sección con botón de Agregar Equipo */}
          <div className="bg-white rounded-[24px] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-[#0052fe]" />
                <span>Base Oficial de Equipos</span>
              </h2>
              <p className="text-xs text-slate-500">
                Cada equipo dispone de 1 clave única de invitación para su organizador
              </p>
            </div>

            <button
              onClick={() => setShowAddClubModal(true)}
              className="px-4 py-2 rounded-full bg-[#0052fe] hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Equipo</span>
            </button>
          </div>

          {/* Listado de Clubes */}
          {clubs.length === 0 ? (
            <div className="bg-white rounded-[28px] p-10 text-center text-slate-500 border border-slate-200/80 space-y-3">
              <Building className="w-12 h-12 mx-auto text-slate-300" />
              <div>
                <h3 className="font-bold text-sm text-slate-800">No hay equipos registrados</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  La base de equipos demo ha sido eliminada para el público. Agrega un nuevo equipo y envíale la clave de uso único a su organizador.
                </p>
              </div>
              <button
                onClick={() => setShowAddClubModal(true)}
                className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Primer Equipo</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
              {clubs.map((club) => {
                const invite = invites.find((inv) => inv.clubId === club.id);
                const organizerUser = users.find((u) => u.clubId === club.id && u.role === 'club_admin');
                const origin = typeof window !== 'undefined' ? window.location.origin : '';
                const inviteLink = invite ? `${origin}/?invite=${invite.id}` : '';

                return (
                  <div
                    key={club.id}
                    className="bg-white rounded-[26px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-200/80 space-y-3.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 flex-shrink-0"
                            style={{ backgroundColor: club.color }}
                          />
                          <h3 className="font-black text-base text-slate-900 uppercase font-['Teko',sans-serif] sm:font-bold tracking-tight truncate">
                            {club.name}
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {club.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Sigla: <strong>{club.shortName}</strong> • Cancha: {club.homeCourt} • Plantilla: {club.roster.length} jugadores
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setRegistrationClubId(club.id)}
                          className="px-3 py-1.5 rounded-full bg-[#0052fe] hover:bg-blue-700 text-white text-[11px] font-extrabold flex items-center gap-1.5 shadow-xs transition-all"
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
                              ¿Confirmar?
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteClubId(null)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteClubId(club.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                            title="Eliminar equipo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Apartado de Estado del Organizador y Clave Única */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-bold">Organizador / Delegado:</span>
                          {organizerUser ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Activo (@{organizerUser.username})</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Invitación Pendiente (1 solo organizador)</span>
                            </span>
                          )}
                        </div>

                        <p className="text-slate-700">
                          <strong>{club.managerName}</strong> &bull;{' '}
                          <a href={`mailto:${club.managerEmail}`} className="text-[#0052fe] hover:underline">
                            {club.managerEmail}
                          </a>
                          {club.managerPhone && ` • Tel: ${club.managerPhone}`}
                        </p>

                        {invite && !organizerUser && (
                          <div className="flex items-center gap-2 pt-1 font-mono text-[11px] text-slate-600">
                            <Key className="w-3 h-3 text-slate-400" />
                            <span>Clave Única: </span>
                            <span className="bg-white px-2 py-0.5 rounded-md border border-slate-300 font-bold text-slate-900">
                              {invite.id}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Botones de Envío por Correo Funcional y Copia */}
                      <div className="flex flex-wrap items-center gap-2">
                        {invite && (
                          <>
                            <a
                              href={buildEmailDispatch({
                                clubName: club.name,
                                category: club.category,
                                recipientName: club.managerName,
                                recipientEmail: club.managerEmail,
                                inviteKey: invite.id,
                                inviteLink,
                              })}
                              className="px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                              title="Abrir cliente de correo con mensaje preparado"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>Enviar por Correo</span>
                            </a>

                            <button
                              onClick={() => handleCopy(inviteLink, `link-${club.id}`)}
                              className="px-3 py-1.5 rounded-full bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors shadow-2xs"
                              title="Copiar enlace directo de invitación"
                            >
                              {copiedKey === `link-${club.id}` ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-700">¡Enlace Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Copiar Link</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => {
                                setActiveEmailInvite({
                                  clubName: club.name,
                                  category: club.category,
                                  recipientName: club.managerName,
                                  recipientEmail: club.managerEmail,
                                  inviteKey: invite.id,
                                  inviteLink,
                                });
                              }}
                              className="p-1.5 rounded-full bg-white hover:bg-slate-100 border border-slate-300 text-slate-600 transition-colors"
                              title="Ver detalles de envío por correo"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {!organizerUser && (
                          <button
                            onClick={() => {
                              const newInv = generateNewInviteForClub(
                                club.id,
                                club.managerEmail || 'delegado@club.cl',
                                club.managerName || 'Delegado Oficial'
                              );
                              handleCopy(newInv.id, `regen-${club.id}`);
                            }}
                            className="px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors"
                            title="Regenerar clave única de invitación"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN 2: USUARIOS REGISTRADOS, CAMBIO DE ROL RÁPIDO Y ELIMINAR */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white rounded-[24px] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#0052fe]" />
                <span>Gestión de Usuarios y Roles TORNOW</span>
              </h2>
              <p className="text-xs text-slate-500">
                Cambia roles de forma inmediata, otorga permisos de organizador y administra los accesos.
              </p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Buscar por usuario, nombre o correo..."
                className="bg-slate-50 border border-slate-200 rounded-full py-1.5 pl-8 pr-3 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0052fe]/20"
              />
            </div>
          </div>

          {/* Menú de Filtro de Usuarios por Rol */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 bg-slate-100 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setUserRoleFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                userRoleFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Todos</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-mono">
                {users.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setUserRoleFilter('super_admin')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                userRoleFilter === 'super_admin'
                  ? 'bg-[#081223] text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>👑 Super Admins</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
                {users.filter((u) => u.role === 'super_admin').length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setUserRoleFilter('organizer')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                userRoleFilter === 'organizer'
                  ? 'bg-[#0052fe] text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>💼 Organizadores</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
                {users.filter((u) => u.role === 'organizer').length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setUserRoleFilter('club_admin')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                userRoleFilter === 'club_admin'
                  ? 'bg-emerald-700 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🛡️ Delegados Club</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
                {users.filter((u) => u.role === 'club_admin').length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setUserRoleFilter('usuario')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                userRoleFilter === 'usuario'
                  ? 'bg-purple-700 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>👤 Usuarios</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
                {users.filter((u) => u.role === 'usuario').length}
              </span>
            </button>
          </div>

          {/* Tabla de Usuarios */}
          <div className="bg-white rounded-[28px] shadow-[0_6px_25px_rgba(0,0,0,0.03)] border border-slate-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Usuario</th>
                    <th className="py-3 px-3">Nombre</th>
                    <th className="py-3 px-3">Rol & Cambio Rápido</th>
                    <th className="py-3 px-3">Asignación</th>
                    <th className="py-3 px-3">Contacto</th>
                    <th className="py-3 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No se encontraron usuarios en esta categoría o con este filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const affiliatedClub = clubs.find((c) => c.id === user.clubId);
                      const isMainAdmin = user.username.toLowerCase() === 'admin' || user.role === 'super_admin';
                      const isSoleAdmin = isMainAdmin && users.filter((u) => u.role === 'super_admin').length <= 1;

                      return (
                        <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                          {/* Usuario */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#081223] text-white font-black text-xs flex items-center justify-center">
                                {user.fullName.charAt(0) || user.username.charAt(0)}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block font-mono">
                                  @{user.username}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {user.createdAt || 'Registrado'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Nombre */}
                          <td className="py-3 px-3 font-semibold text-slate-800">
                            {user.fullName}
                          </td>

                          {/* Rol & Fast Switcher */}
                          <td className="py-3 px-3">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                              <select
                                value={user.role}
                                disabled={isSoleAdmin}
                                onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors focus:outline-none focus:ring-2 focus:ring-[#0052fe]/20 ${
                                  user.role === 'super_admin'
                                    ? 'bg-[#081223] text-white border-slate-800'
                                    : user.role === 'organizer'
                                    ? 'bg-blue-50 text-[#0052fe] border-blue-200'
                                    : user.role === 'club_admin'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}
                                title="Cambiar rol del usuario"
                              >
                                <option value="super_admin">👑 Super Admin</option>
                                <option value="organizer">💼 Organizador</option>
                                <option value="club_admin">🛡️ Delegado Club</option>
                                <option value="usuario">👤 Usuario</option>
                              </select>

                              {user.role !== 'organizer' && !isMainAdmin && (
                                <button
                                  type="button"
                                  onClick={() => updateUserRole(user.id, 'organizer')}
                                  className="px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0052fe] font-bold text-[10px] border border-blue-200 flex items-center gap-1 transition-colors whitespace-nowrap self-start sm:self-auto"
                                  title="Otorgar permisos inmediatos de organizador de torneos"
                                >
                                  <Briefcase className="w-3 h-3" />
                                  <span>Dar Acceso Org</span>
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Asignación */}
                          <td className="py-3 px-3">
                            {user.role === 'organizer' ? (
                              <span className="text-[11px] text-blue-900 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                {user.organizerTournamentIds?.length || 0} torneo(s) creado(s)
                              </span>
                            ) : affiliatedClub ? (
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: affiliatedClub.color }}
                                />
                                <span className="font-bold text-slate-900 truncate max-w-[130px]">
                                  {affiliatedClub.name}
                                </span>
                              </div>
                            ) : isMainAdmin ? (
                              <span className="text-slate-400 text-[11px] italic">
                                Comisión Directiva TORNOW
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Sin asignación</span>
                            )}
                          </td>

                          {/* Opciones de Contacto */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5">
                              {user.email && (
                                <a
                                  href={`mailto:${user.email}?subject=Contacto Oficial TORNOW`}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                  title={`Enviar correo a ${user.email}`}
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {user.email && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(user.email, `mail-${user.id}`)}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                  title="Copiar correo"
                                >
                                  {copiedKey === `mail-${user.id}` ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                                  )}
                                </button>
                              )}
                              {user.phone && (
                                <a
                                  href={`tel:${user.phone}`}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                  title={`Llamar a ${user.phone}`}
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </td>

                          {/* Eliminar Usuario */}
                          <td className="py-3 px-3 text-right">
                            {isSoleAdmin ? (
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 rounded bg-slate-100">
                                Protegido
                              </span>
                            ) : confirmDeleteUserId === user.id ? (
                              <div className="flex items-center justify-end gap-1 animate-in fade-in">
                                <button
                                  type="button"
                                  onClick={() => {
                                    deleteUser(user.id);
                                    setConfirmDeleteUserId(null);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-xs transition-colors"
                                >
                                  ¿Confirmar?
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteUserId(null)}
                                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                                  title="Cancelar"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteUserId(user.id)}
                                className="px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors inline-flex items-center gap-1"
                                title="Eliminar usuario"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Eliminar</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 3: EDICIÓN DE PARTIDOS POR DÍA */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          {/* Barra de Filtros: Categoría y Fecha */}
          <div className="bg-white rounded-[24px] p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 pl-1">Filtrar por Día:</span>
              <div className="relative">
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  aria-label="Seleccionar día de partidos"
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-full px-3.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer appearance-none pr-7 shadow-2xs"
                >
                  <option value="ALL">Todos los Días</option>
                  {uniqueDates.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Categoría:</span>
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as TournamentCategory)}
                  aria-label="Filtrar por categoría"
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-full px-3.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer appearance-none pr-7 shadow-2xs"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Lista de Partidos para Edición Diaria */}
          {filteredMatches.length === 0 ? (
            <div className="bg-white rounded-[28px] p-8 text-center text-slate-400 border border-slate-200/80">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-500" />
              <p className="text-xs font-bold text-slate-700">No hay partidos registrados para esta fecha y categoría</p>
              <button
                onClick={() => setActiveTab('new_match')}
                className="mt-3 px-4 py-2 rounded-full bg-slate-900 text-white font-bold text-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Programar un Partido</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredMatches.map((match) => {
                const homeClub = clubs.find((c) => c.id === match.homeTeamId);
                const awayClub = clubs.find((c) => c.id === match.awayTeamId);

                return (
                  <div
                    key={match.id}
                    className="bg-white rounded-[26px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-200/80 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 text-xs">
                      <div className="flex items-center gap-2 text-slate-500">
                        <span className="font-extrabold text-[#0052fe] uppercase text-[11px]">
                          {match.round}
                        </span>
                        <span>•</span>
                        <span>{match.date} ({match.time} hs)</span>
                        <span>•</span>
                        <span className="truncate max-w-[130px]">{match.court}</span>
                      </div>

                      {/* Selector de Estado */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-500">Estado:</span>
                        <div className="relative">
                          <select
                            value={match.status}
                            onChange={(e) => {
                              const newStatus = e.target.value as MatchStatus;
                              updateMatchSets(match.id, match.homeSetsWon, match.awaySetsWon, newStatus);
                            }}
                            aria-label={`Estado de ${homeClub?.shortName || 'Local'} vs ${awayClub?.shortName || 'Visita'}`}
                            className="bg-slate-50 border border-slate-300 rounded-full px-3 py-1 text-xs font-bold text-slate-900 focus:outline-none appearance-none pr-7 cursor-pointer shadow-2xs"
                          >
                            <option value="scheduled">Programado</option>
                            <option value="live">En juego</option>
                            <option value="finished">Finalizado</option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Sets Ganados */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                        <div className="min-w-0 pr-2">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">LOCAL</span>
                          <h4 className="font-black text-sm text-slate-900 truncate uppercase font-['Teko',sans-serif] sm:font-bold">
                            {homeClub?.name || 'Local'}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-xs font-bold text-slate-500">Sets:</span>
                          <select
                            value={match.homeSetsWon}
                            onChange={(e) => updateMatchSets(match.id, Number(e.target.value), match.awaySetsWon)}
                            aria-label="Sets ganados local"
                            className="w-14 bg-white border border-slate-300 rounded-xl py-1.5 px-2 text-center text-sm font-black text-slate-900 shadow-2xs"
                          >
                            {[0, 1, 2, 3, 4, 5].map((num) => (
                              <option key={num} value={num}>{num}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                        <div className="min-w-0 pr-2">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">VISITANTE</span>
                          <h4 className="font-black text-sm text-slate-900 truncate uppercase font-['Teko',sans-serif] sm:font-bold">
                            {awayClub?.name || 'Visita'}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-xs font-bold text-slate-500">Sets:</span>
                          <select
                            value={match.awaySetsWon}
                            onChange={(e) => updateMatchSets(match.id, match.homeSetsWon, Number(e.target.value))}
                            aria-label="Sets ganados visita"
                            className="w-14 bg-white border border-slate-300 rounded-xl py-1.5 px-2 text-center text-sm font-black text-slate-900 shadow-2xs"
                          >
                            {[0, 1, 2, 3, 4, 5].map((num) => (
                              <option key={num} value={num}>{num}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Link Opcional de YouTube para Transmisión en Vivo */}
                    <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                      <div className="flex items-center gap-2 flex-1">
                        <Play className="w-3.5 h-3.5 text-rose-600 shrink-0" />
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
                          placeholder="Link de YouTube opcional (https://youtube.com/watch?v=...)"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                        />
                      </div>
                      {match.youtubeLiveUrl ? (
                        <a
                          href={match.youtubeLiveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] inline-flex items-center gap-1.5 shrink-0"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          <span>Ver partido</span>
                        </a>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400 inline-flex items-center gap-1 shrink-0">
                          <VideoOff className="w-3.5 h-3.5" />
                          <span>Partido sin transmisión en vivo</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN 4: PROGRAMAR PARTIDO */}
      {activeTab === 'new_match' && (
        <div className="bg-white rounded-[28px] p-6 shadow-[0_6px_25px_rgba(0,0,0,0.03)] border border-slate-200/80">
          <div className="pb-3 border-b border-slate-100 mb-4">
            <h2 className="text-base font-bold text-slate-900">Programar Partido en el Calendario</h2>
            <p className="text-xs text-slate-500">Agrega un nuevo encuentro a la jornada oficial</p>
          </div>

          {clubs.length < 2 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Se requieren al menos 2 equipos para programar un partido.</span>
              </p>
              <p>Ve a la sección <strong>"Equipos"</strong> para registrar los clubes de la liga.</p>
              <button
                onClick={() => {
                  setActiveTab('clubs');
                  setShowAddClubModal(true);
                }}
                className="mt-1 px-4 py-1.5 rounded-full bg-amber-900 text-white font-bold text-xs"
              >
                + Agregar Equipos Ahora
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreateMatch} className="space-y-4 max-w-lg">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jornada</label>
                  <input
                    type="text"
                    value={newRound}
                    onChange={(e) => setNewRound(e.target.value)}
                    placeholder="Ej. Jornada 1"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
                  <div className="relative">
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as TournamentCategory)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 appearance-none pr-7 cursor-pointer"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Equipo Local</label>
                  <div className="relative">
                    <select
                      value={newHomeId}
                      onChange={(e) => setNewHomeId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 appearance-none pr-7 cursor-pointer"
                    >
                      {clubs.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Equipo Visitante</label>
                  <div className="relative">
                    <select
                      value={newAwayId}
                      onChange={(e) => setNewAwayId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 appearance-none pr-7 cursor-pointer"
                    >
                      {clubs.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hora</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cancha</label>
                  <input
                    type="text"
                    value={newCourt}
                    onChange={(e) => setNewCourt(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Link de YouTube para Transmisión en Vivo <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="url"
                  value={newMatchYoutubeUrl}
                  onChange={(e) => setNewMatchYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... (Si no hay link, saldrá como Partido sin transmisión en vivo)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#0052fe] hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-colors"
                >
                  Guardar Partido en Calendario
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* SECCIÓN 5: AVISO A CLUBES */}
      {activeTab === 'notify' && (
        <div className="bg-white rounded-[28px] p-6 shadow-[0_6px_25px_rgba(0,0,0,0.03)] border border-slate-200/80">
          <div className="pb-3 border-b border-slate-100 mb-4">
            <h2 className="text-base font-bold text-slate-900">Enviar Notificación Push a Delegados</h2>
            <p className="text-xs text-slate-500">Comunica cambios de fixture, convocatorias o avisos de la liga</p>
          </div>

          <form onSubmit={handleSendNotification} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Título del Comunicado</label>
              <input
                type="text"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                placeholder="Ej. Recordatorio de entrega de nóminas"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Destinatario</label>
              <div className="relative">
                <select
                  value={notifTargetClubId}
                  onChange={(e) => setNotifTargetClubId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 appearance-none pr-7 cursor-pointer"
                >
                  <option value="ALL">📢 Todos los Clubes de la Liga</option>
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mensaje</label>
              <textarea
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
                placeholder="Escribe el texto de la notificación para los delegados..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900"
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Emitir Notificación Push</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECCIÓN 6: BANDEJA DE ENTRADA DE ADMINISTRADORES (CON OPCIÓN DE FEEDBACK DE USUARIOS) */}
      {activeTab === 'inbox' && (
        <div className="space-y-4">
          {/* Header & Sub-Navigation inside Admin Inbox */}
          <div className="bg-white rounded-[28px] p-5 sm:p-6 shadow-[0_6px_25px_rgba(0,0,0,0.03)] border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="p-2 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
                    <Inbox className="w-4 h-4" />
                  </span>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                    Bandeja de Entrada de Administradores
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold border border-slate-200">
                    <Cookie className="w-3 h-3 text-cyan-600" />
                    Cookies Generales 1h + Cache Sincronizado
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Gestiona el feedback enviado desde la ventana emergente horaria y las solicitudes de renovación de organizadores.
                </p>
              </div>

              {/* Rating Summary Pill */}
              <div className="flex items-center gap-3 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shrink-0">
                <div className="flex items-center gap-1 text-amber-400">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span className="text-sm font-black">{averageFeedbackRating}</span>
                </div>
                <div className="text-[11px] border-l border-white/15 pl-3">
                  <span className="font-extrabold text-white">{userFeedbacks.length}</span>{' '}
                  <span className="text-slate-300">opiniones recibidas</span>
                </div>
              </div>
            </div>

            {/* Opciones dentro de la Bandeja de Entrada */}
            <AdaptiveMenuSlider ariaLabel="Opciones de la bandeja de entrada" className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAdminInboxSubTab('feedback')}
                className={`px-4 py-2 rounded-full text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  adminInboxSubTab === 'feedback'
                    ? 'bg-[#0052fe] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Feedback de Usuarios ({userFeedbacks.length})</span>
                {newFeedbacksCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                    {newFeedbacksCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setAdminInboxSubTab('solicitudes')}
                className={`px-4 py-2 rounded-full text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  adminInboxSubTab === 'solicitudes'
                    ? 'bg-[#081223] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Key className="w-3.5 h-3.5 text-emerald-500" />
                <span>
                  Solicitudes de Renovación de Keys (
                  {organizerKeys.filter((k) => Boolean(k.renewalAppealSubmittedAt)).length})
                </span>
              </button>
            </AdaptiveMenuSlider>
          </div>

          {/* SUB-OPCIÓN 1: FEEDBACK DE USUARIOS */}
          {adminInboxSubTab === 'feedback' && (
            <div className="bg-white rounded-[28px] p-5 sm:p-6 shadow-[0_6px_25px_rgba(0,0,0,0.03)] border border-slate-200/80 space-y-4">
              {/* Filtros de Categoría y Estado */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-extrabold text-slate-500 mr-1">Categoría:</span>
                  {(
                    [
                      { id: 'all', label: 'Todas' },
                      { id: 'sugerencia', label: '💡 Sugerencias' },
                      { id: 'experiencia', label: '⚡ Experiencia' },
                      { id: 'elogio', label: '👏 Elogios' },
                      { id: 'error', label: '🛠️ Reportes' },
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFeedbackCategoryFilter(cat.id)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                        feedbackCategoryFilter === cat.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-extrabold text-slate-500 mr-1">Estado:</span>
                  {(
                    [
                      { id: 'all', label: 'Todos' },
                      { id: 'nuevo', label: 'Nuevos' },
                      { id: 'leido', label: 'Leídos' },
                      { id: 'destacado', label: 'Destacados' },
                      { id: 'archivado', label: 'Archivados' },
                    ] as const
                  ).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setFeedbackStatusFilter(st.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                        feedbackStatusFilter === st.id
                          ? 'bg-[#0052fe] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista de Feedback */}
              {(() => {
                const filteredFeedbacks = userFeedbacks.filter((item) => {
                  if (feedbackCategoryFilter !== 'all' && item.category !== feedbackCategoryFilter) {
                    return false;
                  }
                  if (feedbackStatusFilter !== 'all' && item.status !== feedbackStatusFilter) {
                    return false;
                  }
                  return true;
                });

                if (filteredFeedbacks.length === 0) {
                  return (
                    <div className="p-10 text-center text-slate-400 space-y-2">
                      <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-xs font-bold text-slate-600">
                        No hay registros de feedback con los filtros seleccionados.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {filteredFeedbacks.map((fb) => {
                      const categoryBadge =
                        fb.category === 'elogio'
                          ? { label: '👏 Elogio', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                          : fb.category === 'error'
                          ? { label: '🛠️ Reporte', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
                          : fb.category === 'experiencia'
                          ? { label: '⚡ Experiencia', cls: 'bg-cyan-50 text-cyan-700 border-cyan-200' }
                          : { label: '💡 Sugerencia', cls: 'bg-blue-50 text-blue-700 border-blue-200' };

                      const statusBadge =
                        fb.status === 'nuevo'
                          ? { label: 'NUEVO', cls: 'bg-rose-500 text-white' }
                          : fb.status === 'destacado'
                          ? { label: 'DESTACADO', cls: 'bg-amber-400 text-slate-950' }
                          : fb.status === 'archivado'
                          ? { label: 'ARCHIVADO', cls: 'bg-slate-200 text-slate-600' }
                          : { label: 'LEÍDO', cls: 'bg-emerald-100 text-emerald-800' };

                      return (
                        <div
                          key={fb.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            fb.status === 'nuevo'
                              ? 'bg-blue-50/30 border-blue-200 shadow-xs'
                              : 'bg-slate-50/70 border-slate-200/80'
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${statusBadge.cls}`}
                              >
                                {statusBadge.label}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${categoryBadge.cls}`}
                              >
                                {categoryBadge.label}
                              </span>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((st) => (
                                  <Star
                                    key={st}
                                    className={`w-3.5 h-3.5 ${
                                      st <= fb.rating
                                        ? 'text-amber-400 fill-amber-400'
                                        : 'text-slate-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs font-extrabold text-slate-900">
                                {fb.authorName}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-400">
                                • {fb.createdAt}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {fb.status === 'nuevo' && (
                                <button
                                  type="button"
                                  onClick={() => updateUserFeedbackStatus(fb.id, 'leido')}
                                  className="px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold transition-colors cursor-pointer"
                                >
                                  Marcar Leído
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  updateUserFeedbackStatus(
                                    fb.id,
                                    fb.status === 'destacado' ? 'leido' : 'destacado'
                                  )
                                }
                                className="px-2.5 py-1 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-extrabold transition-colors cursor-pointer"
                              >
                                {fb.status === 'destacado' ? 'Quitar Destacado' : '⭐ Destacar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => updateUserFeedbackStatus(fb.id, 'archivado')}
                                className="px-2.5 py-1 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
                              >
                                Archivar
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteUserFeedback(fb.id)}
                                aria-label={`Eliminar feedback de ${fb.authorName}`}
                                className="p-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-slate-800 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-200/70">
                            "{fb.comment}"
                          </p>

                          <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
                            <span>
                              Torneo asociado:{' '}
                              <strong className="text-slate-700">
                                {fb.tournamentName || 'Plataforma General'}
                              </strong>
                            </span>

                            {/* Nota interna de administrador */}
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={adminNoteDrafts[fb.id] ?? fb.adminNote ?? ''}
                                onChange={(e) =>
                                  setAdminNoteDrafts((prev) => ({
                                    ...prev,
                                    [fb.id]: e.target.value,
                                  }))
                                }
                                placeholder="Agregar nota interna de admin..."
                                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-800 w-48 sm:w-60"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateUserFeedbackStatus(
                                    fb.id,
                                    fb.status === 'nuevo' ? 'leido' : fb.status,
                                    adminNoteDrafts[fb.id] ?? fb.adminNote ?? ''
                                  )
                                }
                                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-black text-white text-[10px] font-bold cursor-pointer"
                              >
                                Guardar Nota
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* SUB-OPCIÓN 2: SOLICITUDES DE RENOVACIÓN DE KEYS EN BANDEJA DE ENTRADA */}
          {adminInboxSubTab === 'solicitudes' && (
            <div className="bg-white rounded-[28px] p-5 sm:p-6 shadow-[0_6px_25px_rgba(0,0,0,0.03)] border border-slate-200/80 space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900">
                Solicitudes de Renovación de Keys Recibidas
              </h3>
              {organizerKeys.filter((k) => Boolean(k.renewalAppealSubmittedAt)).length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No hay solicitudes de apelación o renovación de Keys pendientes en este momento.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {organizerKeys
                    .filter((k) => Boolean(k.renewalAppealSubmittedAt))
                    .map((k) => (
                      <div
                        key={k.id}
                        className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-xs font-black text-slate-900">
                            {k.tournamentName || 'Torneo'} • Clave: {k.id}
                          </p>
                          <p className="text-[11px] text-slate-600">
                            Organizador: {k.organizerName || 'Por definir'} ({k.organizerEmail || 'Sin correo'})
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('org_keys');
                            setRenewingKeyId(k.id);
                          }}
                          className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer"
                        >
                          🔄 Ir a Renovar Key
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL: AGREGAR NUEVO EQUIPO */}
      {showAddClubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[28px] sm:rounded-[32px] w-[95vw] max-w-md sm:max-w-xl lg:max-w-2xl p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Building className="w-5 h-5 text-[#0052fe]" />
                  <span>Agregar Nuevo Equipo a la Liga</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Se generará una key de uso único para el organizador de este club
                </p>
              </div>
              <button
                onClick={() => setShowAddClubModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClub} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre del Club *
                  </label>
                  <input
                    type="text"
                    value={clubName}
                    onChange={(e) => setClubName(e.target.value)}
                    placeholder="Ej. Club Deportivo Águilas"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sigla / Nombre Corto *
                  </label>
                  <input
                    type="text"
                    value={clubShortName}
                    onChange={(e) => setClubShortName(e.target.value.toUpperCase())}
                    placeholder="Ej. AGUILAS"
                    maxLength={10}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 uppercase"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
                  <div className="relative">
                    <select
                      value={clubCategory}
                      onChange={(e) => setClubCategory(e.target.value as TournamentCategory)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 appearance-none pr-7 cursor-pointer"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cancha Local</label>
                  <input
                    type="text"
                    value={clubCourt}
                    onChange={(e) => setClubCourt(e.target.value)}
                    placeholder="Ej. Polideportivo Central"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Apartado del Delegado / Organizador donde se enviará el correo */}
              <div className="p-4 rounded-2xl bg-cyan-50/50 border border-cyan-200/70 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-950">
                  <Mail className="w-4 h-4 text-[#0052fe]" />
                  <span>Datos del Organizador (Destinatario del Correo)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nombre del Delegado *
                    </label>
                    <input
                      type="text"
                      value={clubManagerName}
                      onChange={(e) => setClubManagerName(e.target.value)}
                      placeholder="Ej. Carlos Mendoza"
                      className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-semibold text-slate-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      value={clubManagerEmail}
                      onChange={(e) => setClubManagerEmail(e.target.value)}
                      placeholder="cmendoza@club.cl"
                      className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-semibold text-slate-900"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Teléfono / WhatsApp (Opcional)
                  </label>
                  <input
                    type="tel"
                    value={clubManagerPhone}
                    onChange={(e) => setClubManagerPhone(e.target.value)}
                    placeholder="+56 9 1234 5678"
                    className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Staff opcional */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">DT Principal</label>
                  <input
                    type="text"
                    value={clubHeadCoach}
                    onChange={(e) => setClubHeadCoach(e.target.value)}
                    placeholder="Prof. Juan Pérez"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Color Distintivo</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={clubColor}
                      onChange={(e) => setClubColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300"
                    />
                    <span className="text-xs font-mono font-semibold text-slate-600">{clubColor}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddClubModal(false)}
                  className="flex-1 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-[#0052fe] hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-md"
                >
                  Crear y Generar Clave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: APARTADO DE ENVIAR POR CORREO ELECTRÓNICO FUNCIONAL */}
      {activeEmailInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[28px] sm:rounded-[32px] w-[95vw] max-w-md sm:max-w-xl lg:max-w-2xl p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-2xl bg-cyan-50 text-[#0052fe]">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Enviar Invitación por Correo Electrónico
                  </h3>
                  <p className="text-xs text-slate-500">
                    Club: {activeEmailInvite.clubName} ({activeEmailInvite.category})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveEmailInvite(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Aviso de seguridad: clave de uso único */}
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <Key className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Clave de uso único por club:</strong>
                <span>
                  Solo puede existir 1 organizador por club. Una vez que {activeEmailInvite.recipientName} active su cuenta, la clave quedará invalidada automáticamente.
                </span>
              </div>
            </div>

            {/* Clave de Invitación y Enlace Directo */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Clave Única Asignada:
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 font-mono font-black text-sm text-slate-900">
                    {activeEmailInvite.inviteKey}
                  </div>
                  <button
                    onClick={() => handleCopy(activeEmailInvite.inviteKey, 'modal-key')}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1 shadow-2xs"
                  >
                    {copiedKey === 'modal-key' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>¡Copiada!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Clave</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Enlace Directo para el Organizador:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={activeEmailInvite.inviteLink}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 truncate"
                  />
                  <button
                    onClick={() => handleCopy(activeEmailInvite.inviteLink, 'modal-link')}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1"
                  >
                    {copiedKey === 'modal-link' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copiar Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Botón Principal: Enviar por Correo Electrónico Funcional */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <a
                href={buildEmailDispatch(activeEmailInvite)}
                className="flex-1 py-3 px-4 rounded-full bg-[#0052fe] hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all text-center"
              >
                <Mail className="w-4 h-4" />
                <span>Abrir Correo para Enviar a {activeEmailInvite.recipientEmail}</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  const fullText =
                    `Estimado(a) ${activeEmailInvite.recipientName},\n\n` +
                    `Has sido designado(a) como Organizador Oficial de ${activeEmailInvite.clubName} para la Liga Mikasa.\n\n` +
                    `Enlace directo de activación: ${activeEmailInvite.inviteLink}\n` +
                    `Clave única: ${activeEmailInvite.inviteKey}\n\n` +
                    `Nota: Esta clave es de uso único para 1 solo organizador.`;
                  handleCopy(fullText, 'modal-full-text');
                }}
                className="py-3 px-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                {copiedKey === 'modal-full-text' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>¡Texto Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copiar Texto Completo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Creador Masivo de Torneos */}
      <CreateTournamentModal
        isOpen={showCreateTourModal}
        onClose={() => setShowCreateTourModal(false)}
        onSuccess={(newTourId) => {
          if (onOpenTournamentConfig) {
            onOpenTournamentConfig(newTourId);
          } else {
            setActiveTab('clubs');
          }
        }}
      />

      {/* Menú Oficial de Inscripción de Jugadores y Cuerpo Técnico */}
      {registrationClubId && (() => {
        const targetClub = clubs.find((c) => c.id === registrationClubId);
        if (!targetClub) return null;
        return (
          <ExcelRosterModal
            club={targetClub}
            isOpen={true}
            onClose={() => setRegistrationClubId(null)}
            isReadOnly={false}
          />
        );
      })()}
    </div>
  );
};
