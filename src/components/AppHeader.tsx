import React, { useState, useRef, useEffect } from 'react';
import { useTournament } from '../context/TournamentContext';
import { NotificationDropdown } from './NotificationDropdown';
import {
  Bell,
  User,
  LogOut,
  Sliders,
  Shield,
  Key,
  Trophy,
  Layers,
  Plus,
  Home,
  Calendar,
} from 'lucide-react';

interface AppHeaderProps {
  onOpenAuth: (defaultMode?: 'login' | 'invite' | 'organizer_key') => void;
  onOpenCreateTournament?: () => void;
  onOpenSelectTournament: () => void;
  onSelectMatchFromNotif?: (matchId: string) => void;
  onSelectClubFromNotif?: (clubId: string) => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onOpenAuth,
  onOpenCreateTournament,
  onOpenSelectTournament,
  onSelectMatchFromNotif,
  onSelectClubFromNotif,
  activeTab,
  setActiveTab,
}) => {
  const {
    currentUser,
    logout,
    unreadCount,
    clubs,
  } = useTournament();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentClub = clubs.find((c) => c.id === currentUser?.clubId);

  return (
    <header className="relative z-30 pt-2 pb-2">
      {/* Main Top Bar */}
      <div className="flex items-center justify-between px-1">
        {/* Left: 3 Horizontal Lines Menu Button (Stacked Vertically) */}
        <div className="w-10 flex items-center justify-start">
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 text-slate-900 shadow-2xs border border-slate-200 transition-all flex items-center justify-center"
              aria-label="Menú principal"
              aria-expanded={isUserMenuOpen}
            >
              {/* 3 horizontal lines stacked vertically */}
              <svg
                className="w-5 h-5 text-slate-800"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>

            {/* Navigation & Account Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute left-0 mt-2 w-72 bg-white text-slate-800 border border-slate-200 rounded-3xl shadow-2xl py-3 z-50 animate-in fade-in zoom-in-95">
                <div className="px-4 pb-3 border-b border-slate-100">
                  <p className="font-bold text-sm text-slate-900">
                    {currentUser?.fullName || 'Invitado (Público)'}
                  </p>
                  <p className="text-xs text-slate-500 truncate font-mono">
                    {currentUser ? `@${currentUser.username}` : 'Sin sesión activa'}
                  </p>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold">
                    {currentUser?.role === 'super_admin'
                      ? 'Administrador General TORNOW'
                      : currentUser?.role === 'organizer'
                      ? 'Organizador Oficial TORNOW'
                      : currentUser?.role === 'club_admin'
                      ? `Delegado: ${currentClub?.name || 'Club'}`
                      : currentUser?.role === 'usuario'
                      ? 'Usuario Básico (Demo)'
                      : 'Espectador / Invitado'}
                  </span>
                </div>

                <div className="p-2 space-y-1">
                  {/* Inicio (Always present in Menu) */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('resumen');
                      setIsUserMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
                      activeTab === 'resumen'
                        ? 'bg-blue-50 text-[#0052fe]'
                        : 'text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Home className="w-4 h-4 text-[#0052fe]" />
                    <span>Inicio</span>
                  </button>

                  {/* Switch Tournament (for authenticated users) */}
                  {currentUser && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenSelectTournament();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Layers className="w-4 h-4 text-slate-600" />
                      <span>Cambiar / Ver Torneos</span>
                    </button>
                  )}

                  <div className="my-1 border-t border-slate-100" />

                  {/* Crear Nuevo Torneo */}
                  {onOpenCreateTournament && (
                    <button
                      type="button"
                      onClick={() => {
                        if (currentUser) {
                          onOpenCreateTournament();
                        } else {
                          onOpenAuth('login');
                        }
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-black text-[#0052fe] hover:bg-blue-50/80 rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4 text-[#0052fe]" />
                      <span>Crear Torneo</span>
                    </button>
                  )}

                  {/* Panel de Organizador (Organizador & Admin) */}
                  {(currentUser?.role === 'organizer' || currentUser?.role === 'super_admin') && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('organizer');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2"
                      >
                        <Trophy className="w-4 h-4 text-[#0052fe]" />
                        <span>Panel de Mi Torneo (Organizador)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('calendario');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2"
                      >
                        <Calendar className="w-4 h-4 text-[#0052fe]" />
                        <span>Partidos y Marcadores</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('posiciones');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2"
                      >
                        <Trophy className="w-4 h-4 text-amber-500" />
                        <span>Tabla de Posiciones</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('mistorneos');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2"
                      >
                        <Layers className="w-4 h-4 text-[#0052fe]" />
                        <span>Mis Torneos Activos</span>
                      </button>
                    </>
                  )}

                  {currentUser?.role === 'super_admin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('admin');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Sliders className="w-4 h-4 text-[#0052fe]" />
                      <span>Panel Administrador General</span>
                    </button>
                  )}

                  {(currentUser?.role === 'club_admin' || currentUser?.role === 'super_admin') && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('club');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Shield className="w-4 h-4 text-[#0052fe]" />
                      <span>Mi Club</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('cuenta');
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2"
                  >
                    <User className="w-4 h-4 text-[#0052fe]" />
                    <span>Mi Cuenta</span>
                  </button>

                  {currentUser ? (
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setActiveTab('resumen');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Cerrar Sesión</span>
                    </button>
                  ) : (
                    <>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        type="button"
                        onClick={() => {
                          onOpenAuth('organizer_key');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50/70 hover:bg-blue-100 rounded-xl transition-colors flex items-center gap-2"
                      >
                        <Key className="w-4 h-4 text-[#0052fe]" />
                        <span>Activar Clave de Organizador</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onOpenAuth('invite');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2"
                      >
                        <Key className="w-4 h-4 text-emerald-600" />
                        <span>Canjear Clave Única de Club</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onOpenAuth('login');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2"
                      >
                        <User className="w-4 h-4 text-slate-600" />
                        <span>Iniciar Sesión</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: BRAND LOGO TORNOW */}
        <div
          onClick={() => setActiveTab('resumen')}
          className="flex-1 flex flex-col items-center justify-center cursor-pointer select-none group py-0.5"
          role="button"
          tabIndex={0}
          aria-label="Ir a Inicio TORNOW"
        >
          <img
            src="/assets/aistudio/LOGO-APP_b8fa7d9b.png"
            alt="TORNOW!"
            className="h-7 sm:h-8 md:h-9 w-auto max-w-[165px] sm:max-w-[200px] md:max-w-[220px] object-contain transition-transform group-hover:scale-105"
          />
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#0052fe] bg-blue-50/90 px-2 py-0.2 rounded-full border border-blue-200 shadow-2xs">
              {activeTab === 'calendario'
                ? 'Partidos'
                : activeTab === 'posiciones'
                ? 'Tabla'
                : activeTab === 'mistorneos'
                ? 'Mis torneos'
                : activeTab === 'cuenta'
                ? 'Mi cuenta'
                : activeTab === 'organizer'
                ? 'Panel Organizador'
                : activeTab === 'admin'
                ? 'Administración'
                : activeTab === 'club'
                ? 'Mi Club'
                : activeTab === 'marcador'
                ? 'Marcador'
                : 'Inicio'}
            </span>
          </div>
        </div>

        {/* Right: Notifications Bell Button */}
        <div className="w-10 flex items-center justify-end">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="w-9 h-9 rounded-full bg-white text-slate-800 shadow-2xs border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors relative"
              aria-label={`Notificaciones push (${unreadCount} nuevas)`}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#0052fe] text-white text-[9px] font-black flex items-center justify-center shadow">
                  {unreadCount}
                </span>
              )}
            </button>

            <NotificationDropdown
              isOpen={isNotifOpen}
              onClose={() => setIsNotifOpen(false)}
              onSelectMatch={(matchId) => {
                if (onSelectMatchFromNotif) onSelectMatchFromNotif(matchId);
                setActiveTab('calendario');
              }}
              onSelectClub={(clubId) => {
                if (onSelectClubFromNotif) onSelectClubFromNotif(clubId);
                else setActiveTab('club');
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
};
