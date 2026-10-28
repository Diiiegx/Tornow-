import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Plus,
  Inbox,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  X,
  Unlock,
  Lock,
  MessageSquare,
  Scale,
  UserX,
} from 'lucide-react';
import { useTournament } from '../context/TournamentContext';

export const SanctionsAndInboxPanel: React.FC = () => {
  const {
    activeTournament,
    clubs,
    issuePlayerSanction,
    revokeOrUpdateSanction,
    toggleAllowAppeals,
    replyToInboxMessage,
  } = useTournament();

  // Popup Modal State for Adding a Sanction
  const [showSanctionModal, setShowSanctionModal] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState<string>(clubs[0]?.id || '');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [matchesSuspended, setMatchesSuspended] = useState<number>(1);
  const [sanctionReason, setSanctionReason] = useState<string>('');
  const [issuedBy, setIssuedBy] = useState<string>('Comité Organizador');
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // Inbox Filter & Reply State
  const [inboxFilter, setInboxFilter] = useState<'all' | 'apelacion' | 'mensaje_delegado'>('all');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const allowAppeals = activeTournament.allowSanctionAppeals !== false;
  const sanctions = activeTournament.sanctions || [];
  const inboxMessages = activeTournament.inboxMessages || [];

  // Keep selectedClubId and selectedPlayerId synced when opening modal
  const selectedClub = useMemo(
    () => clubs.find((c) => c.id === selectedClubId) || clubs[0],
    [clubs, selectedClubId]
  );

  const availablePlayers = useMemo(() => selectedClub?.roster || [], [selectedClub]);

  const handleOpenSanctionModal = () => {
    const firstClub = clubs[0];
    setSelectedClubId(firstClub?.id || '');
    setSelectedPlayerId(firstClub?.roster?.[0]?.id || '');
    setMatchesSuspended(1);
    setSanctionReason('');
    setIssuedBy('Comité Organizador');
    setFormError(null);
    setShowSanctionModal(true);
  };

  const handleClubSelectChange = (newClubId: string) => {
    setSelectedClubId(newClubId);
    const found = clubs.find((c) => c.id === newClubId);
    setSelectedPlayerId(found?.roster?.[0]?.id || '');
  };

  const handleConfirmSanction = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const targetClubId = selectedClub?.id || selectedClubId;
    const targetPlayerId = selectedPlayerId || availablePlayers[0]?.id || '';

    const result = issuePlayerSanction({
      clubId: targetClubId,
      playerId: targetPlayerId,
      reason: sanctionReason,
      matchesSuspended: Number(matchesSuspended),
      issuedBy,
    });

    if (!result.success) {
      setFormError(result.message);
      return;
    }

    setShowSanctionModal(false);
    setFeedbackBanner(result.message);
    setTimeout(() => setFeedbackBanner(null), 4000);
  };

  const filteredInbox = useMemo(() => {
    return inboxMessages.filter((msg) => {
      if (inboxFilter === 'all') return true;
      if (inboxFilter === 'apelacion') return msg.type === 'apelacion';
      return msg.type !== 'apelacion';
    });
  }, [inboxMessages, inboxFilter]);

  const pendingInboxCount = useMemo(
    () => inboxMessages.filter((m) => m.status === 'pending').length,
    [inboxMessages]
  );

  return (
    <div className="space-y-6">
      {/* Top Control Card: Tribunal de Disciplina & Appeals Toggle */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-600">
              <Scale className="w-4 h-4" />
              <span>TRIBUNAL DE DISCIPLINA Y COMITÉ ORGANIZADOR</span>
            </div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Ventana de Sanciones y Bandeja de Delegados
            </h2>
            <p className="text-xs text-slate-500">
              Inhabilita jugadores por fechas estipuladas, notifica automáticamente a los delegados de club y gestiona apelaciones o mensajes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Appeals Activation Toggle Button */}
            <button
              type="button"
              onClick={() => toggleAllowAppeals(activeTournament.id, !allowAppeals)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                allowAppeals
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
            >
              {allowAppeals ? (
                <>
                  <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Apelaciones: ACTIVADAS</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Apelaciones: DESACTIVADAS</span>
                </>
              )}
            </button>

            {/* Open Sanction Popup Button */}
            <button
              type="button"
              onClick={handleOpenSanctionModal}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Sanción a Jugador</span>
            </button>
          </div>
        </div>

        {feedbackBanner && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedbackBanner}</span>
            </div>
            <button onClick={() => setFeedbackBanner(null)} className="text-emerald-700 hover:text-emerald-950">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Active Sanctions List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <UserX className="w-4 h-4 text-rose-600" />
              <span>Jugadores Sancionados / Inhabilitados ({sanctions.length})</span>
            </h3>
            <span className="text-[11px] text-slate-500">
              {allowAppeals
                ? 'Los delegados pueden apelar sanciones activas'
                : 'Apelaciones bloqueadas por el organizador'}
            </span>
          </div>

          {sanctions.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-1">
              <p className="text-xs font-bold text-slate-700">
                No hay jugadores sancionados en este campeonato
              </p>
              <p className="text-[11px] text-slate-500">
                Usa el botón "Agregar Sanción a Jugador" para registrar suspensiones por fechas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sanctions.map((sanc) => {
                const isSuspendedNow = sanc.status === 'active' || sanc.status === 'appealed';
                return (
                  <div
                    key={sanc.id}
                    className={`p-4 rounded-2xl border space-y-2.5 transition-all ${
                      isSuspendedNow
                        ? 'bg-rose-50/40 border-rose-200'
                        : 'bg-slate-50 border-slate-200 opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl font-mono font-black text-xs flex items-center justify-center shrink-0 ${
                            isSuspendedNow
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-slate-300 text-slate-700'
                          }`}
                        >
                          #{sanc.playerDorsal}
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                            {sanc.playerName}
                          </h4>
                          <p className="text-[11px] text-slate-600 font-semibold">
                            {sanc.clubName} · Emitido por {sanc.issuedBy}
                          </p>
                        </div>
                      </div>

                      <div className="text-right text-[11px] font-bold">
                        {sanc.status === 'active' && (
                          <span className="text-rose-700">
                            INHABILITADO · {sanc.matchesSuspended} fecha(s)
                          </span>
                        )}
                        {sanc.status === 'appealed' && (
                          <span className="text-amber-700">
                            EN APELACIÓN · {sanc.matchesSuspended} fecha(s)
                          </span>
                        )}
                        {sanc.status === 'revoked' && (
                          <span className="text-emerald-700">HABILITADO (Revocada)</span>
                        )}
                        {sanc.status === 'resolved' && (
                          <span className="text-slate-600">CUMPLIDA</span>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-700">
                      <strong className="text-slate-900">Detalle de la sanción:</strong> {sanc.reason}
                    </div>

                    {sanc.appealText && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
                        <span className="font-bold block">Apelación del Delegado:</span>
                        <p className="text-[11px]">{sanc.appealText}</p>
                        {sanc.appealResolution && (
                          <p className="text-[11px] font-bold text-slate-800 pt-1 border-t border-amber-200/70">
                            Resolución Comité: {sanc.appealResolution}
                          </p>
                        )}
                      </div>
                    )}

                    {isSuspendedNow && (
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            revokeOrUpdateSanction(
                              sanc.id,
                              'revoked',
                              'Sanción levantada por determinación del Comité Organizador.'
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold text-[11px] transition-colors"
                        >
                          Levantar Sanción y Habilitar Jugador
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Organizer Inbox: Apelaciones y Mensajes de Delegados */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Inbox className="w-4 h-4 text-[#0052fe]" />
              <span>Bandeja de Entrada del Organizador</span>
              {pendingInboxCount > 0 && (
                <span className="text-xs font-bold text-rose-600">
                  · {pendingInboxCount} pendiente(s)
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">
              Revisa y responde apelaciones de sanciones, solicitudes y mensajes enviados por los delegados de cada club.
            </p>
          </div>

          {/* Filter Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start">
            <button
              type="button"
              onClick={() => setInboxFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                inboxFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({inboxMessages.length})
            </button>
            <button
              type="button"
              onClick={() => setInboxFilter('apelacion')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                inboxFilter === 'apelacion'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Apelaciones ({inboxMessages.filter((m) => m.type === 'apelacion').length})
            </button>
            <button
              type="button"
              onClick={() => setInboxFilter('mensaje_delegado')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                inboxFilter === 'mensaje_delegado'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mensajes Delegados ({inboxMessages.filter((m) => m.type !== 'apelacion').length})
            </button>
          </div>
        </div>

        {filteredInbox.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-1">
            <MessageSquare className="w-7 h-7 text-slate-400 mx-auto mb-1" />
            <p className="text-xs font-bold text-slate-700">
              La bandeja de entrada está vacía en esta categoría
            </p>
            <p className="text-[11px] text-slate-500">
              Cuando un delegado de club envíe una apelación o consulta, aparecerá aquí para tu resolución.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInbox.map((msg) => {
              const draft = replyDrafts[msg.id] || '';
              return (
                <div
                  key={msg.id}
                  className={`p-4 rounded-2xl border space-y-3 ${
                    msg.status === 'pending'
                      ? 'bg-blue-50/30 border-blue-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <span className="text-[#0052fe]">
                        {msg.type === 'apelacion' ? 'Apelación Oficial' : 'Mensaje de Delegado'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{msg.clubName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-500 font-normal">Por {msg.senderName}</span>
                    </div>

                    <span className="text-[11px] font-bold text-slate-600">
                      {msg.status === 'pending'
                        ? 'Pendiente de revisión'
                        : msg.status === 'approved'
                        ? 'Apelación Aprobada (Jugador Habilitado)'
                        : msg.status === 'rejected'
                        ? 'Apelación Rechazada'
                        : 'Respondido'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                      {msg.subject}
                    </h4>
                    <p className="text-xs text-slate-700 mt-1 leading-relaxed bg-white p-3 rounded-xl border border-slate-200/80">
                      {msg.content}
                    </p>
                  </div>

                  {msg.organizerReply && (
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950">
                      <strong className="font-bold">Respuesta del Comité Organizador:</strong>{' '}
                      {msg.organizerReply}
                    </div>
                  )}

                  {msg.status === 'pending' && (
                    <div className="space-y-2 pt-1">
                      <input
                        type="text"
                        value={draft}
                        onChange={(e) =>
                          setReplyDrafts({ ...replyDrafts, [msg.id]: e.target.value })
                        }
                        placeholder="Escribe la resolución o respuesta oficial para el delegado del club..."
                        className="w-full text-xs px-3.5 py-2 rounded-xl bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052fe]"
                      />
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {msg.type === 'apelacion' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => replyToInboxMessage(msg.id, 'rejected', draft)}
                              className="px-3.5 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Rechazar Apelación</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => replyToInboxMessage(msg.id, 'approved', draft)}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Aceptar Apelación y Habilitar Jugador</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => replyToInboxMessage(msg.id, 'replied', draft)}
                            className="px-4 py-1.5 rounded-xl bg-[#0052fe] hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Enviar Respuesta al Delegado</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* POPUP MODAL: AGREGAR DETALLE DE SANCIÓN Y FECHAS DE SUSPENSIÓN */}
      {showSanctionModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sanction-modal-title"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="sanction-modal-title" className="text-base font-black text-slate-900">
                    Aplicar Sanción e Inhabilitar Jugador
                  </h3>
                  <p className="text-xs text-slate-500">
                    El delegado del club recibirá una notificación urgente y el jugador quedará inhabilitado.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSanctionModal(false)}
                aria-label="Cerrar ventana de sanción"
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSanction} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Seleccionar Club */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Club del Jugador *
                </label>
                <select
                  value={selectedClub?.id || ''}
                  onChange={(e) => handleClubSelectChange(e.target.value)}
                  className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0052fe]"
                >
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name} ({club.roster.length} jugadores)
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Seleccionar Jugador */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jugador a Sancionar *
                </label>
                {availablePlayers.length === 0 ? (
                  <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    Este club aún no tiene jugadores inscritos en su nómina.
                  </p>
                ) : (
                  <select
                    value={selectedPlayerId}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                    className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0052fe]"
                  >
                    {availablePlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.dorsal} · {p.name} {p.paternalSurname || ''} ({p.position})
                        {p.isSuspended ? ' — [YA INHABILITADO]' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 3. Cantidad de Fechas que se perderá */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cantidad de Fechas de Suspensión (Partidos que se perderá) *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={matchesSuspended}
                    onChange={(e) => setMatchesSuspended(Math.max(1, Number(e.target.value)))}
                    className="w-24 text-center font-mono text-sm font-black px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[1, 2, 3, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setMatchesSuspended(n)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                          matchesSuspended === n
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {n} {n === 1 ? 'Fecha' : 'Fechas'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Detalle de la Sanción */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Detalle y Motivo Reglamentario de la Sanción *
                </label>
                <textarea
                  rows={3}
                  value={sanctionReason}
                  onChange={(e) => setSanctionReason(e.target.value)}
                  placeholder="Ej. Tarjeta roja directa por conducta antideportiva según Art. 14 del reglamento oficial..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052fe]"
                />
              </div>

              {/* 5. Órgano Emisor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Determinado por
                </label>
                <input
                  type="text"
                  value={issuedBy}
                  onChange={(e) => setIssuedBy(e.target.value)}
                  placeholder="Comité Organizador / Tribunal de Disciplina"
                  className="w-full text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052fe]"
                />
              </div>

              {/* Cancel & Confirm Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSanctionModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={availablePlayers.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider shadow-md transition-transform active:scale-95"
                >
                  Confirmar Sanción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
