import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Trophy,
  Plus,
  Shield,
  Layers,
  Search,
  User,
  Home,
  Sparkles,
} from 'lucide-react';
import { useTournament } from '../context/TournamentContext';

export type AppNavTab =
  | 'resumen'
  | 'posiciones'
  | 'calendario'
  | 'marcador'
  | 'club'
  | 'organizer'
  | 'admin'
  | 'mistorneos'
  | 'cuenta';

export type NavTabType = AppNavTab;

interface BottomNavDockProps {
  activeTab: AppNavTab;
  setActiveTab: (tab: AppNavTab) => void;
  onOpenAuth?: (mode?: 'login' | 'invite' | 'organizer_key') => void;
  onOpenCreateTournament?: () => void;
  onOpenSelectTournament?: () => void;
  onOpenQuote?: () => void;
}

interface NavItemConfig {
  id: string;
  name: string; // 1-2 words short name (min 12px)
  description: string; // 1-line description for long press
  tourHint: string; // Brief tour hint
  tabTarget?: AppNavTab;
  onClick: () => void;
  badgeCount?: number;
  isCenterAction?: boolean;
}

export const BottomNavDock: React.FC<BottomNavDockProps> = ({
  activeTab,
  setActiveTab,
  onOpenAuth,
  onOpenCreateTournament,
}) => {
  const { currentUser, unreadCount, matches } = useTournament();
  const role = currentUser?.role;

  // Live match count for badge
  const liveMatchesCount = matches.filter((m) => m.status === 'live').length;

  // New user onboarding tour state
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [longPressTooltip, setLongPressTooltip] = useState<{ text: string; x: number } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      const tourSeen = localStorage.getItem('tornow_nav_tour_seen');
      if (!tourSeen) {
        const timer = setTimeout(() => {
          setTourStep(0);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const handleDismissTour = () => {
    setTourStep(null);
    try {
      localStorage.setItem('tornow_nav_tour_seen', 'true');
    } catch {
      // Ignore
    }
  };

  const handleNextTourStep = (maxSteps: number) => {
    if (tourStep === null) return;
    if (tourStep + 1 >= maxSteps) {
      handleDismissTour();
    } else {
      setTourStep(tourStep + 1);
    }
  };

  // Long press handler for touch & desktop
  const handleStartPress = (desc: string, e: React.TouchEvent | React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;

    longPressTimerRef.current = setTimeout(() => {
      setLongPressTooltip({ text: desc, x: centerX });
    }, 450);
  };

  const handleEndPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setTimeout(() => {
      setLongPressTooltip(null);
    }, 1500);
  };

  // Click handler that checks active state to scroll to top
  const handleTabClick = (item: NavItemConfig) => {
    if (item.tabTarget && activeTab === item.tabTarget) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    item.onClick();
  };

  const handleCreateTournamentClick = () => {
    if (currentUser?.role === 'super_admin' || currentUser?.role === 'organizer') {
      if (onOpenCreateTournament) {
        onOpenCreateTournament();
      } else {
        setActiveTab(currentUser.role === 'super_admin' ? 'admin' : 'organizer');
      }
    } else if (currentUser) {
      if (onOpenCreateTournament) {
        onOpenCreateTournament();
      } else if (onOpenAuth) {
        onOpenAuth('organizer_key');
      }
    } else {
      if (onOpenAuth) {
        onOpenAuth('login');
      }
    }
  };

  // Build role-based navigation items:
  // 1. Guests (!currentUser or role === 'usuario'): Inicio, Crear torneo, Mi cuenta (3 icons)
  // 2. Club Delegates (role === 'club_admin'): Mi Club, Crear torneo, Mi cuenta (3 icons)
  // 3. Organizers & Super Admins (role === 'organizer' | 'super_admin'): 5 icons
  const items: NavItemConfig[] = [];

  if (!currentUser || role === 'usuario') {
    items.push({
      id: 'inicio',
      name: 'Inicio',
      description: 'Pantalla de inicio y presentación oficial de la plataforma',
      tourHint: 'Vuelve al inicio principal de TORNOW en cualquier momento.',
      tabTarget: 'resumen',
      onClick: () => setActiveTab('resumen'),
    });

    items.push({
      id: 'crear',
      name: 'Crear torneo',
      description: 'Crea tu propio campeonato oficial con nóminas y cruces de playoffs',
      tourHint: 'Crea tu propio campeonato oficial con nóminas y cruces.',
      isCenterAction: true,
      onClick: handleCreateTournamentClick,
    });

    items.push({
      id: 'cuenta',
      name: 'Mi cuenta',
      description: 'Inicia sesión o canjea tu clave de organizador o delegado de club',
      tourHint: 'Inicia sesión o activa tu clave de acceso deportiva.',
      tabTarget: 'cuenta',
      onClick: () => setActiveTab('cuenta'),
    });
  } else if (role === 'club_admin') {
    items.push({
      id: 'equipo',
      name: 'Mi Club',
      description: 'Gestión de nómina de jugadores, cuerpo técnico y credenciales de tu club',
      tourHint: 'Inscribe y gestiona los jugadores y cuerpo técnico de tu club.',
      tabTarget: 'club',
      onClick: () => setActiveTab('club'),
    });

    items.push({
      id: 'crear',
      name: 'Crear torneo',
      description: 'Crea tu propio campeonato oficial con nóminas y cruces de playoffs',
      tourHint: 'Crea tu propio campeonato oficial con nóminas y cruces.',
      isCenterAction: true,
      onClick: handleCreateTournamentClick,
    });

    items.push({
      id: 'cuenta',
      name: 'Mi cuenta',
      description: 'Perfil de usuario, contraseñas, caché de sesión y soporte',
      tourHint: 'Configuraciones de tu cuenta, seguridad y registro de sesiones.',
      badgeCount: unreadCount,
      tabTarget: 'cuenta',
      onClick: () => setActiveTab('cuenta'),
    });
  } else {
    // Organizers & Super Administrators see all 5 icons
    items.push({
      id: 'partidos',
      name: 'Partidos',
      description: 'Fixture oficial, programación por fechas y marcadores en juego',
      tourHint: 'Aquí ves los partidos que se juegan hoy, la programación y marcadores en vivo.',
      tabTarget: 'calendario',
      badgeCount: liveMatchesCount,
      onClick: () => setActiveTab('calendario'),
    });

    items.push({
      id: 'tabla',
      name: 'Tabla',
      description: 'Clasificación oficial por categorías, puntos y clasificados',
      tourHint: 'Revisa las posiciones, puntos y clasificados de cada categoría.',
      tabTarget: 'posiciones',
      onClick: () => setActiveTab('posiciones'),
    });

    items.push({
      id: 'crear',
      name: 'Crear torneo',
      description: 'Crea tu propio campeonato oficial con nóminas y cruces de playoffs',
      tourHint: 'Crea tu propio campeonato oficial con nóminas y cruces.',
      isCenterAction: true,
      onClick: handleCreateTournamentClick,
    });

    items.push({
      id: 'mistorneos',
      name: 'Mis torneos',
      description: 'Panel y listado de torneos activos para entrar a su configuración',
      tourHint: 'Revisa y gestiona todos tus campeonatos deportivos activos.',
      tabTarget: 'mistorneos',
      onClick: () => setActiveTab('mistorneos'),
    });

    items.push({
      id: 'cuenta',
      name: 'Mi cuenta',
      description: 'Perfil de usuario, contraseñas, caché de sesión y soporte',
      tourHint: 'Configuraciones de tu cuenta, seguridad y registro de sesiones.',
      badgeCount: unreadCount,
      tabTarget: 'cuenta',
      onClick: () => setActiveTab('cuenta'),
    });
  }

  const activeTourItem = tourStep !== null && items[tourStep] ? items[tourStep] : null;

  return (
    <>
      {/* Floating Long-Press Tooltip Description */}
      {longPressTooltip && (
        <div
          className="fixed bottom-24 -translate-x-1/2 z-60 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
          style={{ left: `${Math.min(Math.max(longPressTooltip.x, 140), window.innerWidth - 140)}px` }}
        >
          <div className="bg-[#081223] text-white text-[11px] font-semibold px-3.5 py-1.5 rounded-xl shadow-2xl border border-slate-700 max-w-xs text-center leading-snug">
            {longPressTooltip.text}
          </div>
        </div>
      )}

      {/* New User Interactive Step-by-Step Tour Tooltip (No blur over the navigation dock!) */}
      {activeTourItem && tourStep !== null && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/40 pointer-events-none transition-opacity animate-in fade-in"
          />

          <div className="fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm sm:max-w-md px-4 pointer-events-auto animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-2xl border-2 border-[#0052fe] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-[#0052fe] flex items-center gap-1.5 uppercase tracking-wider text-[11px] bg-blue-50 px-2.5 py-1 rounded-full">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    Guía para Principiantes ({tourStep + 1} de {items.length})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleDismissTour}
                  className="text-slate-400 hover:text-slate-700 text-xs font-bold px-2 py-0.5 rounded-lg hover:bg-slate-100"
                >
                  Saltar
                </button>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center shrink-0">
                    {tourStep + 1}
                  </span>
                  <span>Sección: {activeTourItem.name}</span>
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-8">
                  {activeTourItem.tourHint}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-amber-600">
                  Mira el botón iluminado abajo 👇
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDismissTour}
                    className="px-3 py-1.5 rounded-full text-slate-500 hover:bg-slate-100 text-xs font-bold"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNextTourStep(items.length)}
                    className="px-4 py-1.5 rounded-full bg-[#0052fe] text-white text-xs font-black shadow-md hover:bg-blue-700"
                  >
                    {tourStep === items.length - 1 ? '¡Entendido!' : 'Siguiente →'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Role-Adaptive Bottom Navigation Dock */}
      <nav
        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center pointer-events-auto w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl px-2 sm:px-4"
        aria-label="Navegación principal TORNOW"
      >
        <div className="w-full bg-[#081223] text-white rounded-3xl p-1.5 sm:p-2 shadow-[0_15px_40px_rgba(0,0,0,0.5)] border border-slate-800/90 flex items-center justify-between gap-1 sm:gap-2">
          {items.map((item, index) => {
            const isActive = item.tabTarget ? activeTab === item.tabTarget : false;
            const isTourTarget = activeTourItem !== null && tourStep === index;
            const isDimmedByTour = activeTourItem !== null && !isTourTarget;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabClick(item)}
                onTouchStart={(e) => handleStartPress(item.description, e)}
                onTouchEnd={handleEndPress}
                onMouseDown={(e) => handleStartPress(item.description, e)}
                onMouseUp={handleEndPress}
                onMouseLeave={handleEndPress}
                className={`relative flex-1 min-h-[52px] sm:min-h-[56px] py-1.5 px-1 sm:px-2 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 select-none ${
                  isTourTarget
                    ? 'bg-[#0052fe] text-white ring-4 ring-amber-400 scale-110 z-20 shadow-[0_0_25px_rgba(251,191,36,0.75)] font-black'
                    : isDimmedByTour
                    ? 'opacity-35 text-slate-400 scale-95'
                    : item.isCenterAction
                    ? 'bg-[#0052fe] hover:bg-blue-600 text-white shadow-lg mx-0.5 sm:mx-1 scale-102 active:scale-95'
                    : isActive
                    ? 'bg-white/15 text-white font-black'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title={item.description}
                aria-label={item.name}
              >
                {/* Spotlight Floating Indicator when this button is being explained in the Tour */}
                {isTourTarget && (
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black whitespace-nowrap shadow-md animate-bounce pointer-events-none">
                    👇 {item.name}
                  </span>
                )}

                {/* Pending Badge Counter (Max 99+) */}
                {item.badgeCount !== undefined && item.badgeCount > 0 && (
                  <span className="absolute top-1 right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-mono font-black flex items-center justify-center shadow-md animate-pulse">
                    {item.badgeCount > 99 ? '99+' : item.badgeCount}
                  </span>
                )}

                {/* Literal Icons */}
                <div className="relative flex items-center justify-center mb-0.5">
                  {item.id === 'inicio' && (
                    <Home
                      className={`w-5 h-5 ${
                        isActive || isTourTarget ? 'text-white stroke-[2.6]' : 'text-slate-400 stroke-[2]'
                      }`}
                    />
                  )}
                  {item.id === 'partidos' && (
                    <Calendar
                      className={`w-5 h-5 ${
                        isActive || isTourTarget ? 'text-white stroke-[2.6]' : 'text-slate-400 stroke-[2]'
                      }`}
                    />
                  )}
                  {item.id === 'tabla' && (
                    <Trophy
                      className={`w-5 h-5 ${
                        isActive || isTourTarget
                          ? 'text-amber-300 stroke-[2.6] fill-amber-400/20'
                          : 'text-slate-400 stroke-[2]'
                      }`}
                    />
                  )}
                  {item.id === 'crear' && (
                    <div className="relative">
                      <Trophy className="w-5 h-5 text-white stroke-[2.4]" />
                      <Plus className="w-3 h-3 text-white stroke-[3.5] absolute -top-1 -right-1.5 bg-[#0052fe] rounded-full" />
                    </div>
                  )}
                  {item.id === 'equipo' && (
                    <Shield
                      className={`w-5 h-5 ${
                        isActive || isTourTarget ? 'text-emerald-300 stroke-[2.6]' : 'text-slate-400 stroke-[2]'
                      }`}
                    />
                  )}
                  {item.id === 'mistorneos' && (
                    <Layers
                      className={`w-5 h-5 ${
                        isActive || isTourTarget ? 'text-white stroke-[2.6]' : 'text-slate-400 stroke-[2]'
                      }`}
                    />
                  )}
                  {item.id === 'buscar' && (
                    <Search
                      className={`w-5 h-5 ${
                        isActive || isTourTarget ? 'text-blue-300 stroke-[2.6]' : 'text-slate-400 stroke-[2]'
                      }`}
                    />
                  )}
                  {item.id === 'cuenta' && (
                    <User
                      className={`w-5 h-5 ${
                        isActive || isTourTarget ? 'text-white stroke-[2.6]' : 'text-slate-400 stroke-[2]'
                      }`}
                    />
                  )}
                </div>

                {/* Always Visible Text Label (min 12px) */}
                <span
                  className={`text-[12px] sm:text-[13px] leading-tight tracking-tight text-center truncate max-w-full ${
                    item.isCenterAction || isTourTarget
                      ? 'font-black text-white'
                      : isActive
                      ? 'font-extrabold text-white'
                      : 'font-medium text-slate-400'
                  }`}
                >
                  {item.name}
                </span>

                {/* Active Indicator Underline */}
                {isActive && !item.isCenterAction && !isTourTarget && (
                  <span className="w-3.5 h-0.5 rounded-full bg-[#0052fe] mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
