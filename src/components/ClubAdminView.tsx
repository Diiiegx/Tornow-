import React, { useState, useEffect, useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import { Club, Player, Position } from '../types';
import { ExcelRosterModal } from './ExcelRosterModal';
import {
  UserCheck,
  UserPlus,
  Users,
  Edit2,
  Trash2,
  MoreVertical,
  Check,
  ChevronDown,
  Crown,
  FileSpreadsheet,
  X,
  Bell,
  Award,
  Shield,
  Trophy,
  Lock,
  ShieldAlert,
  Scale,
  Send,
  MessageSquare,
  Building2,
  Download,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Globe,
  ExternalLink,
  Instagram,
  Facebook,
  Youtube,
  Share2,
} from 'lucide-react';
import { VenueEntranceModal } from './VenueEntranceModal';
import {
  calculateDeadlineStatus,
  generateVenuePdfBlob,
  generateVenueXlsxBlob,
  downloadBlobInBrowser,
  autoFillClubVenueRoster,
  fillVenueRosterWithAi,
} from '../logic/venueEntranceEngine';
import { ClubSocialLinks } from '../types';

interface ClubAdminViewProps {
  initialClubId?: string;
  onOpenLiveMatch?: (matchId: string) => void;
  onNavigateToAdmin?: () => void;
}

export const ClubAdminView: React.FC<ClubAdminViewProps> = ({ initialClubId, onNavigateToAdmin }) => {
  const {
    activeTournament,
    clubs,
    currentUser,
    standings,
    canCurrentUserEditRoster,
    addPlayerToClub,
    updatePlayerInClub,
    removePlayerFromClub,
    assignSpecialRole,
    updateClubStaff,
    updateClubSocialLinks,
    notifications,
    markNotificationRead,
    submitSanctionAppeal,
    sendDelegateMessageToOrganizer,
    matches,
    venueTemplates,
    matchVenueRosters,
    submitClubVenueRoster,
    autoFillRosterForMatch,
  } = useTournament();

  const userClubId = currentUser?.role === 'club_admin' && currentUser?.clubId
    ? currentUser.clubId
    : initialClubId || clubs[0]?.id || '';

  const [selectedClubId, setSelectedClubId] = useState<string>(userClubId);

  useEffect(() => {
    if (initialClubId && clubs.some((c) => c.id === initialClubId)) {
      setSelectedClubId(initialClubId);
    } else if (userClubId && (!selectedClubId || !clubs.some((c) => c.id === selectedClubId))) {
      setSelectedClubId(userClubId);
    }
  }, [initialClubId, userClubId, clubs, selectedClubId]);

  const activeClub = clubs.find((c) => c.id === (selectedClubId || userClubId)) || clubs[0];

  // Excel Roster Modal open state
  const [isExcelRosterOpen, setIsExcelRosterOpen] = useState(false);
  const [isEditStaffOpen, setIsEditStaffOpen] = useState(false);
  const [activeMenuPlayerId, setActiveMenuPlayerId] = useState<string | null>(null);

  // Appeal Modal & Delegate Message Modal State
  const [appealSanctionId, setAppealSanctionId] = useState<string | null>(null);
  const [appealText, setAppealText] = useState('');
  const [appealFeedback, setAppealFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [msgSubject, setMsgSubject] = useState('');
  const [msgContent, setMsgContent] = useState('');
  const [msgFeedback, setMsgFeedback] = useState<string | null>(null);

  // Staff state
  const [staffHeadCoach, setStaffHeadCoach] = useState(activeClub?.staff?.headCoach || '');
  const [staffAssistantCoach, setStaffAssistantCoach] = useState(activeClub?.staff?.assistantCoach || '');

  // Social Links state for "Más información del club"
  const [showSocialEditor, setShowSocialEditor] = useState(false);
  const [socialForm, setSocialForm] = useState<ClubSocialLinks>({
    instagram: activeClub?.socialLinks?.instagram || '',
    facebook: activeClub?.socialLinks?.facebook || '',
    tiktok: activeClub?.socialLinks?.tiktok || '',
    youtube: activeClub?.socialLinks?.youtube || '',
    twitter: activeClub?.socialLinks?.twitter || '',
    website: activeClub?.socialLinks?.website || '',
  });
  const [socialSavedFeedback, setSocialSavedFeedback] = useState<string | null>(null);

  // Venue Entrance Sheets State & Match Detection
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [autoFillSuccess, setAutoFillSuccess] = useState<string | null>(null);
  const [isAiFillingRoster, setIsAiFillingRoster] = useState(false);
  const [aiFillFeedback, setAiFillFeedback] = useState<string | null>(null);

  const nextClubMatch = useMemo(() => {
    if (!activeClub) return null;
    return matches.find(
      (m) =>
        (m.homeTeamId === activeClub.id || m.awayTeamId === activeClub.id) &&
        m.status === 'scheduled'
    );
  }, [matches, activeClub]);

  const venueDeadline = useMemo(() => {
    if (!nextClubMatch) return null;
    return calculateDeadlineStatus(nextClubMatch.date, nextClubMatch.time);
  }, [nextClubMatch]);

  const currentClubVenueRoster = useMemo(() => {
    if (!nextClubMatch || !activeClub) return null;
    return matchVenueRosters[`${nextClubMatch.id}-${activeClub.id}`];
  }, [matchVenueRosters, nextClubMatch, activeClub]);

  const opponentClub = useMemo(() => {
    if (!nextClubMatch || !activeClub) return null;
    const oppId = nextClubMatch.homeTeamId === activeClub.id ? nextClubMatch.awayTeamId : nextClubMatch.homeTeamId;
    return clubs.find((c) => c.id === oppId);
  }, [nextClubMatch, activeClub, clubs]);

  useEffect(() => {
    if (activeClub) {
      setStaffHeadCoach(activeClub.staff?.headCoach || '');
      setStaffAssistantCoach(activeClub.staff?.assistantCoach || '');
      setSocialForm({
        instagram: activeClub.socialLinks?.instagram || '',
        facebook: activeClub.socialLinks?.facebook || '',
        tiktok: activeClub.socialLinks?.tiktok || '',
        youtube: activeClub.socialLinks?.youtube || '',
        twitter: activeClub.socialLinks?.twitter || '',
        website: activeClub.socialLinks?.website || '',
      });
    }
  }, [activeClub?.id, activeClub?.socialLinks]);

  if (!activeClub) {
    return (
      <div className="bg-white rounded-[28px] p-10 text-center text-slate-500 border border-slate-200/80 space-y-3 pb-20 animate-in fade-in duration-200">
        <Shield className="w-12 h-12 mx-auto text-slate-300" />
        <h3 className="font-bold text-sm text-slate-800">Aún no hay clubes registrados en la liga</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          El administrador oficial puede agregar equipos y enviar la clave única de invitación desde el Panel de Administración.
        </p>
        {onNavigateToAdmin && (
          <button
            onClick={onNavigateToAdmin}
            className="mt-2 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-sm transition-colors"
          >
            Ir al Panel de Administración
          </button>
        )}
      </div>
    );
  }

  // Calculate Club record: PG, PP, Ptos and Standing Rank
  const standingRankIndex = standings.findIndex((s) => s.clubId === activeClub.id);
  const standingRank = standingRankIndex >= 0 ? standingRankIndex + 1 : 1;
  const clubStanding = standings.find((s) => s.clubId === activeClub.id);
  const pg = clubStanding ? clubStanding.won : 0;
  const pp = clubStanding ? clubStanding.lost : 0;
  const ptos = clubStanding ? clubStanding.pts : 0;

  const clubNotifications = notifications.filter(
    (n) => n.targetClubId === 'ALL' || n.targetClubId === activeClub?.id
  );

  const captain = activeClub?.roster.find((p) => p.isCaptain);
  const libero1 = activeClub?.roster.find((p) => p.isLibero && p.liberoType === 'principal');
  const libero2 = activeClub?.roster.find((p) => p.isLibero && p.liberoType === 'secundario');

  const isRosterEditable = activeClub ? canCurrentUserEditRoster(activeClub.id) : false;

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRosterEditable) return;
    updateClubStaff(activeClub.id, {
      headCoach: staffHeadCoach,
      assistantCoach: staffAssistantCoach,
    });
    setIsEditStaffOpen(false);
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* 
        HEADER PRINCIPAL DEL CLUB:
        - "Nombre del club centrado arriba como titular"
        - "no logo del equipo"
        - "no van estadisticas de jugadores, solo se muestran partidos ganados (PG), Partidos perdidos (PP), Puntos (Ptos)"
        - "botón principal que diga Nomina"
      */}
      <div className="bg-white rounded-[28px] p-6 shadow-[0_6px_25px_rgba(0,0,0,0.03)] border border-slate-200/80">
        {/* Titular Centrado Arriba (SIN LOGO DE EQUIPO) */}
        <div className="text-center pb-4 border-b border-slate-100">
          <div className="inline-block px-3 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider mb-1.5">
            {activeClub.category} • LIGA MIKASA
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase font-['Teko',sans-serif] sm:font-bold leading-tight">
            {activeClub.name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Delegado Oficial: <strong className="text-slate-800">{activeClub.managerName}</strong> • {activeClub.homeCourt}
          </p>

          {/* Selector desplegable de club */}
          <div className="mt-3 flex justify-center">
            <div className="relative">
              <select
                value={selectedClubId}
                onChange={(e) => {
                  setSelectedClubId(e.target.value);
                  const found = clubs.find((c) => c.id === e.target.value);
                  if (found) {
                    setStaffHeadCoach(found.staff.headCoach);
                    setStaffAssistantCoach(found.staff.assistantCoach);
                  }
                }}
                aria-label="Seleccionar club para administrar"
                className="bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-full px-4 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer appearance-none pr-8 shadow-2xs"
              >
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.category})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Solo Estadísticas de Equipo: PG, PP, Ptos */}
        <div className="grid grid-cols-3 gap-3 my-5">
          {/* Partidos Ganados (PG) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              Partidos Ganados (PG)
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
              {pg}
            </span>
          </div>

          {/* Partidos Perdidos (PP) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              Partidos Perdidos (PP)
            </span>
            <span className="text-2xl sm:text-3xl font-black text-rose-500 font-mono">
              {pp}
            </span>
          </div>

          {/* Puntos (Ptos) */}
          <div className="p-3.5 rounded-2xl bg-slate-900 text-white shadow-md text-center">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-0.5">
              Puntos (Ptos)
            </span>
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {ptos}
            </span>
          </div>
        </div>

        {/* Banner de estado de Nómina: Abierta o Cerrada por el Organizador */}
        {!isRosterEditable ? (
          <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 text-xs flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-left">
              <span className="font-extrabold block text-amber-900">Nóminas Oficiales Cerradas</span>
              <p className="text-[11px] text-amber-800">
                El comité organizador ha cerrado la modificación de planillas de juego. Puedes consultar la nómina oficial pero no realizar cambios.
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 text-xs flex items-center justify-between">
            <span className="font-bold text-emerald-900 text-[11px] flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Modificación de Nómina habilitada por el Organizador</span>
            </span>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
              Abierta
            </span>
          </div>
        )}

        {/* BOTÓN PRINCIPAL "MENÚ DE INSCRIPCIÓN" */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => setIsExcelRosterOpen(true)}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#0052fe] hover:bg-blue-700 text-white font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            <UserPlus className="w-5 h-5" />
            <span>
              Inscripción de Jugadores y Cuerpo Técnico {isRosterEditable ? '(Inscribir)' : '(Ver)'}
            </span>
          </button>
        </div>
      </div>

      {/* SECCIÓN PÚBLICA: MÁS INFORMACIÓN DEL CLUB (NOMBRE, PUESTO EN LA TABLA Y REDES SOCIALES CON ICONOS Y LINK SIMPLE) */}
      <div className="bg-white rounded-[28px] p-5 sm:p-6 shadow-[0_6px_25px_rgba(0,0,0,0.03)] border border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0052fe] text-[10px] font-black uppercase tracking-wider mb-1">
              Ficha Pública Oficial
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#0052fe]" />
              <span>Más Información del Club</span>
            </h2>
          </div>

          {isRosterEditable && (
            <button
              type="button"
              onClick={() => setShowSocialEditor(!showSocialEditor)}
              className="px-4 py-2 rounded-full bg-slate-900 hover:bg-black text-white font-extrabold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer self-start sm:self-auto"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{showSocialEditor ? 'Cerrar Editor de Redes' : 'Agregar / Editar Redes Sociales'}</span>
            </button>
          )}
        </div>

        {/* Datos Públicos Esenciales: Nombre del Equipo, Puesto en la Tabla y Redes Sociales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* 1. Nombre del Equipo */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0"
              style={{ backgroundColor: activeClub.color || '#0052fe' }}
            >
              {activeClub.shortName?.slice(0, 3) || 'CLB'}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Nombre del Equipo
              </span>
              <strong className="text-sm sm:text-base font-black text-slate-900 truncate block">
                {activeClub.name}
              </strong>
              <span className="text-[11px] text-slate-500">{activeClub.category}</span>
            </div>
          </div>

          {/* 2. Puesto en la Tabla de Posiciones */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#081223] to-[#0052fe] text-white flex items-center gap-3 shadow-sm">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-amber-300 font-black text-lg shrink-0 font-mono">
              #{standingRank}°
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-200 block">
                Puesto en la Tabla
              </span>
              <strong className="text-sm sm:text-base font-black text-white block">
                {standingRank}° Lugar Oficial
              </strong>
              <span className="text-[11px] text-blue-100">
                {ptos} Ptos • {pg} PG • {pp} PP
              </span>
            </div>
          </div>

          {/* 3. Redes Sociales con Iconos y Link Simple */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
              Redes Sociales Oficiales del Club
            </span>
            {(() => {
              const links = activeClub.socialLinks || {};
              const items = [
                {
                  key: 'instagram',
                  label: 'Instagram',
                  url: links.instagram,
                  bg: 'bg-gradient-to-r from-pink-600 to-purple-600 text-white',
                  icon: <Instagram className="w-3.5 h-3.5" />,
                },
                {
                  key: 'tiktok',
                  label: 'TikTok',
                  url: links.tiktok,
                  bg: 'bg-slate-900 text-white',
                  icon: <span className="font-black text-[11px] leading-none">♪</span>,
                },
                {
                  key: 'facebook',
                  label: 'Facebook',
                  url: links.facebook,
                  bg: 'bg-[#1877F2] text-white',
                  icon: <Facebook className="w-3.5 h-3.5" />,
                },
                {
                  key: 'youtube',
                  label: 'YouTube',
                  url: links.youtube,
                  bg: 'bg-rose-600 text-white',
                  icon: <Youtube className="w-3.5 h-3.5" />,
                },
                {
                  key: 'twitter',
                  label: 'X / Twitter',
                  url: links.twitter,
                  bg: 'bg-black text-white',
                  icon: <span className="font-black text-[11px] leading-none">𝕏</span>,
                },
                {
                  key: 'website',
                  label: 'Web',
                  url: links.website,
                  bg: 'bg-[#0052fe] text-white',
                  icon: <Globe className="w-3.5 h-3.5" />,
                },
              ].filter((item) => Boolean(item.url && item.url.trim()));

              if (items.length === 0) {
                return (
                  <p className="text-xs text-slate-400 italic">
                    El club aún no ha vinculado redes sociales.
                  </p>
                );
              }

              return (
                <div className="flex flex-wrap items-center gap-1.5">
                  {items.map((item) => (
                    <a
                      key={item.key}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold inline-flex items-center gap-1.5 shadow-2xs hover:opacity-90 transition-opacity ${item.bg}`}
                      title={`Visitar ${item.label} de ${activeClub.name}`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                    </a>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

        {socialSavedFeedback && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{socialSavedFeedback}</span>
          </div>
        )}

        {/* Formulario Desplegable para Agregar / Editar Redes Sociales del Club */}
        {showSocialEditor && isRosterEditable && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateClubSocialLinks(activeClub.id, socialForm);
              setShowSocialEditor(false);
              setSocialSavedFeedback('¡Redes sociales del club actualizadas y visibles públicamente!');
              setTimeout(() => setSocialSavedFeedback(null), 3500);
            }}
            className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-3 text-xs animate-in fade-in"
          >
            <div className="flex items-center justify-between">
              <strong className="font-extrabold text-slate-900">
                Configurar Enlaces de Redes Sociales ({activeClub.name})
              </strong>
              <span className="text-[11px] text-slate-500">
                Puedes poner el @usuario o el link directo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Instagram</label>
                <input
                  type="text"
                  value={socialForm.instagram || ''}
                  onChange={(e) => setSocialForm({ ...socialForm, instagram: e.target.value })}
                  placeholder="@miclub o https://instagram.com/..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-medium text-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">TikTok</label>
                <input
                  type="text"
                  value={socialForm.tiktok || ''}
                  onChange={(e) => setSocialForm({ ...socialForm, tiktok: e.target.value })}
                  placeholder="@miclub o https://tiktok.com/@..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-medium text-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Facebook</label>
                <input
                  type="text"
                  value={socialForm.facebook || ''}
                  onChange={(e) => setSocialForm({ ...socialForm, facebook: e.target.value })}
                  placeholder="https://facebook.com/miclub"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-medium text-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">YouTube</label>
                <input
                  type="text"
                  value={socialForm.youtube || ''}
                  onChange={(e) => setSocialForm({ ...socialForm, youtube: e.target.value })}
                  placeholder="https://youtube.com/@miclub"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-medium text-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">X / Twitter</label>
                <input
                  type="text"
                  value={socialForm.twitter || ''}
                  onChange={(e) => setSocialForm({ ...socialForm, twitter: e.target.value })}
                  placeholder="@miclub o https://x.com/..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-medium text-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Sitio Web Oficial</label>
                <input
                  type="text"
                  value={socialForm.website || ''}
                  onChange={(e) => setSocialForm({ ...socialForm, website: e.target.value })}
                  placeholder="https://miclub.cl"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-medium text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowSocialEditor(false)}
                className="px-4 py-2 rounded-full bg-white border border-slate-300 text-slate-700 font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-[#0052fe] hover:bg-blue-700 text-white font-black shadow-sm cursor-pointer"
              >
                Guardar Redes Sociales
              </button>
            </div>
          </form>
        )}
      </div>

      {/* SECCIÓN OFICIAL: CONTROL DE INGRESO A RECINTO (PRÓXIMA FECHA) */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-[28px] p-5 sm:p-6 text-white shadow-xl border border-blue-900/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
                  Planilla de Ingreso a Recinto (Próxima Fecha)
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Control Oficial 12h / 24h
                </span>
              </div>
              <p className="text-xs text-slate-300">
                La nómina debe subirse como máximo <strong>1 día antes (24h)</strong>. A las <strong>12 horas previas</strong> se bloquea automáticamente para enviar a portería del recinto.
              </p>
            </div>
          </div>

          {nextClubMatch && (
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                disabled={isAiFillingRoster || venueDeadline?.isLocked12Hours}
                onClick={async () => {
                  if (!nextClubMatch || !activeClub) return;
                  setIsAiFillingRoster(true);
                  setAiFillFeedback('🧠 IA tomando datos de la nómina...');

                  try {
                    const attendees = await fillVenueRosterWithAi({
                      club: activeClub,
                      matchInfo: {
                        venue: nextClubMatch.court || activeTournament.venue,
                        date: nextClubMatch.date,
                        time: nextClubMatch.time,
                        round: nextClubMatch.round,
                        category: String(nextClubMatch.category || activeClub.category),
                      },
                    });

                    const rosterObj = {
                      id: `mvr-${nextClubMatch.id}-${activeClub.id}`,
                      matchId: nextClubMatch.id,
                      tournamentId: activeTournament.id,
                      clubId: activeClub.id,
                      clubName: activeClub.name,
                      category: String(nextClubMatch.category || activeClub.category),
                      venue: nextClubMatch.court || activeTournament.venue,
                      matchDate: nextClubMatch.date,
                      matchTime: nextClubMatch.time,
                      round: nextClubMatch.round,
                      attendees,
                      status: venueDeadline?.isLocked12Hours ? ('locked' as const) : ('submitted' as const),
                      submittedAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };

                    submitClubVenueRoster(rosterObj);
                    setAiFillFeedback(`✨ ${attendees.length} asistentes rellenados automáticamente con IA sin errores.`);
                  } catch (err) {
                    console.error('Error filling roster with AI:', err);
                  } finally {
                    setIsAiFillingRoster(false);
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
                title="La Inteligencia Artificial tomará los datos de tu nómina oficial y rellenará la planilla para el recinto deportivo"
              >
                {isAiFillingRoster ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>IA Rellenando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Rellenar con IA</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  const attendees =
                    currentClubVenueRoster?.attendees && currentClubVenueRoster.attendees.length > 0
                      ? currentClubVenueRoster.attendees
                      : autoFillClubVenueRoster(activeClub, { excludeSuspended: true });

                  const { doc, filename } = generateVenuePdfBlob({
                    venueName: nextClubMatch.court || activeTournament.venue,
                    entranceGate: 'Acceso Peatonal Principal',
                    tournamentName: activeTournament.name,
                    category: String(nextClubMatch.category || activeClub.category),
                    matchDate: nextClubMatch.date,
                    matchTime: nextClubMatch.time,
                    round: nextClubMatch.round,
                    clubsRosters: [{ clubName: activeClub.name, attendees }],
                    organizerName: activeTournament.organizerName,
                  });
                  doc.save(filename);
                }}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 border border-white/20 transition-colors whitespace-nowrap cursor-pointer"
                title="Descargar Planilla en formato PDF"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Descargar PDF</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const attendees =
                    currentClubVenueRoster?.attendees && currentClubVenueRoster.attendees.length > 0
                      ? currentClubVenueRoster.attendees
                      : autoFillClubVenueRoster(activeClub, { excludeSuspended: true });

                  const { blob, filename } = generateVenueXlsxBlob({
                    venueName: nextClubMatch.court || activeTournament.venue,
                    entranceGate: 'Acceso Peatonal Principal',
                    tournamentName: activeTournament.name,
                    category: String(nextClubMatch.category || activeClub.category),
                    matchDate: nextClubMatch.date,
                    matchTime: nextClubMatch.time,
                    round: nextClubMatch.round,
                    clubsRosters: [{ clubName: activeClub.name, attendees }],
                    organizerName: activeTournament.organizerName,
                  });
                  downloadBlobInBrowser(blob, filename);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-400/40 font-bold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                title="Descargar Planilla en formato Excel (.XLSX) para portería"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Descargar Excel (.XLSX)</span>
              </button>
            </div>
          )}
        </div>

        {aiFillFeedback && (
          <div className="p-2.5 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{aiFillFeedback}</span>
          </div>
        )}

        {nextClubMatch && venueDeadline ? (
          <div className="space-y-3">
            {/* Match and Deadline Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Match Details */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1 text-xs">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                  Próximo Encuentro Programado
                </span>
                <p className="font-extrabold text-sm text-white">
                  vs {opponentClub?.name || 'Rival por definir'}
                </p>
                <p className="text-slate-300">
                  📅 {nextClubMatch.date} a las ⏰ {nextClubMatch.time} hrs • {nextClubMatch.round}
                </p>
                <p className="text-slate-300 flex items-center gap-1">
                  📍 Recinto: <strong className="text-white">{nextClubMatch.court || activeTournament.venue}</strong>
                </p>
              </div>

              {/* Deadline Status */}
              <div className={`p-3.5 rounded-2xl border flex flex-col justify-between ${venueDeadline.badgeBg} text-slate-900`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white shadow-2xs ${venueDeadline.badgeText}`}>
                    {venueDeadline.label}
                  </span>
                  <span className="text-xs font-mono font-extrabold">
                    {venueDeadline.hoursRemaining}h restantes
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-medium mt-1">
                  {venueDeadline.description}
                </p>
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-600 border-t border-slate-300/60 mt-1">
                  <span>Plazo de Carga: Máximo 24h antes</span>
                  <span>Bloqueo: A 12h del inicio</span>
                </div>
              </div>
            </div>

            {autoFillSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{autoFillSuccess}</span>
              </div>
            )}

            {/* Current Roster Status & Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2.5 text-xs">
                {currentClubVenueRoster ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      Nómina confirmada con <strong>{currentClubVenueRoster.attendees.length} asistentes</strong> (Jugadores y Cuerpo Técnico)
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Nómina aún no confirmada para esta fecha deportiva.</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={venueDeadline.isLocked12Hours}
                  onClick={() => {
                    if (!nextClubMatch) return;
                    autoFillRosterForMatch(nextClubMatch.id, activeClub.id);
                    setAutoFillSuccess('¡Nómina de ingreso rellenada automáticamente con éxito excluyendo jugadores suspendidos!');
                    setTimeout(() => setAutoFillSuccess(null), 3000);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Rellenar Automáticamente</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowVenueModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>{venueDeadline.isLocked12Hours ? 'Ver Asistentes' : 'Editar Nómina'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center text-xs text-slate-300 space-y-1">
            <Clock className="w-5 h-5 mx-auto text-slate-400" />
            <p className="font-bold text-white">No tienes partidos programados en la próxima fecha deportiva.</p>
            <p className="text-[11px] text-slate-400">
              Solo los equipos confirmados para la fecha tienen la opción de actualizar la nómina de ingreso al recinto.
            </p>
          </div>
        )}
      </div>

      {/* Official Designations: Capitán, Líberos, Entrenador, Asistente y Analista */}
      <div className="bg-white rounded-[28px] p-5 sm:p-6 shadow-[0_6px_25px_rgba(0,0,0,0.03)] border border-slate-200/80">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-[#0052fe]" />
              <span>Designaciones Oficiales del Club</span>
            </h3>
            <p className="text-xs text-slate-400">
              Capitán, Líberos, Entrenador, Asistente y Analista del Equipo
            </p>
          </div>

          <button
            onClick={() => setIsExcelRosterOpen(true)}
            className="text-xs text-[#0052fe] hover:text-blue-700 font-bold flex items-center gap-1"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Inscribir DT / Asistente / Analista</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Capitán Selector */}
          <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/70 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span>Capitán (C)</span>
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                Banda oficial
              </span>
            </div>
            <div className="relative">
              <select
                value={captain?.id || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    assignSpecialRole(activeClub.id, e.target.value, 'capitan');
                  }
                }}
                aria-label="Seleccionar capitán del equipo"
                className="w-full bg-white border border-amber-300 rounded-xl py-1.5 px-3 text-xs font-bold text-slate-900 focus:outline-none appearance-none pr-7 cursor-pointer shadow-2xs"
              >
                <option value="">Seleccionar Capitán...</option>
                {activeClub.roster.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.dorsal} {p.name} {p.paternalSurname || ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Líbero 1 Selector */}
          <div className="p-3.5 rounded-2xl bg-cyan-50/50 border border-cyan-200/70 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-900 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-cyan-600" />
                <span>Líbero Principal (L1)</span>
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 font-bold">
                Oficial
              </span>
            </div>
            <div className="relative">
              <select
                value={libero1?.id || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    assignSpecialRole(activeClub.id, e.target.value, 'libero_1');
                  }
                }}
                aria-label="Seleccionar líbero principal"
                className="w-full bg-white border border-cyan-300 rounded-xl py-1.5 px-3 text-xs font-bold text-slate-900 focus:outline-none appearance-none pr-7 cursor-pointer shadow-2xs"
              >
                <option value="">Seleccionar Líbero 1...</option>
                {activeClub.roster.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.dorsal} {p.name} {p.paternalSurname || ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Líbero 2 Selector */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-slate-600" />
                <span>Líbero 2 (L2)</span>
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                Suplente
              </span>
            </div>
            <div className="relative">
              <select
                value={libero2?.id || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    assignSpecialRole(activeClub.id, e.target.value, 'libero_2');
                  }
                }}
                aria-label="Seleccionar líbero secundario"
                className="w-full bg-white border border-slate-300 rounded-xl py-1.5 px-3 text-xs font-bold text-slate-900 focus:outline-none appearance-none pr-7 cursor-pointer shadow-2xs"
              >
                <option value="">Seleccionar Líbero 2...</option>
                {activeClub.roster.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.dorsal} {p.name} {p.paternalSurname || ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Cuerpo Técnico (Entrenador, Asistente y Analista) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1 mb-1">
              <UserCheck className="w-3.5 h-3.5 text-slate-800" />
              <span>Cuerpo Técnico</span>
            </span>
            <div className="text-xs space-y-0.5">
              <p className="font-bold text-slate-900 truncate">
                DT: {activeClub.staff.headCoach || 'Sin asignar'}
              </p>
              <p className="text-slate-600 text-[11px] truncate">
                Asist: {activeClub.staff.assistantCoach || 'Sin asignar'}
              </p>
              <p className="text-slate-500 text-[11px] truncate">
                Analista: {activeClub.staff.analyst || 'Sin asignar'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Roster Registered Players Table */}
      <div className="bg-white rounded-[28px] p-5 sm:p-6 shadow-[0_6px_25px_rgba(0,0,0,0.03)] border border-slate-200/80">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-800" />
            <h3 className="font-bold text-sm text-slate-900">
              Jugadores Inscritos ({activeClub.roster.length} jugadores)
            </h3>
          </div>
          <button
            onClick={() => setIsExcelRosterOpen(true)}
            className="text-xs font-bold text-[#0052fe] hover:text-blue-700 flex items-center gap-1"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Abrir Menú de Inscripción</span>
          </button>
        </div>

        {/* Excel-like compact table */}
        <div className="border border-slate-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-3 text-center w-12 border-r border-slate-200">N°</th>
                <th className="py-2.5 px-3 border-r border-slate-200">Nombre</th>
                <th className="py-2.5 px-3 border-r border-slate-200">Apellido Paterno</th>
                <th className="py-2.5 px-3 border-r border-slate-200">Apellido Materno</th>
                <th className="py-2.5 px-3 border-r border-slate-200">RUT</th>
                <th className="py-2.5 px-3 border-r border-slate-200">Posición</th>
                <th className="py-2.5 px-3 text-center border-r border-slate-200">Rol</th>
                <th className="py-2.5 px-3 text-center">Estado / Sanción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {activeClub.roster.map((player) => {
                const activeSanction = (activeTournament.sanctions || []).find(
                  (s) =>
                    s.playerId === player.id &&
                    (s.status === 'active' || s.status === 'appealed')
                );
                const isPlayerInhabilitado = Boolean(player.isSuspended || activeSanction);
                const datesCount = activeSanction?.matchesSuspended || player.suspendedMatchesRemaining || 1;
                const allowAppeals = activeTournament.allowSanctionAppeals !== false;

                return (
                  <tr
                    key={player.id}
                    className={`transition-colors ${
                      isPlayerInhabilitado ? 'bg-rose-50/60 hover:bg-rose-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2 px-3 text-center font-bold text-slate-900 font-mono border-r border-slate-200">
                      #{player.dorsal}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200">
                      {player.name}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-800 border-r border-slate-200">
                      {player.paternalSurname || '-'}
                    </td>
                    <td className="py-2 px-3 text-slate-600 border-r border-slate-200">
                      {player.maternalSurname || '-'}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600 border-r border-slate-200">
                      {player.rut || '-'}
                    </td>
                    <td className="py-2 px-3 text-slate-700 border-r border-slate-200">
                      {player.position}
                    </td>
                    <td className="py-2 px-3 text-center border-r border-slate-200">
                      {player.isCaptain ? (
                        <span className="text-amber-800 text-[11px] font-extrabold">
                          Capitán
                        </span>
                      ) : player.isLibero ? (
                        <span className="text-cyan-800 text-[11px] font-extrabold">
                          {player.liberoType === 'secundario' ? 'Líbero 2' : 'Líbero 1'}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {isPlayerInhabilitado ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[11px] font-black text-rose-700 uppercase">
                            INHABILITADO ({datesCount} {datesCount === 1 ? 'fecha' : 'fechas'})
                          </span>
                          {activeSanction?.status === 'appealed' ? (
                            <span className="text-[10px] font-bold text-amber-700">
                              Apelación en revisión
                            </span>
                          ) : (
                            allowAppeals &&
                            activeSanction && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAppealSanctionId(activeSanction.id);
                                  setAppealText('');
                                  setAppealFeedback(null);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold shadow-2xs transition-colors"
                              >
                                Apelar Sanción
                              </button>
                            )
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-700">
                          Habilitado
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sanciones del Club, Apelaciones y Comunicación con el Organizador */}
      <div className="bg-white rounded-[28px] p-5 sm:p-6 shadow-[0_6px_25px_rgba(0,0,0,0.03)] border border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-rose-600" />
              <span>Tribunal de Disciplina y Contacto con Organización</span>
            </h3>
            <p className="text-xs text-slate-500">
              Consulta jugadores inhabilitados de tu club, presenta apelaciones si están habilitadas o envía mensajes al organizador.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setMsgSubject('');
              setMsgContent('');
              setMsgFeedback(null);
              setShowMessageModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#0052fe] hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 self-start sm:self-center shadow-xs transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Enviar Mensaje al Organizador</span>
          </button>
        </div>

        {appealFeedback && (
          <div
            className={`p-3 rounded-xl text-xs font-bold border ${
              appealFeedback.ok
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {appealFeedback.text}
          </div>
        )}

        {msgFeedback && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold">
            {msgFeedback}
          </div>
        )}

        {/* List sanctions belonging to this club */}
        {(() => {
          const clubSanctions = (activeTournament.sanctions || []).filter(
            (s) => s.clubId === activeClub.id
          );
          const allowAppeals = activeTournament.allowSanctionAppeals !== false;

          if (clubSanctions.length === 0) {
            return (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center justify-between">
                <span>Tu club no registra jugadores sancionados ni inhabilitados en este momento.</span>
                <span className="font-bold text-emerald-700">Plantel 100% Habilitado</span>
              </div>
            );
          }

          return (
            <div className="space-y-2.5">
              {clubSanctions.map((sanc) => {
                const isInhabilitado = sanc.status === 'active' || sanc.status === 'appealed';
                return (
                  <div
                    key={sanc.id}
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isInhabilitado
                        ? 'bg-rose-50/50 border-rose-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900">
                        <span className="text-rose-700 font-mono">#{sanc.playerDorsal}</span>
                        <span>{sanc.playerName}</span>
                        <span aria-hidden="true">·</span>
                        <span className={isInhabilitado ? 'text-rose-700' : 'text-emerald-700'}>
                          {isInhabilitado
                            ? `INHABILITADO PARA JUGAR (${sanc.matchesSuspended} fecha/s)`
                            : 'HABILITADO'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700">
                        <strong>Motivo:</strong> {sanc.reason}
                      </p>
                      {sanc.appealResolution && (
                        <p className="text-xs font-bold text-slate-900">
                          Resolución del Comité: {sanc.appealResolution}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0">
                      {sanc.status === 'active' && (
                        allowAppeals ? (
                          <button
                            type="button"
                            onClick={() => {
                              setAppealSanctionId(sanc.id);
                              setAppealText('');
                              setAppealFeedback(null);
                            }}
                            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors"
                          >
                            Presentar Apelación
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-500">
                            Apelaciones desactivadas por el organizador
                          </span>
                        )
                      )}
                      {sanc.status === 'appealed' && (
                        <span className="text-xs font-bold text-amber-700">
                          Apelación enviada al Comité
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Received Notifications for this club */}
      <div className="bg-white rounded-[28px] p-5 sm:p-6 shadow-[0_6px_25px_rgba(0,0,0,0.03)] border border-slate-200/80">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-800" />
            <span>Comunicados y Notificaciones para el Club</span>
          </h3>
          <span className="text-xs text-slate-400">{clubNotifications.length} avisos</span>
        </div>

        <div className="space-y-2">
          {clubNotifications.map((n) => {
            const isRead = currentUser ? n.readBy.includes(currentUser.id) : false;
            return (
              <div
                key={n.id}
                className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  !isRead ? 'bg-cyan-50/40 border-cyan-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-0.5 text-[11px] text-slate-500 font-semibold">
                    <span className="uppercase font-bold text-slate-800">
                      {n.category.replace('_', ' ')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{n.timestamp}</span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">{n.title}</h4>
                  <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                </div>

                {!isRead && currentUser && (
                  <button
                    onClick={() => markNotificationRead(n.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors whitespace-nowrap self-start sm:self-center shadow-2xs"
                  >
                    Enterado
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL DE APELACIÓN DE SANCIÓN PARA DELEGADOS */}
      {appealSanctionId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>Presentar Apelación al Comité</span>
              </h3>
              <button
                type="button"
                onClick={() => setAppealSanctionId(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const res = submitSanctionAppeal(
                  appealSanctionId,
                  appealText,
                  `${activeClub.managerName} (${activeClub.name})`
                );
                setAppealFeedback({ ok: res.success, text: res.message });
                if (res.success) {
                  setAppealSanctionId(null);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descargos y Fundamentos de la Apelación *
                </label>
                <textarea
                  rows={4}
                  value={appealText}
                  onChange={(e) => setAppealText(e.target.value)}
                  placeholder="Expón los argumentos o antecedentes para que el Comité Organizador revise la sanción..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052fe]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAppealSanctionId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider shadow-sm"
                >
                  Confirmar Apelación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA ENVIAR MENSAJE AL ORGANIZADOR */}
      {showMessageModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#0052fe]" />
                <span>Mensaje a la Bandeja del Organizador</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowMessageModal(null as unknown as boolean)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const res = sendDelegateMessageToOrganizer({
                  clubId: activeClub.id,
                  senderName: `${activeClub.managerName} (${activeClub.name})`,
                  subject: msgSubject,
                  content: msgContent,
                  type: 'mensaje_delegado',
                });
                if (res.success) {
                  setMsgFeedback(res.message);
                  setShowMessageModal(false);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Asunto *
                </label>
                <input
                  type="text"
                  value={msgSubject}
                  onChange={(e) => setMsgSubject(e.target.value)}
                  placeholder="Ej. Solicitud de reprogramación / Consulta de planilla"
                  className="w-full text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052fe]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mensaje para el Comité Organizador *
                </label>
                <textarea
                  rows={4}
                  value={msgContent}
                  onChange={(e) => setMsgContent(e.target.value)}
                  placeholder="Escribe tu mensaje oficial para el organizador del campeonato..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052fe]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMessageModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0052fe] hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar Mensaje</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXCEL ROSTER SPREADSHEET MODAL */}
      <ExcelRosterModal
        club={activeClub}
        isOpen={isExcelRosterOpen}
        onClose={() => setIsExcelRosterOpen(false)}
        isReadOnly={!isRosterEditable}
      />

      {/* Edit Staff Modal */}
      {isEditStaffOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-slate-900" />
                <span>Cuerpo Técnico • {activeClub.name}</span>
              </h3>
              <button
                onClick={() => setIsEditStaffOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Entrenador Principal (Head Coach)
                </label>
                <input
                  type="text"
                  value={staffHeadCoach}
                  onChange={(e) => setStaffHeadCoach(e.target.value)}
                  placeholder="Ej. Prof. Marcelo Wainstein"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-900 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Asistente Técnico (Assistant Coach)
                </label>
                <input
                  type="text"
                  value={staffAssistantCoach}
                  onChange={(e) => setStaffAssistantCoach(e.target.value)}
                  placeholder="Ej. Ariel Kaplan"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-900 font-semibold"
                  required
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditStaffOpen(false)}
                  className="flex-1 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-[#0052fe] hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-md"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Planillas de Ingreso a Recintos */}
      <VenueEntranceModal
        isOpen={showVenueModal}
        onClose={() => setShowVenueModal(false)}
        initialClubId={activeClub.id}
      />
    </div>
  );
};
