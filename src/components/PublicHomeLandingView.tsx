import React, { useState } from 'react';
import {
  Trophy,
  Shield,
  Key,
  Radio,
  Sliders,
  Users,
  CheckCircle2,
  FileSpreadsheet,
  Lock,
  Phone,
  Mail,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  Zap,
  Activity,
  Flame,
  Calendar,
  Sparkles,
  ArrowRight,
  Send,
  Eye,
  Building,
  Check,
} from 'lucide-react';
import { useTournament } from '../context/TournamentContext';
import { PlayoffNodeGraph } from './PlayoffNodeGraph';
import { PricingPlansSection } from './PricingPlansSection';
import { Standing } from '../types';

interface PublicHomeLandingViewProps {
  onOpenAuth: (mode?: 'login' | 'invite' | 'organizer_key') => void;
  onOpenQuoteModal?: () => void;
}

export const PublicHomeLandingView: React.FC<PublicHomeLandingViewProps> = ({
  onOpenAuth,
}) => {
  const { sendLeagueNotification, clubs, standings, activeTournament } = useTournament();

  const formattedStandings: Standing[] = React.useMemo(() => {
    return standings.map((s) => ({
      clubId: s.clubId,
      played: s.played,
      wins: s.won,
      losses: s.lost,
      setsWon: s.setsFor,
      setsLost: s.setsAgainst,
      pointsWon: s.setsFor * 25,
      pointsLost: s.setsAgainst * 21,
      setsRatio: s.setsAgainst > 0 ? Number((s.setsFor / s.setsAgainst).toFixed(2)) : s.setsFor,
      pointsRatio: 1,
      points: s.pts,
    }));
  }, [standings]);

  // Active showcase screen tab
  const [activeScreenTab, setActiveScreenTab] = useState<'splash' | 'live' | 'standings' | 'roster' | 'playoffs'>('live');

  // Interactive Quote Form State
  const [quoteSport, setQuoteSport] = useState('volleyball');
  const [quoteTeamsCount, setQuoteTeamsCount] = useState(8);
  const [quoteWeeks, setQuoteWeeks] = useState(4);
  const [quoteLiveScorer, setQuoteLiveScorer] = useState(true);
  const [quoteRegulations, setQuoteRegulations] = useState(true);
  const [quoteOrganizerName, setQuoteOrganizerName] = useState('');
  const [quoteTournamentName, setQuoteTournamentName] = useState('');
  const [quoteEmail, setQuoteEmail] = useState('');
  const [quotePhone, setQuotePhone] = useState('');
  const [quoteSent, setQuoteSent] = useState(false);
  const [isLoadingScreen, setIsLoadingScreen] = useState(false);

  const handleSimulateLoadingScreen = () => {
    setIsLoadingScreen(true);
    setTimeout(() => {
      setIsLoadingScreen(false);
    }, 2000);
  };

  const handleSendQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteOrganizerName || !quoteEmail) return;

    // Send notification to super admin in context
    sendLeagueNotification({
      title: `Nueva Cotización: ${quoteTournamentName || 'Torneo Nuevo'}`,
      message: `El organizador ${quoteOrganizerName} (${quoteEmail}, Tel: ${quotePhone || 'N/A'}) solicitó cotización para ${quoteTeamsCount} equipos en ${quoteSport.toUpperCase()} (${quoteWeeks} semanas).`,
      category: 'convocatoria',
      priority: 'alta',
      targetClubId: 'ALL',
    });

    setQuoteSent(true);
  };

  const whatsappMessage = encodeURIComponent(
    `Hola equipo TORNOW, me gustaría cotizar una licencia de organizador para mi torneo "${quoteTournamentName || 'Mi Torneo'}" (${quoteSport}, ${quoteTeamsCount} equipos, ${quoteWeeks} semanas). Mi nombre es ${quoteOrganizerName || 'Organizador'}.`
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Hero Welcome Banner */}
      <section className="bg-gradient-to-br from-[#081223] via-[#0c1b35] to-[#081223] rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#0052fe]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 bg-white rounded-xl px-3 py-1 shadow-md">
              <img
                src="/assets/aistudio/LOGO-APP_b8fa7d9b.png"
                alt="TORNOW!"
                className="h-5 sm:h-6 w-auto object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/assets/aistudio/666D8292-C6E2-4221-B877-64CBCC0C955D_11a53e32.png';
                }}
              />
            </div>
            <span className="px-3 py-1 rounded-full bg-slate-800/80 text-blue-300 text-[11px] font-bold border border-blue-500/30">
              Gestión Oficial de Ligas & Torneos
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Control total para tus campeonatos deportivos
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
              Plataforma profesional con marcadores en vivo, control de nóminas por club, cruces de playoffs desde octavos de final y bases oficiales.
            </p>
          </div>

          {/* Access notice */}
          <div className="p-3.5 bg-blue-950/40 rounded-2xl border border-blue-500/30 text-xs text-blue-200 flex items-start gap-3">
            <Key className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">Acceso Exclusivo con Key Única</span>
              Las cuentas de Organizador se otorgan con una clave exclusiva tras un acuerdo comercial con nuestro equipo de soporte. Los delegados de club acceden con la clave única enviada por su organizador.
            </div>
          </div>

          {/* Recuadro de 1 Mes de Prueba Gratuita por WhatsApp */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900/90 to-blue-950/90 border border-emerald-400/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-400/30">
                🎁 1 Mes de Prueba Gratuita (30 Días)
              </span>
              <h3 className="text-sm sm:text-base font-black text-white">
                ¿Quieres probar TorNow gratis durante 1 mes en tu torneo?
              </h3>
              <p className="text-xs text-slate-300">
                Contáctanos por WhatsApp indicando solo el nombre de tu torneo y alguien de nuestro equipo te responderá de inmediato con tu Key de prueba gratuita.
              </p>
            </div>
            <a
              href={`https://wa.me/56957950579?text=${encodeURIComponent(
                '¡Hola equipo TorNow! 👋 Quiero pedir mi Key de 1 MES DE PRUEBA GRATUITA para mi campeonato. ¿Me ayudan a activarla?'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider inline-flex items-center gap-2 shadow-md transition-transform active:scale-95 shrink-0 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Hablar con el Equipo por WhatsApp</span>
            </a>
          </div>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-wrap gap-2.5">
            <a
              href="#cotizador"
              className="px-5 py-2.5 rounded-full bg-[#0052fe] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Cotizar Torneo con Soporte</span>
            </a>

            <button
              onClick={() => onOpenAuth('organizer_key')}
              className="px-4 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-blue-300 font-bold text-xs sm:text-sm border border-blue-500/30 flex items-center gap-2 transition-colors"
            >
              <Key className="w-4 h-4 text-blue-400" />
              <span>Tengo Key de Organizador</span>
            </button>

            <button
              onClick={() => onOpenAuth('invite')}
              className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/20 flex items-center gap-2 transition-colors"
            >
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Clave de Club / Delegado</span>
            </button>
          </div>
        </div>
      </section>

      {/* Interactive Showcase of Screens and Loading Screens */}
      <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#0052fe]" />
              Capturas y Pantallas de la Plataforma
            </h2>
            <p className="text-xs text-slate-500">
              Explora cómo funciona el sistema para organizadores, árbitros y clubes.
            </p>
          </div>

          <button
            onClick={handleSimulateLoadingScreen}
            disabled={isLoadingScreen}
            className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>{isLoadingScreen ? 'Cargando Pantalla...' : 'Ver Pantalla de Carga'}</span>
          </button>
        </div>

        {/* Tab selector for showcase */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
          <button
            onClick={() => setActiveScreenTab('live')}
            className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeScreenTab === 'live'
                ? 'bg-[#121316] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-red-500" />
            <span>Marcador En Vivo</span>
          </button>

          <button
            onClick={() => setActiveScreenTab('playoffs')}
            className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeScreenTab === 'playoffs'
                ? 'bg-[#121316] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-blue-500" />
            <span>Cruces Playoffs</span>
          </button>

          <button
            onClick={() => setActiveScreenTab('standings')}
            className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeScreenTab === 'standings'
                ? 'bg-[#121316] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Tablas & Posiciones</span>
          </button>

          <button
            onClick={() => setActiveScreenTab('roster')}
            className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeScreenTab === 'roster'
                ? 'bg-[#121316] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-500" />
            <span>Inscripción Jugadores & Staff</span>
          </button>

          <button
            onClick={() => setActiveScreenTab('splash')}
            className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeScreenTab === 'splash'
                ? 'bg-[#121316] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
            <span>Pantalla de Carga</span>
          </button>
        </div>

        {/* Simulated Screen Display Frame */}
        <div className="relative rounded-2xl bg-slate-900 border border-slate-800 p-4 text-white min-h-[310px] overflow-hidden flex flex-col justify-between">
          {isLoadingScreen ? (
            <div className="absolute inset-0 bg-[#0e1015] z-30 flex flex-col items-center justify-center space-y-4 animate-in fade-in">
              <div className="bg-white rounded-2xl p-4 shadow-xl shadow-cyan-500/20">
                <img
                  src="/assets/aistudio/LOGO-APP_b8fa7d9b.png"
                  alt="TORNOW!"
                  className="h-8 w-auto object-contain animate-pulse"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/assets/aistudio/666D8292-C6E2-4221-B877-64CBCC0C955D_11a53e32.png';
                  }}
                />
              </div>
              <div className="text-center space-y-1">
                <span className="font-extrabold text-sm text-white tracking-wide">Plataforma Oficial</span>
                <p className="text-xs text-cyan-300">Sincronizando fixture y marcadores oficiales...</p>
              </div>
              <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-teal-400 to-cyan-300 w-3/4 animate-pulse rounded-full" />
              </div>
            </div>
          ) : null}

          {/* Screen Content 1: Live Score */}
          {activeScreenTab === 'live' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-bold text-red-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  EN VIVO • SET 3 (Voleibol Master)
                </span>
                <span className="text-slate-400 text-[11px]">Cancha Central Mikasa</span>
              </div>

              <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-600 text-white font-extrabold flex items-center justify-center text-sm shadow">
                    VM
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">Vóley Manquehue</h4>
                    <span className="text-[11px] text-teal-300 font-bold">2 Sets Ganados</span>
                  </div>
                </div>
                <div className="text-center px-3 py-1 bg-black/40 rounded-lg">
                  <span className="text-2xl font-black text-amber-400 font-mono">25</span>
                  <span className="text-[10px] text-slate-400 block uppercase">Puntos</span>
                </div>
              </div>

              <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-sm shadow">
                    CS
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">Club Stadio Italiano</h4>
                    <span className="text-[11px] text-blue-300 font-bold">1 Set Ganado</span>
                  </div>
                </div>
                <div className="text-center px-3 py-1 bg-black/40 rounded-lg">
                  <span className="text-2xl font-black text-white font-mono">23</span>
                  <span className="text-[10px] text-slate-400 block uppercase">Puntos</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 italic text-center pt-1">
                Actualizaciones en vivo segundo a segundo con push alerts automáticas a delegados y seguidores.
              </p>
            </div>
          )}

          {/* Screen Content 2: Playoffs con Animación de Nodos Interactivos */}
          {activeScreenTab === 'playoffs' && (
            <div className="space-y-3">
              <PlayoffNodeGraph
                clubs={clubs}
                standings={formattedStandings}
                savedMatchups={activeTournament?.playoffs?.matchups || []}
                compact={true}
              />
            </div>
          )}

          {/* Screen Content 3: Standings */}
          {activeScreenTab === 'standings' && (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-400 text-[11px] pb-1 border-b border-slate-800 font-bold">
                <span>CLUB</span>
                <div className="flex gap-4">
                  <span>PJ</span>
                  <span>PG</span>
                  <span>PP</span>
                  <span className="text-amber-400">PTS</span>
                </div>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60 font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold flex items-center justify-center">1</span>
                  <span className="text-white font-bold">Vóley Manquehue</span>
                </div>
                <div className="flex gap-4 text-slate-300">
                  <span>5</span>
                  <span className="text-emerald-400">5</span>
                  <span>0</span>
                  <span className="text-amber-400 font-extrabold">15</span>
                </div>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60 font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold flex items-center justify-center">2</span>
                  <span className="text-white font-bold">Stadio Italiano</span>
                </div>
                <div className="flex gap-4 text-slate-300">
                  <span>5</span>
                  <span className="text-emerald-400">4</span>
                  <span>1</span>
                  <span className="text-amber-400 font-extrabold">12</span>
                </div>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60 font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-extrabold flex items-center justify-center">3</span>
                  <span className="text-white font-bold">Boston College</span>
                </div>
                <div className="flex gap-4 text-slate-300">
                  <span>5</span>
                  <span className="text-emerald-400">3</span>
                  <span>2</span>
                  <span className="text-amber-400 font-extrabold">9</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 text-right pt-1">
                Tablas automáticas por grupo o general con diferencia de sets y desempate oficial.
              </p>
            </div>
          )}

          {/* Screen Content 4: Roster */}
          {activeScreenTab === 'roster' && (
            <div className="space-y-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  Menú de Inscripción de Jugadores y Cuerpo Técnico
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Número de Camiseta & Staff Oficial
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px]">
                <div className="bg-slate-800/80 rounded-xl p-2.5 space-y-1.5 border border-slate-700/80">
                  <div className="flex justify-between text-emerald-400 font-bold text-[10px] border-b border-slate-700 pb-1">
                    <span>CAMISETA & JUGADOR</span>
                    <span>POSICIÓN / ROL</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-200">
                    <span><strong className="text-amber-400 font-mono">#10</strong> Matías Valenzuela</span>
                    <span className="text-cyan-300">Armador • 👑 Capitán</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-200">
                    <span><strong className="text-amber-400 font-mono">#7</strong> Lucas Carrasco</span>
                    <span className="text-cyan-300">Líbero • 🛡️ Líbero 1</span>
                  </div>
                </div>

                <div className="bg-slate-800/80 rounded-xl p-2.5 space-y-1.5 border border-slate-700/80">
                  <div className="flex justify-between text-cyan-400 font-bold text-[10px] border-b border-slate-700 pb-1">
                    <span>CAMISETA & CUERPO TÉCNICO</span>
                    <span>CARGO OFICIAL</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-200">
                    <span><strong className="text-cyan-300 font-mono">#DT</strong> Roberto Rojas</span>
                    <span className="text-emerald-300">Entrenador Principal</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-200">
                    <span><strong className="text-cyan-300 font-mono">#AN</strong> Camila Soto</span>
                    <span className="text-purple-300">Asistente & Analista</span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 text-center italic">
                Inscripción directa con datos reales y número de camiseta para jugadores, entrenadores, asistentes y analistas.
              </p>
            </div>
          )}

          {/* Screen Content 5: Splash Loading Screen */}
          {activeScreenTab === 'splash' && (
            <div className="py-6 flex flex-col items-center justify-center space-y-3 text-center">
              <div className="bg-white rounded-2xl p-4 shadow-xl">
                <img
                  src="/assets/aistudio/LOGO-APP_b8fa7d9b.png"
                  alt="TORNOW!"
                  className="h-8 w-auto object-contain mx-auto"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/assets/aistudio/666D8292-C6E2-4221-B877-64CBCC0C955D_11a53e32.png';
                  }}
                />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-white">Identidad TORNOW para tu Campeonato</h4>
                <p className="text-xs text-slate-400">Pantallas de carga optimizadas y ultrarrápidas con la identidad de tu liga</p>
              </div>
              <button
                onClick={handleSimulateLoadingScreen}
                className="px-4 py-1.5 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow transition-transform active:scale-95"
              >
                Probar animación de carga en vivo
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Interactive Neural Network Playoff Node Graph Section */}
      <PlayoffNodeGraph
        clubs={clubs}
        standings={formattedStandings}
        savedMatchups={activeTournament?.playoffs?.matchups || []}
      />

      {/* Categorized Plans Section (Plan Básico, Plan Pro, Plan Now!, Plan Total) */}
      <PricingPlansSection
        onSelectPlan={(planName) => {
          setQuoteTournamentName((prev) => prev || `Suscripción ${planName}`);
          const el = document.getElementById('cotizador');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Interactive Tournament Quoting & Support Contact Form */}
      <section id="cotizador" className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200 space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-extrabold uppercase">
            Cotizador Oficial
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
            Cotiza tu Torneo y Adquiere tu Key de Organizador
          </h2>
          <p className="text-xs text-slate-500">
            Ponte en contacto con nuestro equipo comercial y de soporte técnico para habilitar tu plataforma a medida.
          </p>
        </div>

        {quoteSent ? (
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-emerald-900">
              ¡Solicitud de Cotización Enviada con Éxito!
            </h3>
            <p className="text-xs text-emerald-800 max-w-md mx-auto">
              Hemos registrado tu solicitud para <strong>{quoteTournamentName || 'tu torneo'}</strong>. Un administrador de TORNOW se comunicará contigo vía WhatsApp/Email para coordinar la entrega de tu <strong>Key Única de Organizador</strong>.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <a
                href={`https://wa.me/56957950579?text=${whatsappMessage}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Hablar ahora por WhatsApp</span>
              </a>
              <button
                onClick={() => setQuoteSent(false)}
                className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
              >
                Nueva cotización
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendQuote} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Sport */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deporte del Torneo
                </label>
                <select
                  value={quoteSport}
                  onChange={(e) => setQuoteSport(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0052fe]"
                >
                  <option value="volleyball">🏐 Voleibol (Sets & Rotaciones)</option>
                  <option value="football">⚽ Fútbol (11 vs 11)</option>
                  <option value="futsal">🥅 Futsal / Futbolito</option>
                  <option value="basketball">🏀 Básquetbol</option>
                  <option value="padel">🎾 Pádel (Cuadros & Sets)</option>
                </select>
              </div>

              {/* Teams count */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cantidad Estimada de Equipos: <span className="text-[#0052fe] font-extrabold">{quoteTeamsCount} Clubes</span>
                </label>
                <input
                  type="range"
                  min="4"
                  max="32"
                  step="2"
                  value={quoteTeamsCount}
                  onChange={(e) => setQuoteTeamsCount(Number(e.target.value))}
                  className="w-full accent-[#0052fe] cursor-pointer"
                />
              </div>

              {/* Weeks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Duración estimada del torneo: <span className="text-[#0052fe] font-extrabold">{quoteWeeks} Semanas</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="16"
                  value={quoteWeeks}
                  onChange={(e) => setQuoteWeeks(Number(e.target.value))}
                  className="w-full accent-[#0052fe] cursor-pointer"
                />
              </div>

              {/* Addons */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Módulos Adicionales
                </label>
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={quoteLiveScorer}
                      onChange={(e) => setQuoteLiveScorer(e.target.checked)}
                      className="rounded text-[#0052fe] focus:ring-[#0052fe]"
                    />
                    Marcador En Vivo
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={quoteRegulations}
                      onChange={(e) => setQuoteRegulations(e.target.checked)}
                      className="rounded text-[#0052fe] focus:ring-[#0052fe]"
                    />
                    Bases & Reglamento
                  </label>
                </div>
              </div>
            </div>

            {/* Direct WhatsApp Cotización Banner */}
            <div className="p-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-emerald-500/20 shadow-sm">
              <div className="space-y-0.5">
                <span className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  Atención Directa vía WhatsApp
                </span>
                <p className="text-xs text-slate-300 font-medium">
                  ¿Prefieres cotizar de forma directa e inmediata con soporte? Escríbenos a nuestro WhatsApp oficial:
                </p>
                <span className="text-sm font-mono font-extrabold text-white block">
                  +56 9 5795 0579
                </span>
              </div>

              <a
                href={`https://wa.me/56957950579?text=${whatsappMessage}`}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-transform active:scale-95 whitespace-nowrap self-stretch sm:self-auto justify-center"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Cotizar por WhatsApp</span>
              </a>
            </div>

            {/* Contact details for request */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Organizador o Entidad *
                </label>
                <input
                  type="text"
                  required
                  value={quoteOrganizerName}
                  onChange={(e) => setQuoteOrganizerName(e.target.value)}
                  placeholder="Ej. Juan Pérez / Club Deportivo Los Andes"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0052fe]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Torneo
                </label>
                <input
                  type="text"
                  value={quoteTournamentName}
                  onChange={(e) => setQuoteTournamentName(e.target.value)}
                  placeholder="Ej. Copa Apertura Voleibol 2026"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0052fe]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={quoteEmail}
                  onChange={(e) => setQuoteEmail(e.target.value)}
                  placeholder="organizador@torneo.cl"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0052fe]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="tel"
                  value={quotePhone}
                  onChange={(e) => setQuotePhone(e.target.value)}
                  placeholder="+56 9 1234 5678"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0052fe]"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <a
                  href="mailto:tornowcl@gmail.com"
                  className="flex items-center gap-1 hover:text-[#0052fe] transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  tornowcl@gmail.com
                </a>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  +56 9 5795 0579
                </span>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#0052fe] hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>Enviar Solicitud a Soporte</span>
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Footer Info */}
      <footer className="text-center text-xs text-slate-500 font-semibold pt-4 pb-2">
        <p>TorNow! • Derechos de autor reservado 2026 (c)</p>
      </footer>
    </div>
  );
};
