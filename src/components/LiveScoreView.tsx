import React from 'react';
import { useTournament } from '../context/TournamentContext';
import { MatchBoxCard } from './MatchBoxCard';
import {
  Radio,
  Sliders,
  ChevronDown,
  Play,
  VideoOff,
  ExternalLink,
} from 'lucide-react';

interface LiveScoreViewProps {
  onOpenAdminPanel: () => void;
  onNavigateToClub: (clubId: string) => void;
}

export const LiveScoreView: React.FC<LiveScoreViewProps> = ({
  onOpenAdminPanel,
  onNavigateToClub,
}) => {
  const {
    matches,
    activeLiveMatchId,
    setActiveLiveMatchId,
    currentUser,
    clubs,
    activeTournament,
  } = useTournament();

  const activeMatch = matches.find((m) => m.id === activeLiveMatchId) || matches[0];
  const isUserAdminOrReferee = currentUser?.role === 'super_admin' || currentUser?.role === 'organizer';
  const hasYoutubeLink = Boolean(activeMatch?.youtubeLiveUrl && activeMatch.youtubeLiveUrl.trim());

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* Selector Card */}
      <div className="bg-white rounded-[28px] p-5 sm:p-6 shadow-[0_6px_25px_rgba(0,0,0,0.03)] border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-cyan-50 text-cyan-700">
              <Radio className="w-5 h-5 animate-pulse" />
            </span>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase font-['Teko',sans-serif] sm:font-bold">
              Marcador y Partido en Vivo
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            {activeTournament.name} • Organiza: {activeTournament.organizerName}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Match selector */}
          {matches.length > 0 && (
            <div className="relative">
              <select
                value={activeLiveMatchId}
                onChange={(e) => setActiveLiveMatchId(e.target.value)}
                aria-label="Seleccionar partido para visualizar"
                className="bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-full px-3.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer appearance-none pr-8 shadow-2xs"
              >
                {matches.map((m) => {
                  const h = clubs.find((c) => c.id === m.homeTeamId);
                  const a = clubs.find((c) => c.id === m.awayTeamId);
                  return (
                    <option key={m.id} value={m.id}>
                      {m.round} • {h?.shortName || 'Local'} vs {a?.shortName || 'Visita'} ({m.status === 'live' ? 'En juego' : m.status})
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          )}

          {isUserAdminOrReferee && (
            <button
              onClick={onOpenAdminPanel}
              className="px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Editar en Panel</span>
            </button>
          )}
        </div>
      </div>

      {/* Render Match Card */}
      {activeMatch ? (
        <>
          <MatchBoxCard
            match={activeMatch}
            onNavigateToClub={onNavigateToClub}
          />

          {/* Banner Oficial de Transmisión en Vivo por YouTube */}
          <div
            className={`rounded-[26px] p-5 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              hasYoutubeLink
                ? 'bg-gradient-to-r from-rose-950 via-slate-900 to-[#081223] text-white border-rose-500/40 shadow-lg'
                : 'bg-white text-slate-700 border-slate-200/80 shadow-2xs'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  hasYoutubeLink
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {hasYoutubeLink ? (
                  <Play className="w-5 h-5 fill-white" />
                ) : (
                  <VideoOff className="w-5 h-5" />
                )}
              </div>
              <div>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider block ${
                    hasYoutubeLink ? 'text-rose-400' : 'text-slate-400'
                  }`}
                >
                  Señal de Streaming Oficial • YouTube
                </span>
                <h3
                  className={`text-sm sm:text-base font-black ${
                    hasYoutubeLink ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  {hasYoutubeLink
                    ? 'Transmisión en Vivo Disponible por YouTube'
                    : 'Partido sin transmisión en vivo'}
                </h3>
                <p
                  className={`text-xs ${
                    hasYoutubeLink ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {hasYoutubeLink
                    ? 'Haz clic en "Ver partido" para abrir la transmisión oficial configurada por la organización.'
                    : 'La organización no ha vinculado un enlace de transmisión en vivo para este encuentro.'}
                </p>
              </div>
            </div>

            {hasYoutubeLink ? (
              <a
                href={activeMatch.youtubeLiveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider inline-flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 shrink-0"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Ver partido</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <span className="px-4 py-2 rounded-full bg-slate-100 text-slate-500 font-bold text-xs inline-flex items-center gap-1.5 shrink-0">
                <VideoOff className="w-3.5 h-3.5 text-slate-400" />
                <span>Partido sin transmisión en vivo</span>
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-[28px] p-10 text-center text-slate-400 border border-slate-200/80">
          <Radio className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <h3 className="font-bold text-xs text-slate-700">No hay partidos registrados actualmente</h3>
          <p className="text-[11px] text-slate-400 mt-1">Los partidos programados se visualizarán aquí con marcador oficial.</p>
        </div>
      )}
    </div>
  );
};
