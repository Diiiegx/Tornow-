import React, { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import { SPORT_CONFIGS, FORMAT_CONFIGS } from '../constants/tournamentPresets';
import {
  Trophy,
  X,
  Plus,
  Check,
  Search,
  Building,
  User,
  Calendar,
  MapPin,
  Trash2,
  Lock,
} from 'lucide-react';

interface TournamentSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreate: () => void;
}

export const TournamentSelectorModal: React.FC<TournamentSelectorModalProps> = ({
  isOpen,
  onClose,
  onOpenCreate,
}) => {
  const {
    tournaments,
    activeTournamentId,
    setActiveTournamentId,
    deleteTournament,
    currentUser,
  } = useTournament();

  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  // Filter tournaments according to role and visibility:
  // If super_admin: show all (including hidden)
  // If organizer: show their own tournaments (including hidden) + other public tournaments
  // Otherwise: show only public tournaments
  const accessibleTournaments = tournaments.filter((t) => {
    if (currentUser?.role === 'super_admin') return true;
    const isOwner =
      currentUser?.role === 'organizer' &&
      (!t.organizerUserId ||
        t.organizerUserId === currentUser.id ||
        currentUser.organizerTournamentIds?.includes(t.id));
    if (isOwner) return true;
    return t.visibility !== 'hidden';
  });

  const filteredTournaments = accessibleTournaments.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.organizerName.toLowerCase().includes(q) ||
      t.sport.toLowerCase().includes(q) ||
      t.venue.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-[95vw] max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl max-h-[88vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white">
                Torneos Disponibles en TORNOW
              </h2>
              <p className="text-[11px] text-slate-400">
                Selecciona un torneo para ver sus partidos, posiciones y clubes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
            aria-label="Cerrar selector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar + Create Button CTA */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center gap-2">
          <div className="relative w-full flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, deporte u organizador..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          {(currentUser?.role === 'organizer' || currentUser?.role === 'super_admin') && (
            <button
              onClick={() => {
                onClose();
                onOpenCreate();
              }}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear Torneo</span>
            </button>
          )}
        </div>

        {/* Tournament Cards List */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3 content-start">
          {filteredTournaments.length === 0 ? (
            <div className="text-center py-8 text-slate-400 md:col-span-2">
              <p className="text-xs font-medium">No se encontraron torneos con ese criterio.</p>
            </div>
          ) : (
            filteredTournaments.map((tour) => {
              const isActive = tour.id === activeTournamentId;
              const sportCfg = SPORT_CONFIGS[tour.sport] || SPORT_CONFIGS.volleyball;
              const formatCfg = FORMAT_CONFIGS[tour.format] || FORMAT_CONFIGS.round_robin;

              return (
                <div
                  key={tour.id}
                  onClick={() => {
                    setActiveTournamentId(tour.id);
                    onClose();
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all relative ${
                    isActive
                      ? 'border-cyan-600 bg-cyan-50/60 shadow-sm ring-1 ring-cyan-500'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{sportCfg.emoji}</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                        {sportCfg.name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100/80 text-cyan-800">
                        {formatCfg.badge}
                      </span>
                      {tour.isDemo && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                          Demo
                        </span>
                      )}
                    </div>

                    {isActive ? (
                      <span className="px-2 py-0.5 rounded-full bg-cyan-600 text-white text-[10px] font-black flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Activo</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-cyan-600">
                        Seleccionar
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                    {tour.name}
                  </h3>

                  <div className="mt-2 pt-2 border-t border-slate-100 space-y-1 text-slate-600 text-xs">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      {tour.organizerType === 'empresa' ? (
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span className="font-semibold text-slate-700">
                        {tour.organizerName}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        ({tour.organizerType === 'empresa' ? 'Empresa' : 'Persona Natural'})
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[170px]">{tour.venue}</span>
                      </span>

                      <span className="font-bold text-slate-600">
                        {tour.categories.length} categoría(s)
                      </span>
                    </div>
                  </div>

                  {/* Super admin delete option */}
                  {currentUser?.role === 'super_admin' && tournaments.length > 1 && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`¿Seguro que deseas eliminar el torneo "${tour.name}"?`)) {
                            deleteTournament(tour.id);
                          }
                        }}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 p-1 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Eliminar torneo</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
