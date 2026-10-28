import React from 'react';
import { useTournament } from '../context/TournamentContext';
import { Bell, CheckCircle2, AlertTriangle, Trophy, X } from 'lucide-react';

export const PushToastContainer: React.FC = () => {
  const { activeToasts, dismissToast } = useTournament();

  if (activeToasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-24 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      role="region"
      aria-label="Notificaciones Push en Pantalla"
    >
      {activeToasts.map((toast) => {
        const isMarcador = toast.category === 'marcador';
        const isUrgent = toast.category === 'disciplinaria' || toast.category === 'error';
        const isAuth = toast.category === 'auth';

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 p-4 rounded-[24px] shadow-[0_15px_40px_rgba(0,0,0,0.12)] border border-slate-200/80 bg-white/95 backdrop-blur-md text-slate-900 transition-all duration-300 animate-in slide-in-from-bottom-5"
          >
            <div
              className={`p-2 rounded-full flex-shrink-0 ${
                isMarcador
                  ? 'bg-amber-100 text-amber-700'
                  : isUrgent
                  ? 'bg-rose-100 text-rose-700'
                  : isAuth
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {isMarcador ? (
                <Trophy className="w-4 h-4" />
              ) : isUrgent ? (
                <AlertTriangle className="w-4 h-4" />
              ) : isAuth ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#1a62ff]">
                  {toast.category}
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="text-[10px] text-slate-400">TORNOW Live</span>
              </div>
              <h4 className="font-bold text-xs text-slate-900 leading-tight">
                {toast.title}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => dismissToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
              aria-label="Cerrar notificación"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
