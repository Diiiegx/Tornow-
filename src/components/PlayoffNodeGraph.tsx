import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Shuffle,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Flame,
  Shield,
  Info,
  Cpu,
  Activity,
} from 'lucide-react';
import { Club, Standing, PlayoffStage, PlayoffMatchup } from '../types';
import {
  buildClubSeedsFromStandings,
  generateAutomaticPlayoffMatchups,
  PlayoffDrawResult,
} from '../logic/playoffMatchmaker';

interface PlayoffNodeGraphProps {
  clubs: Club[];
  standings: Standing[];
  savedMatchups?: PlayoffMatchup[];
  isOrganizer?: boolean;
  onSavePlayoffs?: (matchups: PlayoffMatchup[], stage: PlayoffStage) => void;
  compact?: boolean;
}

const NEURAL_THOUGHT_STEPS = [
  'Ingresando vectores de tabla de posiciones, puntos y ratio de sets...',
  'Activando capas sinápticas de clasificación: separando Bombo A y Bombo B...',
  'Evaluando pesos estadísticos y balance competitivo entre clubes...',
  'Consolidando emparejamientos óptimos del cuadro eliminatorio...',
];

export const PlayoffNodeGraph: React.FC<PlayoffNodeGraphProps> = ({
  clubs,
  standings,
  savedMatchups = [],
  isOrganizer = false,
  onSavePlayoffs,
}) => {
  const [stage, setStage] = useState<PlayoffStage>('cuartos');
  const [mode, setMode] = useState<'automatic' | 'manual'>('automatic');
  const [isNeuralThinking, setIsNeuralThinking] = useState(false);
  const [thoughtStepIndex, setThoughtStepIndex] = useState(0);
  const [activeDrawResult, setActiveDrawResult] = useState<PlayoffDrawResult | null>(null);
  const [manualMatchups, setManualMatchups] = useState<PlayoffMatchup[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ matchIndex: number; teamPosition: 'team1' | 'team2' } | null>(null);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState(false);

  // Available seeds based on current stage and standings
  const clubSeeds = useMemo(() => {
    return buildClubSeedsFromStandings(clubs, standings, stage);
  }, [clubs, standings, stage]);

  // Initial draw setup or hydrate from savedMatchups
  useEffect(() => {
    if (savedMatchups && savedMatchups.length > 0 && !activeDrawResult) {
      const initialStage = savedMatchups[0]?.stage || stage;
      setStage(initialStage);
      setManualMatchups(savedMatchups);
      setActiveDrawResult({
        stage: initialStage,
        seeds: clubSeeds,
        matchups: savedMatchups,
        connections: [],
        isManual: true,
        generatedAt: new Date().toISOString(),
      });
    } else if (!activeDrawResult) {
      const generated = generateAutomaticPlayoffMatchups(clubs, standings, stage);
      setActiveDrawResult(generated);
      setManualMatchups(generated.matchups);
    }
  }, [savedMatchups, clubs, standings, stage, clubSeeds, activeDrawResult]);

  // Trigger the Neural Network Thinking Animation and then compute new matchups
  const triggerNeuralNetworkDraw = (targetStage: PlayoffStage = stage) => {
    if (isNeuralThinking) return;
    setIsNeuralThinking(true);
    setThoughtStepIndex(0);

    const t1 = setTimeout(() => setThoughtStepIndex(1), 550);
    const t2 = setTimeout(() => setThoughtStepIndex(2), 1100);
    const t3 = setTimeout(() => setThoughtStepIndex(3), 1650);
    const t4 = setTimeout(() => {
      const result = generateAutomaticPlayoffMatchups(clubs, standings, targetStage);
      setActiveDrawResult(result);
      setManualMatchups(result.matchups);
      setIsNeuralThinking(false);
      setThoughtStepIndex(0);
    }, 2200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  };

  // Handle stage change
  const handleStageChange = (newStage: PlayoffStage) => {
    setStage(newStage);
    if (mode === 'automatic') {
      triggerNeuralNetworkDraw(newStage);
    } else {
      const generated = generateAutomaticPlayoffMatchups(clubs, standings, newStage);
      setActiveDrawResult(generated);
      setManualMatchups(generated.matchups);
    }
  };

  // Manual team selection for a slot
  const handleAssignClubToSlot = (clubId: string) => {
    if (!selectedSlot) return;
    const { matchIndex, teamPosition } = selectedSlot;
    const selectedClub = clubs.find((c) => c.id === clubId);
    if (!selectedClub) return;

    const updated = [...manualMatchups];
    if (teamPosition === 'team1') {
      updated[matchIndex].team1ClubId = selectedClub.id;
      updated[matchIndex].team1Label = selectedClub.name;
    } else {
      updated[matchIndex].team2ClubId = selectedClub.id;
      updated[matchIndex].team2Label = selectedClub.name;
    }

    setManualMatchups(updated);
    if (activeDrawResult) {
      setActiveDrawResult({
        ...activeDrawResult,
        matchups: updated,
        isManual: true,
      });
    }
    setSelectedSlot(null);
  };

  // Save official matchups
  const handleSaveOfficial = () => {
    if (!onSavePlayoffs) return;
    const matchupsToSave = mode === 'automatic' && activeDrawResult ? activeDrawResult.matchups : manualMatchups;
    onSavePlayoffs(matchupsToSave, stage);
    setSavedSuccessMsg(true);
    setTimeout(() => setSavedSuccessMsg(false), 3000);
  };

  const currentMatchups = mode === 'automatic' && activeDrawResult ? activeDrawResult.matchups : manualMatchups;

  // Coordinates for the 3-layer Neural Network SVG visualization (Input -> Hidden -> Output)
  const inputNodesY = [35, 75, 115, 155, 195, 235];
  const hiddenNodesY = [45, 95, 145, 195, 225];
  const outputNodesY = [55, 115, 175, 220];

  return (
    <div className="bg-[#081223] text-white rounded-3xl p-4 sm:p-6 border border-slate-800 shadow-2xl relative overflow-hidden space-y-5">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-[#0052fe]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-bold">
            <Cpu className="w-3.5 h-3.5 text-cyan-300" />
            <span>CRUCES DE PLAYOFFS</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-300">Red Neuronal de Emparejamiento & Sorteo</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white tracking-tight mt-1">
            Emparejamientos Oficiales de Cuadro Final
          </h3>
          <p className="text-xs text-slate-400">
            Nuestra red neuronal analiza puntos, ratio de sets y estadísticas de cada club para calcular los cruces automáticos o habilitar edición manual.
          </p>
        </div>

        {/* Stage & Mode Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Stage Selector */}
          <div className="inline-flex rounded-xl bg-slate-900/90 p-1 border border-slate-700">
            <button
              onClick={() => handleStageChange('cuartos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                stage === 'cuartos'
                  ? 'bg-[#0052fe] text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Cuartos (8)
            </button>
            <button
              onClick={() => handleStageChange('semifinal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                stage === 'semifinal'
                  ? 'bg-[#0052fe] text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semis (4)
            </button>
            <button
              onClick={() => handleStageChange('final')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                stage === 'final'
                  ? 'bg-[#0052fe] text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Final (2)
            </button>
          </div>

          {/* Mode Switcher: Auto vs Manual */}
          <div className="inline-flex rounded-xl bg-slate-900/90 p-1 border border-slate-700">
            <button
              onClick={() => setMode('automatic')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                mode === 'automatic'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shuffle className="w-3 h-3" />
              <span>Automático</span>
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                mode === 'manual'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span>Manual</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mode Guidance & Neural Trigger Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            {mode === 'automatic' ? (
              <>
                <strong className="text-white">Modo Automático Neuronal:</strong> El sistema pondera la tabla y estadísticas para sortear Bombo A vs Bombo B.
              </>
            ) : (
              <>
                <strong className="text-white">Modo Manual:</strong> Haz clic en cualquier recuadro de equipo para asignar el club que desees a cada llave.
              </>
            )}
          </span>
        </div>

        {mode === 'automatic' && (
          <button
            onClick={() => triggerNeuralNetworkDraw(stage)}
            disabled={isNeuralThinking}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
              isNeuralThinking
                ? 'bg-cyan-600/50 text-white cursor-wait animate-pulse'
                : 'bg-gradient-to-r from-cyan-500 to-[#0052fe] hover:from-cyan-400 hover:to-blue-600 text-white shadow-lg active:scale-95'
            }`}
          >
            <Cpu className={`w-4 h-4 ${isNeuralThinking ? 'animate-spin' : ''}`} />
            <span>{isNeuralThinking ? 'Red Neuronal Pensando...' : 'Sortear Cruces con Red Neuronal'}</span>
          </button>
        )}
      </div>

      {/* NEURAL NETWORK THINKING LOADING SCREEN OR NODE GRAPH */}
      <div className="relative z-10 bg-slate-950/80 rounded-2xl p-4 sm:p-6 border border-slate-800 overflow-hidden min-h-[320px] flex flex-col justify-center">
        {isNeuralThinking ? (
          /* NEURAL NETWORK THINKING ANIMATION */
          <div
            data-testid="neural-network-thinking"
            className="py-4 space-y-5 flex flex-col items-center justify-center text-center animate-in fade-in duration-200"
          >
            <div className="flex items-center gap-2 text-cyan-400 font-extrabold text-xs uppercase tracking-widest">
              <Activity className="w-4 h-4 animate-bounce text-cyan-300" />
              <span>Red Neuronal Analizando Estadísticas y Tabla</span>
            </div>

            {/* Interactive SVG Multi-Layer Neural Network */}
            <div className="w-full max-w-2xl h-64 relative bg-slate-900/70 rounded-2xl border border-cyan-500/30 p-3 shadow-inner overflow-hidden">
              <svg
                viewBox="0 0 600 260"
                className="w-full h-full"
                aria-label="Red neuronal pensando los cruces del torneo"
              >
                <defs>
                  <linearGradient id="synapseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0052fe" stopOpacity="0.85" />
                    <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.85" />
                  </linearGradient>
                  <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Layer Labels */}
                <text x="70" y="16" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">
                  ENTRADA (TABLA & STATS)
                </text>
                <text x="300" y="16" fill="#22d3ee" fontSize="9" fontWeight="bold" textAnchor="middle">
                  CAPA SINÁPTICA (PONDERACIÓN)
                </text>
                <text x="525" y="16" fill="#34d399" fontSize="9" fontWeight="bold" textAnchor="middle">
                  SALIDA (CRUCES PLAYOFFS)
                </text>

                {/* Synapses: Input Layer (x=70) to Hidden Layer (x=300) */}
                {inputNodesY.map((iy, iIdx) =>
                  hiddenNodesY.map((hy, hIdx) => {
                    const isActive = (iIdx + hIdx + thoughtStepIndex) % 2 === 0;
                    const pathId = `syn-in-hid-${iIdx}-${hIdx}`;
                    const d = `M 70 ${iy} C 185 ${iy}, 185 ${hy}, 300 ${hy}`;
                    return (
                      <g key={pathId}>
                        <path
                          id={pathId}
                          d={d}
                          fill="none"
                          stroke={isActive ? 'url(#synapseGrad)' : '#1e293b'}
                          strokeWidth={isActive ? '1.6' : '0.8'}
                          strokeDasharray={isActive ? '4 2' : undefined}
                        />
                        {isActive && (
                          <circle r="3" fill="#22d3ee" filter="url(#neonGlow)">
                            <animateMotion
                              dur={`${0.7 + ((iIdx + hIdx) % 3) * 0.25}s`}
                              repeatCount="indefinite"
                              path={d}
                            />
                          </circle>
                        )}
                      </g>
                    );
                  })
                )}

                {/* Synapses: Hidden Layer (x=300) to Output Layer (x=525) */}
                {hiddenNodesY.map((hy, hIdx) =>
                  outputNodesY.map((oy, oIdx) => {
                    const isActive = (hIdx + oIdx + thoughtStepIndex) % 2 === 1;
                    const pathId = `syn-hid-out-${hIdx}-${oIdx}`;
                    const d = `M 300 ${hy} C 410 ${hy}, 410 ${oy}, 525 ${oy}`;
                    return (
                      <g key={pathId}>
                        <path
                          id={pathId}
                          d={d}
                          fill="none"
                          stroke={isActive ? 'url(#synapseGrad)' : '#1e293b'}
                          strokeWidth={isActive ? '1.8' : '0.8'}
                        />
                        {isActive && (
                          <circle r="3.5" fill="#34d399" filter="url(#neonGlow)">
                            <animateMotion
                              dur={`${0.6 + ((hIdx + oIdx) % 3) * 0.2}s`}
                              repeatCount="indefinite"
                              path={d}
                            />
                          </circle>
                        )}
                      </g>
                    );
                  })
                )}

                {/* Input Nodes (Club Stats & Standings) */}
                {inputNodesY.map((y, idx) => {
                  const seedClub = clubSeeds[idx];
                  return (
                    <g key={`in-node-${idx}`} transform={`translate(70, ${y})`}>
                      <circle
                        r="11"
                        fill="#0f172a"
                        stroke="#3b82f6"
                        strokeWidth="2.5"
                        filter="url(#neonGlow)"
                      />
                      <text y="3" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                        {seedClub ? seedClub.shortName.slice(0, 3) : `C${idx + 1}`}
                      </text>
                    </g>
                  );
                })}

                {/* Hidden Layer Neurons (Thinking Core) */}
                {hiddenNodesY.map((y, idx) => {
                  const pulse = (idx + thoughtStepIndex) % 2 === 0;
                  return (
                    <g key={`hid-node-${idx}`} transform={`translate(300, ${y})`}>
                      <circle
                        r={pulse ? '13' : '10'}
                        fill={pulse ? '#0891b2' : '#0f172a'}
                        stroke="#22d3ee"
                        strokeWidth="2.5"
                        filter="url(#neonGlow)"
                      />
                      <circle r="4" fill="#e0f2fe" />
                    </g>
                  );
                })}

                {/* Output Layer Neurons (Generated Matchups) */}
                {outputNodesY.map((y, idx) => (
                  <g key={`out-node-${idx}`} transform={`translate(525, ${y})`}>
                    <rect
                      x="-28"
                      y="-12"
                      width="56"
                      height="24"
                      rx="6"
                      fill="#064e3b"
                      stroke="#10b981"
                      strokeWidth="2"
                      filter="url(#neonGlow)"
                    />
                    <text y="3" fill="#ecfdf5" fontSize="8" fontWeight="bold" textAnchor="middle">
                      LLAVE #{idx + 1}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            {/* Dynamic Thought Step Caption */}
            <div className="space-y-2 max-w-lg">
              <p className="text-xs sm:text-sm font-bold text-cyan-200">
                {NEURAL_THOUGHT_STEPS[thoughtStepIndex] || NEURAL_THOUGHT_STEPS[0]}
              </p>
              <div className="w-64 mx-auto h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0052fe] via-cyan-400 to-emerald-400 transition-all duration-500"
                  style={{ width: `${((thoughtStepIndex + 1) / NEURAL_THOUGHT_STEPS.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          /* ACTIVE NODE GRAPH & MATCHUPS */
          <div className="relative z-10 space-y-6">
            {/* Seeds Pots Summary Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Bombo A */}
              <div className="bg-blue-950/40 rounded-xl p-3 border border-blue-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-blue-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <Shield className="w-3.5 h-3.5 text-blue-400" />
                    Bombo A · Cabezas de Serie (Top Tabla)
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {clubSeeds
                    .filter((s) => s.pot === 'A')
                    .map((s) => (
                      <span
                        key={s.clubId}
                        className="inline-flex items-center gap-1 bg-slate-900/80 px-2 py-1 rounded-lg border border-blue-500/20 text-[11px] text-slate-200"
                      >
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center">
                          {s.seed}
                        </span>
                        <span className="font-bold truncate max-w-[100px]">{s.shortName}</span>
                        <span className="text-[9px] text-cyan-300 font-mono">({s.points}pts)</span>
                      </span>
                    ))}
                </div>
              </div>

              {/* Bombo B */}
              <div className="bg-cyan-950/40 rounded-xl p-3 border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-cyan-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <Flame className="w-3.5 h-3.5 text-cyan-400" />
                    Bombo B · Rivales Clasificados (Sorteo)
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {clubSeeds
                    .filter((s) => s.pot === 'B')
                    .map((s) => (
                      <span
                        key={s.clubId}
                        className="inline-flex items-center gap-1 bg-slate-900/80 px-2 py-1 rounded-lg border border-cyan-500/20 text-[11px] text-slate-200"
                      >
                        <span className="w-4 h-4 rounded-full bg-cyan-600 text-slate-950 text-[9px] font-black flex items-center justify-center">
                          {s.seed}
                        </span>
                        <span className="font-bold truncate max-w-[100px]">{s.shortName}</span>
                        <span className="text-[9px] text-slate-400 font-mono">({s.points}pts)</span>
                      </span>
                    ))}
                </div>
              </div>
            </div>

            {/* Interactive Matchup Nodes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {currentMatchups.map((matchup, idx) => {
                const team1Seed = clubSeeds.find((s) => s.clubId === matchup.team1ClubId);
                const team2Seed = clubSeeds.find((s) => s.clubId === matchup.team2ClubId);
                const isSelected1 = selectedSlot?.matchIndex === idx && selectedSlot?.teamPosition === 'team1';
                const isSelected2 = selectedSlot?.matchIndex === idx && selectedSlot?.teamPosition === 'team2';

                return (
                  <div
                    key={matchup.id}
                    className="relative rounded-2xl p-3.5 border border-slate-800 bg-slate-900/70 hover:border-blue-500/50 hover:bg-slate-900 transition-all space-y-3"
                  >
                    {/* Llave Header */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                        {matchup.roundLabel}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Nodo #{idx + 1}</span>
                    </div>

                    {/* Team 1 Slot Node */}
                    <div
                      onClick={() => {
                        if (mode === 'manual') setSelectedSlot({ matchIndex: idx, teamPosition: 'team1' });
                      }}
                      className={`p-2.5 rounded-xl border transition-all ${
                        isSelected1
                          ? 'border-cyan-400 bg-cyan-950/60 ring-2 ring-cyan-400'
                          : mode === 'manual'
                          ? 'cursor-pointer hover:border-blue-400 border-slate-700/80 bg-slate-800/80'
                          : 'border-slate-800 bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-7 h-7 rounded-lg text-white font-black text-xs flex items-center justify-center shrink-0 shadow"
                            style={{ backgroundColor: team1Seed?.color || '#0052fe' }}
                          >
                            {team1Seed ? team1Seed.shortName.slice(0, 2) : 'T1'}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-white block truncate">
                              {matchup.team1Label}
                            </span>
                            {team1Seed && (
                              <span className="text-[10px] text-blue-300 font-mono block">
                                Siembra #{team1Seed.seed} · {team1Seed.wins}G - {team1Seed.losses}P
                              </span>
                            )}
                          </div>
                        </div>

                        {mode === 'manual' && (
                          <span className="text-[10px] text-cyan-300 font-bold shrink-0">
                            {isSelected1 ? 'Asignar' : 'Cambiar'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Synaptic Connector Line / VS */}
                    <div className="flex items-center justify-center relative my-1">
                      <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
                      <span className="absolute px-2 py-0.5 rounded bg-slate-950 border border-cyan-500/40 text-[9px] font-black text-cyan-300 font-mono uppercase tracking-widest">
                        VS
                      </span>
                    </div>

                    {/* Team 2 Slot Node */}
                    <div
                      onClick={() => {
                        if (mode === 'manual') setSelectedSlot({ matchIndex: idx, teamPosition: 'team2' });
                      }}
                      className={`p-2.5 rounded-xl border transition-all ${
                        isSelected2
                          ? 'border-cyan-400 bg-cyan-950/60 ring-2 ring-cyan-400'
                          : mode === 'manual'
                          ? 'cursor-pointer hover:border-cyan-400 border-slate-700/80 bg-slate-800/80'
                          : 'border-slate-800 bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-7 h-7 rounded-lg text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow"
                            style={{ backgroundColor: team2Seed?.color || '#06b6d4' }}
                          >
                            {team2Seed ? team2Seed.shortName.slice(0, 2) : 'T2'}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-white block truncate">
                              {matchup.team2Label}
                            </span>
                            {team2Seed && (
                              <span className="text-[10px] text-cyan-300 font-mono block">
                                Siembra #{team2Seed.seed} · {team2Seed.wins}G - {team2Seed.losses}P
                              </span>
                            )}
                          </div>
                        </div>

                        {mode === 'manual' && (
                          <span className="text-[10px] text-cyan-300 font-bold shrink-0">
                            {isSelected2 ? 'Asignar' : 'Cambiar'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats Match Insight */}
                    {team1Seed && team2Seed && (
                      <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80">
                        <span>Índice Sináptico:</span>
                        <span className="font-mono font-bold text-amber-300 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-amber-400" />
                          {Math.round((team1Seed.formScore + team2Seed.formScore) / 2)}% Competitivo
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Manual Club Selector Dropdown when a slot is chosen */}
            {mode === 'manual' && selectedSlot && (
              <div className="p-4 rounded-2xl bg-cyan-950/80 border border-cyan-400/50 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-cyan-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sliders className="w-3.5 h-3.5" />
                    Seleccionar Club para {currentMatchups[selectedSlot.matchIndex]?.roundLabel} (
                    {selectedSlot.teamPosition === 'team1' ? 'Equipo Local' : 'Equipo Visita'})
                  </span>
                  <button
                    onClick={() => setSelectedSlot(null)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {clubs.map((club) => {
                    const seed = clubSeeds.find((s) => s.clubId === club.id);
                    return (
                      <button
                        key={club.id}
                        onClick={() => handleAssignClubToSlot(club.id)}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-[#0052fe] text-white text-left border border-slate-700 hover:border-blue-400 transition-colors flex items-center gap-2 group"
                      >
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center font-black text-[10px] text-white shrink-0"
                          style={{ backgroundColor: club.color || '#0052fe' }}
                        >
                          {club.shortName?.slice(0, 2) || club.name.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <span className="block text-xs font-bold truncate group-hover:text-white">
                            {club.name}
                          </span>
                          {seed && (
                            <span className="text-[10px] text-slate-400 group-hover:text-blue-200 block">
                              #{seed.seed} · {seed.points} pts
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action CTA for Organizer */}
      {isOrganizer && onSavePlayoffs && (
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="text-xs text-slate-400">
            {savedSuccessMsg ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                ¡Cruces oficiales guardados y sincronizados con éxito!
              </span>
            ) : (
              <span>
                Al guardar, las llaves quedarán publicadas en el cuadro oficial del campeonato.
              </span>
            )}
          </div>

          <button
            onClick={handleSaveOfficial}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#0052fe] hover:bg-blue-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-transform active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Guardar y Publicar Cruces Oficiales</span>
          </button>
        </div>
      )}
    </div>
  );
};
