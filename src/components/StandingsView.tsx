import React, { useState, useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import { StandingRow, TournamentCategory } from '../types';
import { SPORT_CONFIGS, FORMAT_CONFIGS } from '../constants/tournamentPresets';
import { AdaptiveMenuSlider } from './AdaptiveMenuSlider';
import {
  Trophy,
  Info,
  ChevronDown,
  MoreVertical,
  Shield,
  Calendar,
  Send,
  Building,
  User,
  X,
} from 'lucide-react';

interface StandingsViewProps {
  onNavigateToClub: (clubId: string) => void;
  onNavigateToCalendar: () => void;
  onOpenNotifyModal?: (clubId: string) => void;
}

export const StandingsView: React.FC<StandingsViewProps> = ({
  onNavigateToClub,
  onNavigateToCalendar,
  onOpenNotifyModal,
}) => {
  const {
    standings,
    clubs,
    selectedCategory,
    setSelectedCategory,
    selectedGroup,
    setSelectedGroup,
    activeTournament,
  } = useTournament();

  const [showRulesModal, setShowRulesModal] = useState(false);
  const [activeMenuClubId, setActiveMenuClubId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'pts' | 'won' | 'diffSets'>('pts');

  const sportCfg = SPORT_CONFIGS[activeTournament.sport] || SPORT_CONFIGS.volleyball;
  const formatCfg = FORMAT_CONFIGS[activeTournament.format] || FORMAT_CONFIGS.round_robin;

  const categories = activeTournament.categories || ['GENERAL'];
  const groups = activeTournament.groups || ['Grupo A', 'Grupo B'];

  const isSoccerOrFutsal = activeTournament.sport === 'football' || activeTournament.sport === 'futsal';

  // Sorting
  const sortedStandings = useMemo(() => {
    return [...standings].sort((a, b) => {
      if (sortBy === 'won') return b.won - a.won || b.pts - a.pts;
      if (sortBy === 'diffSets') return b.diffSets - a.diffSets || b.pts - a.pts;
      return b.pts - a.pts || b.won - a.won;
    });
  }, [standings, sortBy]);

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* Top Banner Card */}
      <div className="bg-white rounded-[28px] p-5 sm:p-6 shadow-[0_6px_25px_rgba(0,0,0,0.03)] border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-xl bg-slate-100 text-slate-800 text-base">
                {sportCfg.emoji}
              </span>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase font-['Teko',sans-serif] sm:font-bold">
                Tabla de Posiciones
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200">
                {formatCfg.badge}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {activeTournament.name} • {selectedCategory} • Organiza: {activeTournament.organizerName}
            </p>
          </div>

          {/* Minimalist Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Categoría Dropdown */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as TournamentCategory)}
                aria-label="Seleccionar categoría"
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

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Ordenar tabla de posiciones"
                className="bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-full px-3.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer appearance-none pr-7 shadow-2xs"
              >
                <option value="pts">Puntos (Ptos)</option>
                <option value="won">Partidos Ganados (PG)</option>
                <option value="diffSets">
                  {isSoccerOrFutsal ? 'Diferencia Goles (DG)' : 'Diferencia Sets (DS)'}
                </option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>

            {/* Rules Button */}
            <button
              onClick={() => setShowRulesModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-300 text-xs text-slate-700 font-semibold transition-colors shadow-2xs"
            >
              <Info className="w-3.5 h-3.5 text-slate-600" />
              <span>Reglas</span>
            </button>
          </div>
        </div>

        {/* Group Filter Tabs (if tournament format has groups) */}
        {formatCfg.hasGroups && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <AdaptiveMenuSlider className="items-center gap-2" ariaLabel="Filtro de grupos de la tabla">
              <span className="text-[10px] font-bold uppercase text-slate-400 whitespace-nowrap shrink-0">
                Filtrar Grupo:
              </span>
              <button
                onClick={() => setSelectedGroup('ALL')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  selectedGroup === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Tabla Unificada
              </button>
              {groups.map((grp) => (
                <button
                  key={grp}
                  onClick={() => setSelectedGroup(grp)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                    selectedGroup === grp
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {grp}
                </button>
              ))}
            </AdaptiveMenuSlider>
          </div>
        )}
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-[28px] shadow-[0_6px_25px_rgba(0,0,0,0.03)] border border-slate-200/80 overflow-hidden">
        {sortedStandings.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Trophy className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <h3 className="font-bold text-xs text-slate-700">No hay clubes registrados en {selectedCategory}</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Los equipos inscritos por la administración se listarán aquí con sus cómputos de victorias, empates, derrotas y puntos.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-10">#</th>
                  <th className="py-3 px-3 min-w-[140px]">Club</th>
                  <th className="py-3 px-2 text-center">PJ</th>
                  <th className="py-3 px-2 text-center text-emerald-600 font-bold">PG</th>
                  {isSoccerOrFutsal && (
                    <th className="py-3 px-2 text-center text-amber-600 font-bold">PE</th>
                  )}
                  <th className="py-3 px-2 text-center text-rose-500">PP</th>
                  <th className="py-3 px-2 text-center">{isSoccerOrFutsal ? 'GF' : 'SF'}</th>
                  <th className="py-3 px-2 text-center">{isSoccerOrFutsal ? 'GC' : 'SC'}</th>
                  <th className="py-3 px-2 text-center hidden sm:table-cell">
                    {isSoccerOrFutsal ? 'DG' : 'DS'}
                  </th>
                  <th className="py-3 px-3 text-center bg-slate-200/80 text-slate-950 font-black">Ptos</th>
                  <th className="py-3 px-2 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {sortedStandings.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 text-xs font-semibold">
                      No hay clubes o partidos registrados en este torneo aún.
                    </td>
                  </tr>
                )}
                {sortedStandings.map((row, index) => {
                  const club = clubs.find((c) => c.id === row.clubId);
                  const isPlayoff = index < 4;

                  return (
                    <tr
                      key={row.clubId}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      {/* Position */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs ${
                            index === 0
                              ? 'bg-amber-400 text-slate-950 font-black'
                              : index === 1
                              ? 'bg-slate-200 text-slate-800'
                              : index === 2
                              ? 'bg-amber-100 text-amber-900'
                              : isPlayoff
                              ? 'bg-cyan-50 text-cyan-800'
                              : 'text-slate-400'
                          }`}
                        >
                          {index + 1}
                        </span>
                      </td>

                      {/* Club info */}
                      <td className="py-3 px-3">
                        <div
                          onClick={() => onNavigateToClub(row.clubId)}
                          className="flex items-center gap-2.5 cursor-pointer group"
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-[11px] shadow-2xs flex-shrink-0"
                            style={{ backgroundColor: club?.color || '#0052fe' }}
                          >
                            {row.shortName || row.clubName.slice(0, 3).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate max-w-[150px]">
                              {row.clubName}
                            </p>
                            {row.group && (
                              <span className="text-[9px] font-extrabold text-cyan-700 bg-cyan-50 px-1 py-0.2 rounded border border-cyan-200">
                                {row.group}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* PJ */}
                      <td className="py-3 px-2 text-center font-semibold text-slate-600">
                        {row.played}
                      </td>

                      {/* PG */}
                      <td className="py-3 px-2 text-center font-bold text-emerald-600">
                        {row.won}
                      </td>

                      {/* PE (Ties for soccer/futsal) */}
                      {isSoccerOrFutsal && (
                        <td className="py-3 px-2 text-center font-bold text-amber-600">
                          {row.tied || 0}
                        </td>
                      )}

                      {/* PP */}
                      <td className="py-3 px-2 text-center font-semibold text-rose-500">
                        {row.lost}
                      </td>

                      {/* SF / GF */}
                      <td className="py-3 px-2 text-center text-slate-600">
                        {row.setsFor}
                      </td>

                      {/* SC / GC */}
                      <td className="py-3 px-2 text-center text-slate-600">
                        {row.setsAgainst}
                      </td>

                      {/* DS / DG */}
                      <td className="py-3 px-2 text-center hidden sm:table-cell font-mono">
                        <span
                          className={
                            row.diffSets > 0
                              ? 'text-emerald-600 font-bold'
                              : row.diffSets < 0
                              ? 'text-rose-500'
                              : 'text-slate-400'
                          }
                        >
                          {row.diffSets > 0 ? `+${row.diffSets}` : row.diffSets}
                        </span>
                      </td>

                      {/* Ptos */}
                      <td className="py-3 px-3 text-center bg-slate-50 font-black text-slate-900 font-mono text-sm">
                        {row.pts}
                      </td>

                      {/* Action menu */}
                      <td className="py-3 px-2 text-center relative">
                        <button
                          onClick={() =>
                            setActiveMenuClubId(activeMenuClubId === row.clubId ? null : row.clubId)
                          }
                          className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                          aria-label="Acciones de club"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {activeMenuClubId === row.clubId && (
                          <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-40 text-left animate-in fade-in zoom-in-95">
                            <button
                              onClick={() => {
                                onNavigateToClub(row.clubId);
                                setActiveMenuClubId(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Shield className="w-3.5 h-3.5 text-slate-500" />
                              <span>Ver Nómina del Club</span>
                            </button>

                            <button
                              onClick={() => {
                                onNavigateToCalendar();
                                setActiveMenuClubId(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span>Ver Fixture del Club</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">{sportCfg.emoji}</span>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Reglas Oficiales: {sportCfg.name}
                </h3>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                <p className="font-black text-slate-900 mb-1">Sistema de Puntuación:</p>
                <p>{sportCfg.scoringSummary}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                <p className="font-black text-slate-900 mb-1">Formato de Competencia:</p>
                <p>{formatCfg.description}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                <p className="font-black text-slate-900 mb-1">Criterios de Desempate en Tabla:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Mayor cantidad de Puntos (Ptos).</li>
                  <li>Mayor número de Partidos Ganados (PG).</li>
                  <li>
                    {isSoccerOrFutsal
                      ? 'Mejor Diferencia de Gol (DG = GF - GC).'
                      : 'Mejor Diferencia de Sets (DS = SF - SC).'}
                  </li>
                  <li>Mayor cantidad de {isSoccerOrFutsal ? 'Goles a Favor (GF)' : 'Sets a Favor (SF)'}.</li>
                </ol>
              </div>
            </div>

            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full py-2.5 rounded-2xl bg-slate-900 text-white font-extrabold text-xs hover:bg-slate-800 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
