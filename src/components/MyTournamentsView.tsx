import React, { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  Settings,
  Plus,
  ArrowRight,
  Share2,
  Check,
  Shield,
  Activity,
  ChevronRight,
  Layers,
  Sparkles,
  Lock,
  Globe,
  EyeOff,
} from 'lucide-react';
import { SPORT_CONFIGS } from '../constants/tournamentPresets';
import { Tournament } from '../types';

interface MyTournamentsViewProps {
  onNavigateToTab: (tab: 'organizer' | 'calendario' | 'posiciones' | 'admin') => void;
  onOpenCreateTournament?: () => void;
}

export const MyTournamentsView: React.FC<MyTournamentsViewProps> = ({
  onNavigateToTab,
  onOpenCreateTournament,
}) => {
  const {
    tournaments,
    activeTournamentId,
    setActiveTournamentId,
    toggleTournamentVisibility,
    currentUser,
    allClubs,
    allMatches,
  } = useTournament();

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // If user is organizer, prioritize their owned tournaments.
  // If user is super_admin, show all tournaments.
  // Otherwise show all active tournaments in the platform.
  const isOrganizer = currentUser?.role === 'organizer';
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const myTournaments = isOrganizer
    ? tournaments.filter((t) => t.organizerUserId === currentUser.id)
    : tournaments;

  // Tournaments list to display: if organizer has none yet, also show all available tournaments with option to create
  const displayTournaments = myTournaments.length > 0 ? myTournaments : tournaments;

  const handleEnterSettings = (tournament: Tournament) => {
    setActiveTournamentId(tournament.id);
    onNavigateToTab('organizer');
  };

  const handleCopyLink = (tournamentId: string) => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/?tournament=${tournamentId}&tab=resumen`;
      navigator.clipboard.writeText(url);
      setCopiedId(tournamentId);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Header Banner */}
      <section className="bg-gradient-to-r from-[#081223] via-[#0d1f42] to-[#0052fe] text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#0052fe] text-white text-[10px] font-black uppercase tracking-wider">
                Mis Torneos Activos
              </span>
              <span className="text-xs text-blue-200 font-bold">
                {isOrganizer ? 'Panel de Organizador' : isSuperAdmin ? 'Administración Global' : 'Exploración de Ligas'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Torneos y Campeonatos
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Selecciona cualquiera de tus torneos para entrar a su panel de configuración, programar cruces, gestionar clubes y actualizar resultados oficiales.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(isOrganizer || isSuperAdmin) && (
              <button
                type="button"
                onClick={() => onNavigateToTab('organizer')}
                className="px-4 py-2.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-white/20 font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 flex-shrink-0"
              >
                <Settings className="w-4 h-4 text-cyan-400" />
                <span>Panel de Gestión & Sanciones</span>
              </button>
            )}
            {onOpenCreateTournament && (
              <button
                type="button"
                onClick={onOpenCreateTournament}
                className="px-5 py-2.5 rounded-full bg-white text-[#081223] hover:bg-blue-50 font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 flex-shrink-0"
              >
                <Plus className="w-4 h-4 text-[#0052fe]" />
                <span>Crear Nuevo Torneo</span>
              </button>
            )}
          </div>
        </div>

        {/* Quota counter for organizers */}
        {isOrganizer && currentUser && (
          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-blue-200">
            <span>
              Torneos creados con tu clave: <strong className="text-white">{myTournaments.length}</strong> de <strong className="text-white">{currentUser.tournamentQuota || 1}</strong> autorizados.
            </span>
            <span className="text-[11px] bg-black/30 px-2.5 py-1 rounded-full border border-white/10 font-mono">
              1 Torneo por Clave Comercial
            </span>
          </div>
        )}
      </section>

      {/* Tournaments Grid */}
      {displayTournaments.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-[#0052fe] mx-auto">
            <Trophy className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-900">Aún no tienes torneos activos</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Crea tu primer campeonato deportivo oficial para generar fixture de partidos, tablas de posiciones y nóminas de clubes.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {onOpenCreateTournament && (
              <button
                onClick={onOpenCreateTournament}
                className="px-5 py-2.5 rounded-full bg-[#0052fe] hover:bg-[#0042d0] text-white font-bold text-xs inline-flex items-center gap-2 shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Mi Primer Torneo</span>
              </button>
            )}
            {(isOrganizer || isSuperAdmin) && (
              <button
                onClick={() => onNavigateToTab('organizer')}
                className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs inline-flex items-center gap-2 shadow"
              >
                <Settings className="w-4 h-4 text-cyan-400" />
                <span>Abrir Panel de Gestión, Sanciones y Clubes</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {displayTournaments.map((tournament) => {
            const isActive = tournament.id === activeTournamentId;
            const sportCfg = SPORT_CONFIGS[tournament.sport] || SPORT_CONFIGS.volleyball;
            const tourClubs = allClubs.filter((c) => c.tournamentId === tournament.id);
            const tourMatches = allMatches.filter((m) => m.tournamentId === tournament.id);
            const finishedMatches = tourMatches.filter((m) => m.status === 'finished');

            return (
              <div
                key={tournament.id}
                className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all duration-200 flex flex-col justify-between space-y-4 hover:shadow-md ${
                  isActive
                    ? 'border-[#0052fe] ring-2 ring-[#0052fe]/20 shadow-md'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Card Top: Sport & Status Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-sm">
                      {sportCfg.emoji}
                    </span>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                        {sportCfg.name} • {tournament.format.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isActive && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                        Activo Ahora
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
                        tournament.visibility === 'hidden'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {tournament.visibility === 'hidden' ? (
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
                </div>

                {/* Tournament Title & Details */}
                <div className="space-y-2">
                  <h2 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                    {tournament.name}
                  </h2>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">
                      {tournament.organizerContact?.commune ? `${tournament.venue}, ${tournament.organizerContact.commune}` : tournament.venue}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>Inicio: {tournament.startDate} • Fin: {tournament.endDate}</span>
                  </p>
                </div>

                {/* Categories Badges */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Categorías Habilitadas ({tournament.categories?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {tournament.categories?.map((cat) => (
                      <span
                        key={cat}
                        className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200/60"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-center">
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Clubes</span>
                    <span className="text-sm font-black text-slate-900">{tourClubs.length}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Partidos</span>
                    <span className="text-sm font-black text-slate-900">
                      {finishedMatches.length} / {tourMatches.length}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col gap-2">
                  {/* Primary Enter Configuration Button */}
                  <button
                    type="button"
                    onClick={() => handleEnterSettings(tournament)}
                    className="w-full py-2.5 px-4 rounded-full bg-[#0052fe] hover:bg-[#0042d0] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow transition-all active:scale-95"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Entrar a Configuración del Torneo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Organizer Validation Toggle Button: Público / Oculto */}
                  {(isSuperAdmin ||
                    (isOrganizer &&
                      (!tournament.organizerUserId || tournament.organizerUserId === currentUser?.id))) && (
                    <button
                      type="button"
                      onClick={() => toggleTournamentVisibility(tournament.id)}
                      className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all ${
                        tournament.visibility === 'hidden'
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                      }`}
                    >
                      {tournament.visibility === 'hidden' ? (
                        <>
                          <Globe className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Validar Torneo y Poner en Público</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                          <span>Torneo Validado (Público) • Poner en Oculto</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Secondary Fast Actions */}
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTournamentId(tournament.id);
                        onNavigateToTab('calendario');
                      }}
                      className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors"
                    >
                      Partidos
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTournamentId(tournament.id);
                        onNavigateToTab('posiciones');
                      }}
                      className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors"
                    >
                      Tabla
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(tournament.id)}
                      className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors flex items-center justify-center gap-1"
                    >
                      {copiedId === tournament.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Listo</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3 h-3" />
                          <span>Compartir</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
