import React, { useState, useRef, useEffect } from 'react';
import { useTournament } from '../context/TournamentContext';
import {
  Bell,
  CheckCheck,
  Sparkles,
  AlertCircle,
  ShieldAlert,
  Calendar,
  Radio,
  X,
  Users,
  Cpu,
  Settings,
  Send,
  Trash2,
  Shield,
} from 'lucide-react';
import { LeagueNotification } from '../types';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMatch?: (matchId: string) => void;
  onSelectClub?: (clubId: string) => void;
}

type FilterTab = 'all' | 'unread' | 'nomina' | 'resultados' | 'sistema' | 'avisos';

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  onSelectMatch,
  onSelectClub,
}) => {
  const {
    visibleNotifications,
    currentUser,
    activeTournament,
    clubs,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    clearReadNotifications,
    browserNotificationsEnabled,
    requestBrowserNotifications,
    notificationPreferences,
    updateNotificationPreferences,
    sendLeagueNotification,
  } = useTournament();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showComposePanel, setShowComposePanel] = useState(false);

  // Quick compose state for Organizers / Admins
  const [composeTitle, setComposeTitle] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composeCategory, setComposeCategory] = useState<LeagueNotification['category']>('circular_general');
  const [composeTargetClub, setComposeTargetClub] = useState<string>('ALL');
  const [composePriority, setComposePriority] = useState<LeagueNotification['priority']>('normal');

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isOrganizerOrAdmin =
    currentUser?.role === 'organizer' || currentUser?.role === 'super_admin';
  const myClub = clubs.find((c) => c.id === currentUser?.clubId);

  const displayList = visibleNotifications.filter((n) => {
    const isRead = currentUser ? n.readBy.includes(currentUser.id) : true;
    if (activeTab === 'unread') return !isRead;
    if (activeTab === 'nomina') return n.category === 'modificacion_nomina';
    if (activeTab === 'resultados') return n.category === 'marcador';
    if (activeTab === 'sistema') return n.category === 'sistema';
    if (activeTab === 'avisos') {
      return (
        n.category === 'cambio_horario' ||
        n.category === 'convocatoria' ||
        n.category === 'disciplinaria' ||
        n.category === 'circular_general'
      );
    }
    return true;
  });

  const getCategoryIcon = (category: LeagueNotification['category']) => {
    switch (category) {
      case 'sistema':
        return <Cpu className="w-4 h-4 text-indigo-600" />;
      case 'modificacion_nomina':
        return <Users className="w-4 h-4 text-amber-600" />;
      case 'marcador':
        return <Radio className="w-4 h-4 text-rose-500" />;
      case 'convocatoria':
        return <Sparkles className="w-4 h-4 text-[#0052fe]" />;
      case 'cambio_horario':
        return <Calendar className="w-4 h-4 text-emerald-600" />;
      case 'disciplinaria':
        return <ShieldAlert className="w-4 h-4 text-amber-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-purple-600" />;
    }
  };

  const getCategoryLabel = (category: LeagueNotification['category']) => {
    switch (category) {
      case 'sistema':
        return 'Sistema TORNOW';
      case 'modificacion_nomina':
        return 'Modificación de Nómina';
      case 'marcador':
        return 'Resultado / Marcador';
      case 'cambio_horario':
        return 'Programación / Horario';
      case 'convocatoria':
        return 'Convocatoria Oficial';
      case 'disciplinaria':
        return 'Comisión Disciplinaria';
      case 'circular_general':
        return 'Circular Oficial';
      default:
        return 'Aviso';
    }
  };

  const handleQuickSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTitle.trim() || !composeMessage.trim()) return;
    sendLeagueNotification({
      title: composeTitle.trim(),
      message: composeMessage.trim(),
      category: composeCategory,
      targetClubId: composeTargetClub,
      priority: composePriority,
    });
    setComposeTitle('');
    setComposeMessage('');
    setShowComposePanel(false);
  };

  return (
    <>
      {/* Backdrop for mobile to prevent touch leaks */}
      <div
        className="fixed inset-0 bg-black/20 z-40 sm:hidden backdrop-blur-2xs"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dropdownRef}
        className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-[420px] max-w-md sm:max-w-none mx-auto sm:mx-0 bg-white border border-slate-200 rounded-[28px] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900"
        role="dialog"
        aria-label="Panel de Notificaciones"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-full bg-slate-100 text-slate-800 flex-shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                <span>Notificaciones</span>
                {unreadCount > 0 && (
                  <span className="bg-[#0052fe] text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h3>
              <p className="text-[10px] text-slate-500 truncate">
                {currentUser?.role === 'club_admin' && myClub
                  ? `Club: ${myClub.name} • ${activeTournament.name}`
                  : activeTournament.id
                  ? `Torneo: ${activeTournament.name}`
                  : 'Alertas Oficiales y Sistema TORNOW'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isOrganizerOrAdmin && activeTournament.id && (
              <button
                type="button"
                onClick={() => {
                  setShowComposePanel(!showComposePanel);
                  setShowSettingsPanel(false);
                }}
                className={`p-1.5 rounded-full border text-[11px] font-bold flex items-center gap-1 transition-colors ${
                  showComposePanel
                    ? 'bg-[#0052fe] text-white border-[#0052fe]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
                title="Emitir aviso oficial al torneo"
                aria-label="Emitir aviso al torneo"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setShowSettingsPanel(!showSettingsPanel);
                setShowComposePanel(false);
              }}
              className={`p-1.5 rounded-full border transition-colors ${
                showSettingsPanel
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title="Preferencias de notificaciones"
              aria-label="Preferencias de notificaciones"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllNotificationsRead}
                className="text-[11px] text-[#0052fe] hover:underline font-bold flex items-center gap-1 px-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Leer todas</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 sm:hidden"
              aria-label="Cerrar notificaciones"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Compose Panel for Organizers & Super Admins */}
        {showComposePanel && isOrganizerOrAdmin && (
          <form
            onSubmit={handleQuickSend}
            className="p-3.5 bg-slate-50 border-b border-slate-200 space-y-2.5 animate-in fade-in"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#0052fe]">
                Emitir Aviso al Torneo ({activeTournament.name})
              </span>
              <button
                type="button"
                onClick={() => setShowComposePanel(false)}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-600"
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={composeCategory}
                onChange={(e) => setComposeCategory(e.target.value as LeagueNotification['category'])}
                aria-label="Categoría del aviso"
                className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white"
              >
                <option value="circular_general">Circular Oficial</option>
                <option value="cambio_horario">Cambio de Horario / Cancha</option>
                <option value="convocatoria">Convocatoria</option>
                <option value="disciplinaria">Comisión Disciplinaria</option>
                <option value="sistema">Aviso de Sistema</option>
              </select>

              <select
                value={composeTargetClub}
                onChange={(e) => setComposeTargetClub(e.target.value)}
                aria-label="Club destinatario"
                className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white"
              >
                <option value="ALL">Todos los clubes del torneo</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    Solo: {c.name} ({c.category})
                  </option>
                ))}
              </select>
            </div>

            <input
              type="text"
              value={composeTitle}
              onChange={(e) => setComposeTitle(e.target.value)}
              placeholder="Título del comunicado (ej: Cambio de horario Cancha 1)"
              className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-300 bg-white"
              required
            />

            <textarea
              value={composeMessage}
              onChange={(e) => setComposeMessage(e.target.value)}
              placeholder="Escribe el mensaje para los delegados y equipos de este torneo..."
              rows={2}
              className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-300 bg-white resize-none"
              required
            />

            <div className="flex items-center justify-between gap-2">
              <select
                value={composePriority}
                onChange={(e) => setComposePriority(e.target.value as LeagueNotification['priority'])}
                aria-label="Prioridad del aviso"
                className="text-[11px] font-bold px-2.5 py-1 rounded-xl border border-slate-300 bg-white"
              >
                <option value="normal">Prioridad Normal</option>
                <option value="alta">Prioridad Alta</option>
                <option value="urgente">Urgente</option>
              </select>

              <button
                type="submit"
                className="px-4 py-1.5 rounded-full bg-[#0052fe] hover:bg-blue-700 text-white text-[11px] font-extrabold flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3 h-3" />
                <span>Enviar al Torneo</span>
              </button>
            </div>
          </form>
        )}

        {/* Notification Preferences Panel */}
        {showSettingsPanel && (
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                Opciones de Notificaciones del Torneo
              </span>
              <button
                type="button"
                onClick={clearReadNotifications}
                className="text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Limpiar leídas</span>
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-900 block text-[11px]">Sistema y Seguridad</span>
                  <span className="text-[10px] text-slate-500">Estado del torneo, claves y cierre de nóminas</span>
                </div>
                <input
                  type="checkbox"
                  checked={notificationPreferences.sistema}
                  onChange={(e) => updateNotificationPreferences({ sistema: e.target.checked })}
                  className="rounded text-[#0052fe] focus:ring-[#0052fe]"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-900 block text-[11px]">Actualización de Resultados</span>
                  <span className="text-[10px] text-slate-500">Marcadores en vivo y resultados finales del torneo</span>
                </div>
                <input
                  type="checkbox"
                  checked={notificationPreferences.marcador}
                  onChange={(e) => updateNotificationPreferences({ marcador: e.target.checked })}
                  className="rounded text-[#0052fe] focus:ring-[#0052fe]"
                />
              </label>

              {isOrganizerOrAdmin && (
                <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-900 block text-[11px]">
                      Modificaciones de Nómina por Club
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Avisos de inscripción/baja de jugadores y staff con nombre del club
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationPreferences.modificacion_nomina}
                    onChange={(e) =>
                      updateNotificationPreferences({ modificacion_nomina: e.target.checked })
                    }
                    className="rounded text-[#0052fe] focus:ring-[#0052fe]"
                  />
                </label>
              )}

              <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-900 block text-[11px]">Programación y Horarios</span>
                  <span className="text-[10px] text-slate-500">Cambios de cancha, fecha y cruces de partidos</span>
                </div>
                <input
                  type="checkbox"
                  checked={notificationPreferences.cambio_horario}
                  onChange={(e) =>
                    updateNotificationPreferences({ cambio_horario: e.target.checked })
                  }
                  className="rounded text-[#0052fe] focus:ring-[#0052fe]"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-900 block text-[11px]">Comunicados y Disciplinaria</span>
                  <span className="text-[10px] text-slate-500">Circulares oficiales, citaciones y sanciones</span>
                </div>
                <input
                  type="checkbox"
                  checked={notificationPreferences.oficiales}
                  onChange={(e) => updateNotificationPreferences({ oficiales: e.target.checked })}
                  className="rounded text-[#0052fe] focus:ring-[#0052fe]"
                />
              </label>
            </div>
          </div>
        )}

        {/* Browser Push Banner */}
        {!browserNotificationsEnabled && (
          <div className="p-3 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between gap-2">
            <div className="text-xs text-blue-950 leading-tight min-w-0">
              <p className="font-bold truncate">¿Activar alertas push en este dispositivo?</p>
              <p className="text-[10px] text-blue-700 truncate">
                Recibe avisos de resultados, nóminas y sistema de tu torneo al instante.
              </p>
            </div>
            <button
              type="button"
              onClick={() => requestBrowserNotifications()}
              className="text-[11px] bg-[#0052fe] hover:bg-blue-700 text-white font-bold px-3 py-1 rounded-full shadow-2xs whitespace-nowrap flex-shrink-0"
            >
              Activar
            </button>
          </div>
        )}

        {/* Category Filter Tabs */}
        <div className="flex items-center overflow-x-auto no-scrollbar border-b border-slate-100 text-[11px] px-3 pt-2 gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`pb-2 font-bold whitespace-nowrap transition-colors ${
              activeTab === 'all'
                ? 'text-[#0052fe] border-b-2 border-[#0052fe]'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Todas ({visibleNotifications.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('unread')}
            className={`pb-2 font-bold whitespace-nowrap transition-colors ${
              activeTab === 'unread'
                ? 'text-[#0052fe] border-b-2 border-[#0052fe]'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            No leídas ({unreadCount})
          </button>
          {isOrganizerOrAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('nomina')}
              className={`pb-2 font-bold whitespace-nowrap transition-colors ${
                activeTab === 'nomina'
                  ? 'text-[#0052fe] border-b-2 border-[#0052fe]'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Nóminas
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('resultados')}
            className={`pb-2 font-bold whitespace-nowrap transition-colors ${
              activeTab === 'resultados'
                ? 'text-[#0052fe] border-b-2 border-[#0052fe]'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Resultados
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sistema')}
            className={`pb-2 font-bold whitespace-nowrap transition-colors ${
              activeTab === 'sistema'
                ? 'text-[#0052fe] border-b-2 border-[#0052fe]'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Sistema
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('avisos')}
            className={`pb-2 font-bold whitespace-nowrap transition-colors ${
              activeTab === 'avisos'
                ? 'text-[#0052fe] border-b-2 border-[#0052fe]'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Avisos
          </button>
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
          {displayList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-1">
              <Bell className="w-8 h-8 mx-auto mb-1 opacity-20 text-slate-500" />
              <p className="text-xs font-semibold text-slate-600">
                No hay notificaciones en esta categoría
              </p>
              <p className="text-[11px] text-slate-400">
                Solo recibes notificaciones exclusivas de tu torneo y avisos de sistema.
              </p>
            </div>
          ) : (
            displayList.map((notif) => {
              const isRead = currentUser ? notif.readBy.includes(currentUser.id) : true;
              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    markNotificationRead(notif.id);
                    if (notif.matchId && onSelectMatch) {
                      onSelectMatch(notif.matchId);
                      onClose();
                    } else if (notif.clubId && onSelectClub && isOrganizerOrAdmin) {
                      onSelectClub(notif.clubId);
                      onClose();
                    }
                  }}
                  className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors relative flex gap-3 ${
                    !isRead ? 'bg-blue-50/25' : ''
                  }`}
                >
                  {!isRead && (
                    <span className="absolute left-1.5 top-5 w-1.5 h-1.5 rounded-full bg-[#0052fe]" />
                  )}
                  <div className="p-2 rounded-2xl bg-slate-100 flex-shrink-0 self-start">
                    {getCategoryIcon(notif.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] uppercase font-extrabold text-[#0052fe]">
                          {getCategoryLabel(notif.category)}
                        </span>
                        {notif.clubName && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[9px] font-black border border-amber-300">
                            <Shield className="w-2.5 h-2.5 text-amber-700" />
                            Club: {notif.clubName}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">{notif.timestamp}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 leading-snug">{notif.title}</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-3 leading-relaxed">
                      {notif.message}
                    </p>
                    {notif.matchId && (
                      <span className="text-[10px] text-[#0052fe] font-bold hover:underline block mt-1">
                        Ver partido / resultado &rarr;
                      </span>
                    )}
                    {notif.clubId && isOrganizerOrAdmin && !notif.matchId && (
                      <span className="text-[10px] text-amber-700 font-bold hover:underline block mt-1">
                        Revisar nómina de {notif.clubName || 'este club'} &rarr;
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-500 font-medium">
          {activeTournament.id
            ? `Notificaciones aisladas para: ${activeTournament.name}`
            : 'Centro de Notificaciones Oficial TORNOW!'}
        </div>
      </div>
    </>
  );
};
