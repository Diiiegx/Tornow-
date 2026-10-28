import React, { useState, useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import { Match, MatchStatus, TournamentCategory } from '../types';
import { MatchBoxCard } from './MatchBoxCard';
import { SPORT_CONFIGS } from '../constants/tournamentPresets';
import { generateRoundRobinFixtures } from '../logic/tournamentScheduler';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  Filter,
  Coffee,
  Info,
} from 'lucide-react';

interface CalendarViewProps {
  onOpenLiveScorer: (matchId: string) => void;
  onNavigateToClub: (clubId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  onOpenLiveScorer,
  onNavigateToClub,
}) => {
  const { matches, clubs, selectedCategory, setSelectedCategory, activeTournament } = useTournament();

  const [selectedRound, setSelectedRound] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const sportCfg = SPORT_CONFIGS[activeTournament.sport] || SPORT_CONFIGS.volleyball;
  const categories: TournamentCategory[] = activeTournament.categories || ['GENERAL'];
  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort();

  // Filter clubs of current category to detect odd teams and calculate byes
  const categoryClubs = useMemo(() => {
    return clubs.filter((c) => !selectedCategory || c.category === selectedCategory);
  }, [clubs, selectedCategory]);

  const isOddTeams = categoryClubs.length > 2 && categoryClubs.length % 2 !== 0;

  const scheduleInfo = useMemo(() => {
    const emptyByes: Record<string, { round: string; teamId: string; teamName: string }> = {};
    if (!isOddTeams) return { byesPerRound: emptyByes };
    return generateRoundRobinFixtures(
      categoryClubs,
      activeTournament.id,
      selectedCategory,
      activeTournament.venue,
      activeTournament.startDate
    );
  }, [categoryClubs, isOddTeams, activeTournament, selectedCategory]);

  const filteredMatches = matches.filter((m) => {
    if (selectedCategory && m.category !== selectedCategory) return false;
    if (selectedRound !== 'ALL' && m.round !== selectedRound) return false;
    if (selectedStatus !== 'ALL' && m.status !== selectedStatus) return false;
    return true;
  });

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
                Calendario de Juegos
              </h1>
            </div>
            <p className="text-xs text-slate-500">
              {activeTournament.name} • {selectedCategory} • Sede: {activeTournament.venue}
            </p>
          </div>

          {/* Minimalist Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Categoría Dropdown */}
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

            {/* Jornada Dropdown */}
            <div className="relative">
              <select
                value={selectedRound}
                onChange={(e) => setSelectedRound(e.target.value)}
                aria-label="Filtrar por jornada"
                className="bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-full px-3.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer appearance-none pr-7 shadow-2xs"
              >
                <option value="ALL">Todas las Jornadas</option>
                {rounds.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>

            {/* Status Dropdown */}
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                aria-label="Filtrar por estado del partido"
                className="bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-full px-3.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer appearance-none pr-7 shadow-2xs"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="live">En juego</option>
                <option value="finished">Finalizados</option>
                <option value="scheduled">Programados</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Resting Team Display for Odd Teams (Fecha Libre) */}
      {isOddTeams && selectedRound !== 'ALL' && scheduleInfo.byesPerRound[selectedRound] && (
        <div className="p-3.5 bg-amber-50 border border-amber-200/90 rounded-2xl flex items-center justify-between text-xs text-amber-950 font-bold shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Coffee className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              Fecha Libre en {selectedRound}: <strong className="text-amber-900">{scheduleInfo.byesPerRound[selectedRound].teamName}</strong> (Descanso oficial)
            </span>
          </div>
          <span className="text-[10px] bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full font-extrabold">
            No suma ni resta pts
          </span>
        </div>
      )}

      {isOddTeams && selectedRound === 'ALL' && Object.keys(scheduleInfo.byesPerRound).length > 0 && (
        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs space-y-1.5 animate-in fade-in">
          <div className="flex items-center justify-between font-extrabold text-amber-900">
            <span className="flex items-center gap-1.5">
              <Coffee className="w-4 h-4 text-amber-600" />
              <span>Competencia con Equipos Impares ({categoryClubs.length} Clubes): Fechas Libres</span>
            </span>
            <span className="text-[10px] text-amber-700 font-medium">
              Cada equipo descansa 1 vez
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {Object.values(scheduleInfo.byesPerRound).map((b) => (
              <span
                key={b.round}
                className="px-2.5 py-1 rounded-xl bg-white border border-amber-200 text-[11px] font-bold text-slate-800 shadow-2xs"
              >
                <strong className="text-amber-700">{b.round}:</strong> {b.teamName} (Descanso)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Matches Grid using MatchBoxCard */}
      {filteredMatches.length === 0 ? (
        <div className="bg-white rounded-[28px] p-12 text-center text-slate-400 border border-slate-200/80">
          <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-500" />
          <p className="text-xs font-bold text-slate-700">No hay partidos registrados con estos filtros</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Puedes programar partidos desde el Panel de Administración.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredMatches.map((match) => (
            <MatchBoxCard
              key={match.id}
              match={match}
              onNavigateToClub={onNavigateToClub}
            />
          ))}
        </div>
      )}
    </div>
  );
};
