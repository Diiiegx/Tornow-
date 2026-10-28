import React from 'react';
import { Match } from '../types';
import { useTournament } from '../context/TournamentContext';
import { Clock, MapPin, CheckCircle2, Play, VideoOff } from 'lucide-react';

interface MatchBoxCardProps {
  match: Match;
  onOpenLive?: (matchId: string) => void;
  onNavigateToClub?: (clubId: string) => void;
}

export const MatchBoxCard: React.FC<MatchBoxCardProps> = React.memo(({
  match,
  onOpenLive,
  onNavigateToClub,
}) => {
  const { clubs } = useTournament();
  const homeClub = clubs.find((c) => c.id === match.homeTeamId);
  const awayClub = clubs.find((c) => c.id === match.awayTeamId);

  const isLive = match.status === 'live';
  const isFinished = match.status === 'finished';
  const hasYoutubeLink = Boolean(match.youtubeLiveUrl && match.youtubeLiveUrl.trim());

  return (
    <div
      className={`bg-white rounded-[26px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] ${
        isLive ? 'border-cyan-500 ring-2 ring-cyan-100' : 'border-slate-200/80'
      }`}
    >
      {/* Top Header info */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 text-xs">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0 pr-2">
          <span className="font-extrabold text-[#0052fe] uppercase text-[11px] tracking-wide whitespace-nowrap flex-shrink-0">
            {match.round}
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1 font-medium text-slate-500 whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{match.time} hs</span>
          </span>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <span className="text-slate-500 font-medium truncate max-w-[120px] hidden sm:flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">{match.court}</span>
          </span>
        </div>

        {/* Status Pill: "En juego", "Finalizado", "Programado" */}
        <div className="flex-shrink-0">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 text-cyan-800 text-xs font-black animate-pulse shadow-2xs border border-cyan-200">
              <span className="w-2 h-2 rounded-full bg-cyan-600" />
              <span>En juego</span>
            </span>
          ) : isFinished ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Finalizado</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Programado</span>
            </span>
          )}
        </div>
      </div>

      {/* MATCH RECTANGLE DESIGN */}
      <div className="space-y-3.5 py-1">
        {/* Row 1: Home Team Name & Rounded Square Box with sets won */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0 pr-2">
            <button
              onClick={() => onNavigateToClub && onNavigateToClub(match.homeTeamId)}
              className="text-left font-black text-lg sm:text-xl text-[#0052fe] hover:text-blue-700 leading-tight uppercase tracking-tight block truncate transition-colors font-['Teko',sans-serif] sm:font-bold"
            >
              {homeClub?.name || 'CLUB LOCAL'}
            </button>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              {match.category}
            </span>
          </div>

          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#383838] flex items-center justify-center text-white font-black text-3xl sm:text-4xl shadow-md flex-shrink-0 select-none font-mono">
            {isFinished || isLive ? match.homeSetsWon : '-'}
          </div>
        </div>

        {/* Row 2: Away Team Name & Rounded Square Box with sets won */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0 pr-2">
            <button
              onClick={() => onNavigateToClub && onNavigateToClub(match.awayTeamId)}
              className="text-left font-black text-lg sm:text-xl text-[#0052fe] hover:text-blue-700 leading-tight uppercase tracking-tight block truncate transition-colors font-['Teko',sans-serif] sm:font-bold"
            >
              {awayClub?.name || 'CLUB VISITANTE'}
            </button>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              {match.category}
            </span>
          </div>

          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#383838] flex items-center justify-center text-white font-black text-3xl sm:text-4xl shadow-md flex-shrink-0 select-none font-mono">
            {isFinished || isLive ? match.awaySetsWon : '-'}
          </div>
        </div>
      </div>

      {/* Footer: Transmisión en Vivo por YouTube ("Ver partido" vs "Partido sin transmisión en vivo") */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        {hasYoutubeLink ? (
          <a
            href={match.youtubeLiveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-black text-xs inline-flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Ver partido</span>
          </a>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold">
            <VideoOff className="w-3.5 h-3.5 text-slate-400" />
            <span>Partido sin transmisión en vivo</span>
          </span>
        )}

        {onOpenLive && (
          <button
            type="button"
            onClick={() => onOpenLive(match.id)}
            className="text-xs font-extrabold text-[#0052fe] hover:text-blue-700 transition-colors ml-auto"
          >
            Ver Marcador &rarr;
          </button>
        )}
      </div>
    </div>
  );
});
