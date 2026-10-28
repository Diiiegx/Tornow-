import React, { useState, useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import { MatchBoxCard } from './MatchBoxCard';
import { PlayoffNodeGraph } from './PlayoffNodeGraph';
import { PricingPlansSection } from './PricingPlansSection';
import { SPORT_CONFIGS, FORMAT_CONFIGS } from '../constants/tournamentPresets';
import {
  Search,
  ArrowRight,
  Trophy,
  Calendar,
  ChevronDown,
  Building,
  User,
  MapPin,
  Sparkles,
  Plus,
  Layers,
  MessageCircle,
  Gift,
  Award,
  ExternalLink,
} from 'lucide-react';
import { TournamentCategory, Standing, PlayoffMatchup, PlayoffStage } from '../types';
import { AdaptiveMenuSlider } from './AdaptiveMenuSlider';

interface DashboardHomeViewProps {
  onNavigateToTab: (tab: 'posiciones' | 'calendario' | 'marcador' | 'club' | 'admin' | 'organizer') => void;
  onNavigateToClub: (clubId: string) => void;
  onOpenSelectTournament?: () => void;
}

export const DashboardHomeView: React.FC<DashboardHomeViewProps> = ({
  onNavigateToTab,
  onNavigateToClub,
  onOpenSelectTournament,
}) => {
  const {
    matches,
    clubs,
    standings,
    selectedCategory,
    setSelectedCategory,
    selectedGroup,
    setSelectedGroup,
    activeTournament,
    updateTournament,
    tournaments,
    currentUser,
  } = useTournament();

  const [searchQuery, setSearchQuery] = useState('');

  const hasTournaments = tournaments.length > 0 && activeTournament.id !== 'none';
  const sportCfg = SPORT_CONFIGS[activeTournament.sport] || SPORT_CONFIGS.volleyball;
  const formatCfg = FORMAT_CONFIGS[activeTournament.format] || FORMAT_CONFIGS.round_robin;

  const categories = activeTournament.categories || ['GENERAL'];
  const groups = activeTournament.groups || ['Grupo A', 'Grupo B'];

  // Filter matches by category and group
  const categoryMatches = useMemo(() => {
    return matches.filter((m) => {
      if (selectedCategory && m.category !== selectedCategory) return false;
      if (selectedGroup && selectedGroup !== 'ALL' && m.group && m.group !== selectedGroup) return false;
      return true;
    });
  }, [matches, selectedCategory, selectedGroup]);

  const { displayedLive, displayedUpcoming } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filterBySearch = (list: typeof categoryMatches) => {
      if (!q) return list;
      return list.filter((m) => {
        const home = clubs.find((c) => c.id === m.homeTeamId)?.name.toLowerCase() || '';
        const away = clubs.find((c) => c.id === m.awayTeamId)?.name.toLowerCase() || '';
        return home.includes(q) || away.includes(q) || m.round.toLowerCase().includes(q);
      });
    };
    return {
      displayedLive: filterBySearch(categoryMatches.filter((m) => m.status === 'live')),
      displayedUpcoming: filterBySearch(categoryMatches.filter((m) => m.status === 'scheduled')),
    };
  }, [categoryMatches, searchQuery, clubs]);

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

  const handleSavePlayoffs = (matchups: PlayoffMatchup[], stage: PlayoffStage) => {
    if (!activeTournament?.id) return;
    updateTournament(activeTournament.id, {
      playoffs: {
        enabled: true,
        startingStage: stage,
        matchups,
      },
    });
  };

  const isOrganizerUser =
    currentUser?.role === 'organizer' ||
    currentUser?.role === 'super_admin' ||
    Boolean(activeTournament?.organizerUserId && activeTournament.organizerUserId === currentUser?.id);

  const freeTrialWhatsappUrl = `https://wa.me/56957950579?text=${encodeURIComponent(
    '¡Hola equipo TorNow! 👋 Quiero solicitar mi Key de 1 MES DE PRUEBA GRATUITA para organizar mi torneo deportivo. ¿Me pueden ayudar a activarla?'
  )}`;

  const renderFreeTrialWhatsappBanner = () => (
    <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-950 via-[#081223] to-[#0052fe] text-white shadow-xl border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
      <div className="space-y-1.5 relative z-10 max-w-xl">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
          <Gift className="w-3.5 h-3.5 text-emerald-400" />
          <span>Promoción Oficial Organizadores • 30 Días Gratis</span>
        </div>
        <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
          🎁 ¡Solicita tu 1 Mes de Prueba Gratuita para tu Torneo o Liga!
        </h3>
        <p className="text-xs text-slate-200 leading-relaxed">
          ¿Organizas un campeonato deportivo? Escríbenos ahora mismo por <strong>WhatsApp</strong> y un integrante de nuestro equipo te responderá al instante con tu <strong>Key Oficial de 30 Días Gratis</strong> (solo necesitamos el nombre de tu torneo).
        </p>
      </div>

      <a
        href={freeTrialWhatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider inline-flex items-center gap-2 shadow-lg transition-transform active:scale-95 shrink-0 cursor-pointer"
      >
        <MessageCircle className="w-4 h-4 fill-slate-950" />
        <span>Pedir Prueba Gratis por WhatsApp</span>
      </a>
    </div>
  );

  if (!hasTournaments) {
    return (
      <div className="space-y-4 pb-20 animate-in fade-in duration-200">
        {renderFreeTrialWhatsappBanner()}

        <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-3 shadow-sm">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 text-[#0052fe] flex items-center justify-center">
            <Trophy className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">No hay torneos activos en este momento</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Todos los torneos de prueba han sido limpiados. Los organizadores con clave o administradores pueden crear campeonatos oficiales desde sus paneles.
          </p>
          {(currentUser?.role === 'organizer' || currentUser?.role === 'super_admin') && (
            <div className="pt-2">
              <button
                onClick={() => onNavigateToTab(currentUser.role === 'organizer' ? 'organizer' : 'admin')}
                className="px-5 py-2.5 rounded-full bg-[#0052fe] hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-transform active:scale-95"
              >
                Ir al Panel de {currentUser.role === 'organizer' ? 'Organizador' : 'Administrador'}
              </button>
            </div>
          )}
        </div>

        {/* Playoff Node Graph & Categorized Plans even when no active tournament */}
        <PlayoffNodeGraph
          clubs={clubs}
          standings={formattedStandings}
          savedMatchups={[]}
          isOrganizer={isOrganizerUser}
          onSavePlayoffs={handleSavePlayoffs}
        />

        <PricingPlansSection />
      </div>
    );
  }

  return (
    <div className="space-y-3.5 pb-20 animate-in fade-in duration-200">
      {/* Banner 1 Mes de Prueba Gratuita con WhatsApp */}
      {renderFreeTrialWhatsappBanner()}

      {/* 1. Hero Card: Active Tournament Overview with Organizer & Format */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#081223] via-[#0e1d38] to-[#081223] text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xl">{sportCfg.emoji}</span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-wider border border-blue-500/30">
              {sportCfg.name}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 text-[10px] font-extrabold uppercase">
              {formatCfg.badge}
            </span>
          </div>

          {onOpenSelectTournament && (
            <button
              onClick={onOpenSelectTournament}
              className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 text-[10px] font-bold flex items-center gap-1 transition-colors whitespace-nowrap"
            >
              <Layers className="w-3 h-3 text-blue-400" />
              <span>Mis Torneos</span>
            </button>
          )}
        </div>

        <h1 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug">
          {activeTournament.name}
        </h1>

        {/* Organizer info: Empresa u organizador persona natural */}
        <div className="mt-2.5 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            {activeTournament.organizerType === 'empresa' ? (
              <Building className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            ) : (
              <User className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            )}
            <span className="font-bold text-white truncate max-w-[220px]">
              {activeTournament.organizerName}
            </span>
            <span className="text-[10px] text-slate-400">
              ({activeTournament.organizerType === 'empresa' ? 'Empresa' : 'Persona Natural'})
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <MapPin className="w-3 h-3 text-blue-400" />
            <span className="truncate max-w-[150px]">{activeTournament.venue}</span>
          </div>
        </div>

        {/* Auspiciadores Oficiales del Torneo (si el organizador configuró logos o nombres) */}
        {activeTournament.sponsors && activeTournament.sponsors.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-300 flex items-center gap-1.5 mb-2">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Auspiciadores Oficiales del Torneo</span>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {activeTournament.sponsors.map((sp) => {
                const badgeContent = (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 transition-colors">
                    {sp.logoUrl ? (
                      <img
                        src={sp.logoUrl}
                        alt={sp.name}
                        className="h-6 w-auto max-w-[80px] object-contain rounded bg-white px-1 py-0.5"
                      />
                    ) : (
                      <span className="w-5 h-5 rounded-md bg-blue-500/30 text-blue-200 font-black text-[10px] flex items-center justify-center">
                        {sp.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="text-xs font-extrabold text-white">{sp.name}</span>
                    {sp.websiteUrl && <ExternalLink className="w-3 h-3 text-blue-300" />}
                  </div>
                );
                return sp.websiteUrl ? (
                  <a
                    key={sp.id}
                    href={sp.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {badgeContent}
                  </a>
                ) : (
                  <div key={sp.id}>{badgeContent}</div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Search Bar Capsule */}
      <div className="relative w-full">
        <div className="bg-white rounded-2xl px-5 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-200/80 flex items-center justify-between transition-all focus-within:ring-2 focus-within:ring-cyan-500/20">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar club, jornada o partido..."
            className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
        </div>
      </div>

      {/* 3. Menú de Categoría Dinámica de TORNOW con Slider Simple Adaptativo */}
      <div className="bg-white rounded-2xl px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 pl-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
              Categoría:
            </span>
            <span className="font-black text-sm text-slate-900 uppercase font-['Teko',sans-serif] sm:font-bold tracking-tight truncate">
              {selectedCategory}
            </span>
          </div>

          <div className="relative flex-shrink-0">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as TournamentCategory)}
              aria-label="Seleccionar categoría del torneo"
              className="bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none cursor-pointer appearance-none pr-8 shadow-2xs"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>

        {categories.length > 1 && (
          <AdaptiveMenuSlider ariaLabel="Slider de categorías del torneo" compact>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#0052fe] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </AdaptiveMenuSlider>
        )}
      </div>

      {/* 4. Groups Selector if format has groups */}
      {formatCfg.hasGroups && (
        <AdaptiveMenuSlider ariaLabel="Selector de grupos">
          <span className="text-[10px] font-bold uppercase text-slate-400 px-1 whitespace-nowrap shrink-0">
            Fase:
          </span>
          <button
            onClick={() => setSelectedGroup('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              selectedGroup === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Todos los Grupos
          </button>
          {groups.map((grp) => (
            <button
              key={grp}
              onClick={() => setSelectedGroup(grp)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                selectedGroup === grp
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {grp}
            </button>
          ))}
        </AdaptiveMenuSlider>
      )}

      {/* PARTIDOS EN JUEGO (si existen) */}
      {displayedLive.length > 0 && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 animate-pulse" />
              <span>Partidos En Juego</span>
            </h3>
            <span className="text-[11px] font-bold text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-200">
              {displayedLive.length} activo(s)
            </span>
          </div>

          <div className="space-y-3">
            {displayedLive.map((match) => (
              <MatchBoxCard
                key={match.id}
                match={match}
                onNavigateToClub={onNavigateToClub}
              />
            ))}
          </div>
        </div>
      )}

      {/* PARTIDOS QUE VIENEN */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-700" />
            <span>Partidos que vienen</span>
          </h3>

          <button
            onClick={() => onNavigateToTab('calendario')}
            className="text-xs font-bold text-[#0052fe] hover:text-blue-700 flex items-center gap-1"
          >
            <span>Ver Calendario</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {displayedUpcoming.length === 0 ? (
          <div className="bg-white rounded-[24px] p-6 text-center text-slate-400 border border-slate-200">
            <p className="text-xs font-bold text-slate-600">No hay partidos programados próximos</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Programa nuevos encuentros desde el Panel de Administración.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedUpcoming.slice(0, 3).map((match) => (
              <MatchBoxCard
                key={match.id}
                match={match}
                onNavigateToClub={onNavigateToClub}
              />
            ))}
          </div>
        )}
      </div>

      {/* TABLA RESUMEN */}
      <div className="bg-white rounded-[28px] p-5 sm:p-6 shadow-[0_6px_25px_rgba(0,0,0,0.03)] border border-slate-200/80 mt-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Tabla de Posiciones • {selectedCategory}</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {activeTournament.sport === 'football' || activeTournament.sport === 'futsal'
                ? 'PJ (Jugados), PG (Ganados), PE (Empatados), PP (Perdidos), Ptos'
                : 'Partidos jugados (PJ), ganados (PG), perdidos (PP) y puntos (Ptos)'}
            </p>
          </div>

          <button
            onClick={() => onNavigateToTab('posiciones')}
            className="text-xs font-bold text-[#0052fe] hover:text-blue-700 transition-colors"
          >
            Ver Tabla &rarr;
          </button>
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-3 text-center w-8">#</th>
                <th className="py-2.5 px-3">Club</th>
                <th className="py-2.5 px-2 text-center text-slate-700">PJ</th>
                <th className="py-2.5 px-2 text-center text-emerald-600 font-bold">PG</th>
                {(activeTournament.sport === 'football' || activeTournament.sport === 'futsal') && (
                  <th className="py-2.5 px-2 text-center text-amber-600 font-bold">PE</th>
                )}
                <th className="py-2.5 px-2 text-center text-rose-500">PP</th>
                <th className="py-2.5 px-3 text-center bg-slate-200/70 font-black text-slate-900">Ptos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {standings.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTournament.sport === 'football' || activeTournament.sport === 'futsal' ? 7 : 6}
                    className="py-6 text-center text-slate-400 text-xs"
                  >
                    No hay clubes o partidos finalizados en esta categoría aún.
                  </td>
                </tr>
              ) : (
                standings.slice(0, 4).map((row, index) => (
                  <tr
                    key={row.clubId}
                    onClick={() => onNavigateToClub(row.clubId)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-3 text-center font-bold text-slate-500">
                      {index + 1}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 truncate max-w-[140px]">
                      {row.clubName}
                      {row.group && (
                        <span className="ml-1.5 text-[9px] px-1 py-0.2 bg-slate-100 text-slate-500 rounded">
                          {row.group}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-600">
                      {row.played}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-emerald-600">
                      {row.won}
                    </td>
                    {(activeTournament.sport === 'football' || activeTournament.sport === 'futsal') && (
                      <td className="py-2.5 px-2 text-center font-bold text-amber-600">
                        {row.tied || 0}
                      </td>
                    )}
                    <td className="py-2.5 px-2 text-center text-rose-500">
                      {row.lost}
                    </td>
                    <td className="py-2.5 px-3 text-center font-black text-slate-900 bg-slate-50 font-mono">
                      {row.pts}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. SECCIÓN PRINCIPAL: CRUCES DE PLAYOFFS & ANIMACIÓN DE NODOS INTERACTIVOS */}
      <section className="space-y-2 pt-2">
        <PlayoffNodeGraph
          clubs={clubs}
          standings={formattedStandings}
          savedMatchups={activeTournament.playoffs?.matchups || []}
          isOrganizer={isOrganizerUser}
          onSavePlayoffs={handleSavePlayoffs}
        />
      </section>

      {/* 6. PLANES Y CATEGORÍAS OFICIALES TORNOW! */}
      <section className="pt-2">
        <PricingPlansSection />
      </section>
    </div>
  );
};

