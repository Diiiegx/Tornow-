import React, { useState, useEffect, useCallback } from 'react';
import { useTournament } from '../context/TournamentContext';
import { FeedbackCategory } from '../types';
import {
  getBrowserFeedbackCooldownState,
  syncHourlyFeedbackCookieAndCache,
} from '../utils/feedbackCookieCache';
import {
  MessageSquarePlus,
  Star,
  X,
  Send,
  CheckCircle2,
  Clock,
  Cookie,
} from 'lucide-react';

const CATEGORY_OPTIONS: { id: FeedbackCategory; label: string }[] = [
  { id: 'sugerencia', label: '💡 Sugerencia' },
  { id: 'experiencia', label: '⚡ Experiencia' },
  { id: 'elogio', label: '👏 Elogio' },
  { id: 'error', label: '🛠️ Reportar Detalle' },
];

export const HourlyFeedbackPopup: React.FC = () => {
  const { submitUserFeedback, currentUser } = useTournament();

  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [category, setCategory] = useState<FeedbackCategory>('sugerencia');
  const [comment, setComment] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [remainingMinutes, setRemainingMinutes] = useState<number>(0);

  const checkHourlyPopupSchedule = useCallback(() => {
    const state = getBrowserFeedbackCooldownState(Date.now());
    setRemainingMinutes(state.remainingMinutes);

    if (state.shouldShowPopup) {
      // Trigger the small popup and record the 1-hour general cookie & cache immediately
      setIsOpen(true);
      syncHourlyFeedbackCookieAndCache(Date.now());
      setRemainingMinutes(60);
    }
  }, []);

  useEffect(() => {
    // Check immediately on mount so the popup and general cookie activate right away
    checkHourlyPopupSchedule();

    // Re-evaluate every 30 seconds so if the user stays on the page for 1 hour, it pops up automatically
    const interval = setInterval(() => {
      checkHourlyPopupSchedule();
    }, 30_000);

    return () => {
      clearInterval(interval);
    };
  }, [checkHourlyPopupSchedule]);

  const handleDismiss = () => {
    // Ensure the 1-hour general cookie and cache are saved when dismissed
    syncHourlyFeedbackCookieAndCache(Date.now());
    setRemainingMinutes(60);
    setIsOpen(false);
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const res = submitUserFeedback({
      rating,
      category,
      comment,
      authorName: authorName.trim() || currentUser?.fullName || '',
    });

    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }

    setSubmittedSuccess(true);
    setComment('');
    setRemainingMinutes(60);

    setTimeout(() => {
      setSubmittedSuccess(false);
      setIsOpen(false);
    }, 1600);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-20 sm:bottom-5 right-3 sm:right-5 z-40">
        <button
          type="button"
          onClick={() => {
            setErrorMsg('');
            setIsOpen(true);
          }}
          aria-label="Abrir ventana de feedback"
          title={
            remainingMinutes > 0
              ? `Dejar Feedback (Próximo aviso automático en ${remainingMinutes} min)`
              : 'Dejar Feedback para los Administradores'
          }
          className="group flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#081223]/95 hover:bg-[#0052fe] text-white text-xs font-extrabold shadow-lg border border-white/15 transition-all cursor-pointer active:scale-95"
        >
          <MessageSquarePlus className="w-3.5 h-3.5 text-cyan-400 group-hover:text-white transition-colors" />
          <span>Feedback</span>
          {remainingMinutes > 0 && (
            <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-300 group-hover:text-white/90 pl-1 border-l border-white/15">
              <Clock className="w-2.5 h-2.5" />
              {remainingMinutes}m
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label="Ventana emergente de feedback"
      className="fixed bottom-20 sm:bottom-5 right-3 sm:right-5 z-50 w-[calc(100vw-24px)] max-w-[330px] bg-white rounded-3xl shadow-[0_18px_48px_rgba(8,18,35,0.28)] border border-slate-200/90 overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200"
    >
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-[#081223] via-[#0b1b3a] to-[#0052fe] px-4 py-3 text-white flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <MessageSquarePlus className="w-4 h-4 text-cyan-300" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-black uppercase tracking-wide truncate">
              Tu Opinión Importa
            </h3>
            <p className="text-[10px] text-cyan-200 font-medium truncate">
              Llega directo a Bandeja de Entrada Admin
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Cerrar ventana de feedback"
          className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {submittedSuccess ? (
        <div className="p-5 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-xs font-extrabold text-slate-900">
            ¡Feedback recibido en la Bandeja de Administradores!
          </p>
          <p className="text-[11px] text-slate-500">
            Cookie general actualizada. Esta ventana no volverá a aparecer hasta dentro de 1 hora.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-3.5 space-y-2.5">
          {/* Star Rating Row */}
          <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-2xl border border-slate-200/80">
            <span className="text-[11px] font-extrabold text-slate-700">
              Calificación:
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`Calificar con ${star} estrellas`}
                    className="p-0.5 transition-transform hover:scale-110 cursor-pointer"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        active
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Quick Selector */}
          <div className="grid grid-cols-2 gap-1.5">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCategory(opt.id)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all text-left truncate cursor-pointer ${
                  category === opt.id
                    ? 'bg-blue-50 border-[#0052fe] text-[#0052fe]'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Optional Name (if not logged in) */}
          {!currentUser && (
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Tu nombre o club (opcional)"
              maxLength={60}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0052fe]"
            />
          )}

          {/* Comment Textarea */}
          <div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              maxLength={400}
              placeholder="¿Qué te parece TorNow o qué te gustaría mejorar?"
              aria-label="Comentario de feedback"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0052fe] resize-none"
            />
          </div>

          {errorMsg && (
            <p className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200">
              {errorMsg}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold transition-colors cursor-pointer"
            >
              En 1 hora
            </button>
            <button
              type="submit"
              className="flex-1 py-1.5 px-3 rounded-xl bg-[#0052fe] hover:bg-blue-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar Feedback</span>
            </button>
          </div>

          {/* Cookie & Cache Info Footer */}
          <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Cookie className="w-3 h-3 text-slate-400" />
              Cookie general 1h activa
            </span>
            <span>Frecuencia: 1 vez / hora</span>
          </div>
        </form>
      )}
    </aside>
  );
};
