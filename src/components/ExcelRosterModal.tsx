import React, { useState } from 'react';
import { Club, Player, Position, StaffMember, StaffMemberRole, CoachStaff } from '../types';
import { useTournament } from '../context/TournamentContext';
import { formatRut } from '../utils/chileanRut';
import {
  X,
  Plus,
  Save,
  Trash2,
  Crown,
  Shield,
  Download,
  Check,
  Lock,
  UserPlus,
  Shirt,
  Users,
  Award,
  Edit2,
  ClipboardList,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

interface ExcelRosterModalProps {
  club: Club;
  isOpen: boolean;
  onClose: () => void;
  isReadOnly?: boolean;
}

const INITIAL_STAFF_FROM_CLUB = (club: Club): StaffMember[] => {
  if (club.staff?.members && club.staff.members.length > 0) {
    return [...club.staff.members];
  }
  const initial: StaffMember[] = [];
  if (club.staff?.headCoach) {
    initial.push({
      id: `staff-dt-${club.id}`,
      clubId: club.id,
      role: 'entrenador',
      name: club.staff.headCoach,
      dorsal: 1,
    });
  }
  if (club.staff?.assistantCoach) {
    initial.push({
      id: `staff-ast-${club.id}`,
      clubId: club.id,
      role: 'asistente',
      name: club.staff.assistantCoach,
      dorsal: 2,
    });
  }
  if (club.staff?.analyst) {
    initial.push({
      id: `staff-ana-${club.id}`,
      clubId: club.id,
      role: 'analista',
      name: club.staff.analyst,
      dorsal: 3,
    });
  }
  return initial;
};

export const ExcelRosterModal: React.FC<ExcelRosterModalProps> = ({
  club,
  isOpen,
  onClose,
  isReadOnly = false,
}) => {
  const { updateFullRoster } = useTournament();

  // Local editable copies of roster & staff
  const [editableRoster, setEditableRoster] = useState<Player[]>(() => [...club.roster]);
  const [editableStaff, setEditableStaff] = useState<StaffMember[]>(() =>
    INITIAL_STAFF_FROM_CLUB(club)
  );
  const [hasChanges, setHasChanges] = useState(false);

  // Registration Form Mode: 'player' | 'staff'
  const [registrationType, setRegistrationType] = useState<'player' | 'staff'>('player');

  // Editing IDs (if modifying an existing card)
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  // Player Form Fields
  const [playerDorsal, setPlayerDorsal] = useState<number>(() => {
    return club.roster.length > 0 ? Math.max(...club.roster.map((p) => p.dorsal)) + 1 : 10;
  });
  const [playerName, setPlayerName] = useState('');
  const [playerPaternal, setPlayerPaternal] = useState('');
  const [playerMaternal, setPlayerMaternal] = useState('');
  const [playerRut, setPlayerRut] = useState('');
  const [playerPosition, setPlayerPosition] = useState<Position>('Punta Receptor');
  const [playerSpecialRole, setPlayerSpecialRole] = useState<
    'regular' | 'capitan' | 'libero_1' | 'libero_2'
  >('regular');

  // Staff Form Fields (Entrenador, Asistente, Analista)
  const [staffRole, setStaffRole] = useState<StaffMemberRole>('entrenador');
  const [staffDorsal, setStaffDorsal] = useState<number>(1);
  const [staffName, setStaffName] = useState('');
  const [staffPaternal, setStaffPaternal] = useState('');
  const [staffMaternal, setStaffMaternal] = useState('');
  const [staffRut, setStaffRut] = useState('');
  const [staffPhone, setStaffPhone] = useState('');

  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const positions: Position[] = ['Armador', 'Central', 'Punta Receptor', 'Opuesto', 'Líbero'];

  const resetPlayerForm = (nextList: Player[] = editableRoster) => {
    const nextNum = nextList.length > 0 ? Math.max(...nextList.map((p) => p.dorsal)) + 1 : 1;
    setEditingPlayerId(null);
    setPlayerDorsal(nextNum);
    setPlayerName('');
    setPlayerPaternal('');
    setPlayerMaternal('');
    setPlayerRut('');
    setPlayerPosition('Punta Receptor');
    setPlayerSpecialRole('regular');
    setFormError(null);
  };

  const resetStaffForm = (nextList: StaffMember[] = editableStaff) => {
    const nextNum = nextList.length > 0 ? Math.max(...nextList.map((s) => s.dorsal || 0)) + 1 : 1;
    setEditingStaffId(null);
    setStaffRole('entrenador');
    setStaffDorsal(nextNum);
    setStaffName('');
    setStaffPaternal('');
    setStaffMaternal('');
    setStaffRut('');
    setStaffPhone('');
    setFormError(null);
  };

  const handleSubmitPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setFormError(null);

    if (!playerName.trim()) {
      setFormError('Ingresa el nombre del jugador.');
      return;
    }
    if (playerDorsal < 0 || playerDorsal > 99) {
      setFormError('El número de camiseta debe estar entre 0 y 99.');
      return;
    }

    // Check duplicate jersey number among other players
    const duplicate = editableRoster.find(
      (p) => p.dorsal === playerDorsal && p.id !== editingPlayerId
    );
    if (duplicate) {
      setFormError(
        `El número de camiseta #${playerDorsal} ya está asignado a ${duplicate.name} ${
          duplicate.paternalSurname || ''
        }.`
      );
      return;
    }

    const isCaptain = playerSpecialRole === 'capitan';
    const isLibero = playerSpecialRole === 'libero_1' || playerSpecialRole === 'libero_2';
    const liberoType =
      playerSpecialRole === 'libero_1'
        ? ('principal' as const)
        : playerSpecialRole === 'libero_2'
        ? ('secundario' as const)
        : undefined;

    const newPlayerObj: Player = {
      id: editingPlayerId || `p-${club.id}-${Date.now()}`,
      clubId: club.id,
      dorsal: Number(playerDorsal),
      name: playerName.trim(),
      paternalSurname: playerPaternal.trim(),
      maternalSurname: playerMaternal.trim(),
      rut: playerRut.trim(),
      position: isLibero ? 'Líbero' : playerPosition,
      isCaptain,
      isLibero,
      liberoType,
    };

    let updatedList: Player[];
    if (editingPlayerId) {
      updatedList = editableRoster.map((p) => (p.id === editingPlayerId ? newPlayerObj : p));
    } else {
      updatedList = [...editableRoster, newPlayerObj];
    }

    // Ensure unique captain or libero 1/2 if selected
    if (isCaptain) {
      updatedList = updatedList.map((p) =>
        p.id === newPlayerObj.id ? p : { ...p, isCaptain: false }
      );
    }

    setEditableRoster(updatedList);
    setHasChanges(true);
    resetPlayerForm(updatedList);
  };

  const handleEditPlayerClick = (player: Player) => {
    if (isReadOnly) return;
    setRegistrationType('player');
    setEditingPlayerId(player.id);
    setPlayerDorsal(player.dorsal);
    setPlayerName(player.name);
    setPlayerPaternal(player.paternalSurname || '');
    setPlayerMaternal(player.maternalSurname || '');
    setPlayerRut(player.rut || '');
    setPlayerPosition(player.position);
    if (player.isCaptain) setPlayerSpecialRole('capitan');
    else if (player.isLibero && player.liberoType === 'principal') setPlayerSpecialRole('libero_1');
    else if (player.isLibero && player.liberoType === 'secundario') setPlayerSpecialRole('libero_2');
    else setPlayerSpecialRole('regular');
    setFormError(null);
  };

  const handleDeletePlayer = (playerId: string) => {
    if (isReadOnly) return;
    const next = editableRoster.filter((p) => p.id !== playerId);
    setEditableRoster(next);
    setHasChanges(true);
    if (editingPlayerId === playerId) resetPlayerForm(next);
  };

  const handleSubmitStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setFormError(null);

    if (!staffName.trim()) {
      setFormError('Ingresa el nombre del integrante del cuerpo técnico.');
      return;
    }
    if (staffDorsal < 0 || staffDorsal > 99) {
      setFormError('El número de camiseta/credencial debe estar entre 0 y 99.');
      return;
    }

    const newStaffObj: StaffMember = {
      id: editingStaffId || `staff-${club.id}-${Date.now()}`,
      clubId: club.id,
      role: staffRole,
      dorsal: Number(staffDorsal),
      name: staffName.trim(),
      paternalSurname: staffPaternal.trim(),
      maternalSurname: staffMaternal.trim(),
      rut: staffRut.trim(),
      phone: staffPhone.trim(),
    };

    let updatedStaffList: StaffMember[];
    if (editingStaffId) {
      updatedStaffList = editableStaff.map((s) => (s.id === editingStaffId ? newStaffObj : s));
    } else {
      updatedStaffList = [...editableStaff, newStaffObj];
    }

    setEditableStaff(updatedStaffList);
    setHasChanges(true);
    resetStaffForm(updatedStaffList);
  };

  const handleEditStaffClick = (member: StaffMember) => {
    if (isReadOnly) return;
    setRegistrationType('staff');
    setEditingStaffId(member.id);
    setStaffRole(member.role);
    setStaffDorsal(member.dorsal ?? 1);
    setStaffName(member.name);
    setStaffPaternal(member.paternalSurname || '');
    setStaffMaternal(member.maternalSurname || '');
    setStaffRut(member.rut || '');
    setStaffPhone(member.phone || '');
    setFormError(null);
  };

  const handleDeleteStaff = (staffId: string) => {
    if (isReadOnly) return;
    const next = editableStaff.filter((s) => s.id !== staffId);
    setEditableStaff(next);
    setHasChanges(true);
    if (editingStaffId === staffId) resetStaffForm(next);
  };

  const handleSaveAll = () => {
    const dt = editableStaff.find((s) => s.role === 'entrenador');
    const ast = editableStaff.find((s) => s.role === 'asistente');
    const ana = editableStaff.find((s) => s.role === 'analista');

    const formatFullName = (m?: StaffMember) =>
      m ? [m.name, m.paternalSurname, m.maternalSurname].filter(Boolean).join(' ').trim() : '';

    const updatedStaffPayload: CoachStaff = {
      headCoach: formatFullName(dt) || club.staff.headCoach || 'Por definir',
      assistantCoach: formatFullName(ast) || club.staff.assistantCoach || 'Por definir',
      analyst: formatFullName(ana) || club.staff.analyst || '',
      members: editableStaff,
    };

    updateFullRoster(club.id, editableRoster, updatedStaffPayload);
    setHasChanges(false);
    onClose();
  };

  const roleBadgeConfig: Record<
    StaffMemberRole,
    { label: string; short: string; bg: string; text: string }
  > = {
    entrenador: {
      label: 'Entrenador Principal (DT)',
      short: 'DT',
      bg: 'bg-blue-100 border-blue-300',
      text: 'text-blue-900',
    },
    asistente: {
      label: 'Entrenador Asistente',
      short: 'ASIST',
      bg: 'bg-emerald-100 border-emerald-300',
      text: 'text-emerald-900',
    },
    analista: {
      label: 'Analista Técnico',
      short: 'ANALISTA',
      bg: 'bg-purple-100 border-purple-300',
      text: 'text-purple-900',
    },
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* Responsive Dialog: Narrow on mobile, full wide workspace on computer */}
      <div className="bg-white rounded-[28px] border border-slate-200 w-[96vw] max-w-md sm:max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Top Header */}
        <div className="px-4 sm:px-6 py-4 bg-[#081223] text-white border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-md shrink-0 border border-white/20"
              style={{ backgroundColor: club.color || '#0052fe' }}
            >
              {club.shortName}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-[#0052fe] text-white text-[10px] font-black uppercase tracking-wider">
                  {club.category}
                </span>
                <span className="text-[11px] text-blue-300 font-bold truncate">
                  Menú Oficial de Inscripción
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-black text-white tracking-tight uppercase truncate">
                {club.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => window.print()}
              className="hidden sm:flex px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Imprimir Nómina</span>
            </button>

            {!isReadOnly && (
              <button
                onClick={handleSaveAll}
                className="px-4 sm:px-5 py-2 rounded-full bg-[#0052fe] hover:bg-blue-600 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Inscripción</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              aria-label="Cerrar menú de inscripción"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Read-Only Warning Banner */}
        {isReadOnly && (
          <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-900 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span className="font-bold">
                Inscripciones Cerradas: El organizador ha bloqueado la edición de nóminas. Modo consulta.
              </span>
            </div>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
              Solo Lectura
            </span>
          </div>
        )}

        {/* Main Responsive Body: Single column on mobile, 12-column split view on desktop */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/70">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: REGISTRATION FORM (Players & Coaching Staff with Jersey Numbers) */}
            {!isReadOnly && (
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
                  {/* Switcher Tabs: Jugador vs Cuerpo Técnico */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => {
                        setRegistrationType('player');
                        setFormError(null);
                      }}
                      className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
                        registrationType === 'player'
                          ? 'bg-[#081223] text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Shirt className="w-4 h-4 text-[#0052fe]" />
                      <span>Inscribir Jugador</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRegistrationType('staff');
                        setFormError(null);
                      }}
                      className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
                        registrationType === 'staff'
                          ? 'bg-[#081223] text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ClipboardList className="w-4 h-4 text-emerald-500" />
                      <span>Entrenador / Staff</span>
                    </button>
                  </div>

                  {formError && (
                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* FORM 1: PLAYER REGISTRATION */}
                  {registrationType === 'player' ? (
                    <form onSubmit={handleSubmitPlayer} className="space-y-3.5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div>
                          <h3 className="text-sm font-black text-slate-900 uppercase">
                            {editingPlayerId ? 'Editar Jugador Inscrito' : 'Datos del Nuevo Jugador'}
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Ingresa los datos personales y el número de camiseta oficial
                          </p>
                        </div>
                        {editingPlayerId && (
                          <button
                            type="button"
                            onClick={() => resetPlayerForm()}
                            className="text-[11px] font-bold text-rose-600 hover:underline"
                          >
                            Cancelar edición
                          </button>
                        )}
                      </div>

                      {/* Jersey Number Preview & Input */}
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0d1f42] to-slate-900 text-white flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black border-2 border-white/30 shadow-lg relative"
                            style={{ backgroundColor: club.color || '#0052fe' }}
                          >
                            <span className="text-[8px] uppercase tracking-widest opacity-80">
                              Camiseta
                            </span>
                            <span className="text-xl font-mono leading-none">
                              #{playerDorsal}
                            </span>
                          </div>
                          <div>
                            <label className="text-xs font-black uppercase tracking-wider text-blue-200 block">
                              N° de Camiseta (Dorsal) *
                            </label>
                            <p className="text-[11px] text-slate-300">
                              Número oficial estampado en cancha
                            </p>
                          </div>
                        </div>

                        <input
                          type="number"
                          min={0}
                          max={99}
                          required
                          value={playerDorsal}
                          onChange={(e) => setPlayerDorsal(Number(e.target.value))}
                          className="w-20 text-center font-mono font-black text-lg py-2 px-2 rounded-xl bg-white text-slate-900 border-2 border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>

                      {/* Nombres y Apellidos */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Nombres *
                          </label>
                          <input
                            type="text"
                            required
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            placeholder="Ej. Matías"
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0052fe]/20"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Apellido Paterno *
                          </label>
                          <input
                            type="text"
                            required
                            value={playerPaternal}
                            onChange={(e) => setPlayerPaternal(e.target.value)}
                            placeholder="Ej. Rojas"
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0052fe]/20"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Apellido Materno
                          </label>
                          <input
                            type="text"
                            value={playerMaternal}
                            onChange={(e) => setPlayerMaternal(e.target.value)}
                            placeholder="Ej. Silva"
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0052fe]/20"
                          />
                        </div>
                      </div>

                      {/* RUT y Posición */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            RUT del Jugador *
                          </label>
                          <input
                            type="text"
                            value={playerRut}
                            onChange={(e) => setPlayerRut(formatRut(e.target.value))}
                            placeholder="12.345.678-9"
                            maxLength={12}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0052fe]/20"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Posición en Cancha *
                          </label>
                          <select
                            value={playerPosition}
                            onChange={(e) => setPlayerPosition(e.target.value as Position)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none"
                          >
                            {positions.map((pos) => (
                              <option key={pos} value={pos}>
                                {pos}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Rol Especial */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Designación en el Equipo
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {[
                            { id: 'regular', label: 'Jugador' },
                            { id: 'capitan', label: 'Capitán (C)' },
                            { id: 'libero_1', label: 'Líbero 1' },
                            { id: 'libero_2', label: 'Líbero 2' },
                          ].map((roleOpt) => (
                            <button
                              key={roleOpt.id}
                              type="button"
                              onClick={() => setPlayerSpecialRole(roleOpt.id as any)}
                              className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                                playerSpecialRole === roleOpt.id
                                  ? 'bg-blue-50 border-[#0052fe] text-[#0052fe] ring-1 ring-[#0052fe]'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {roleOpt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 px-4 rounded-2xl bg-[#0052fe] hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>
                          {editingPlayerId
                            ? `Actualizar Jugador #${playerDorsal}`
                            : `Inscribir Jugador #${playerDorsal}`}
                        </span>
                      </button>
                    </form>
                  ) : (
                    /* FORM 2: COACHING STAFF REGISTRATION (Entrenadores, Asistentes, Analistas) */
                    <form onSubmit={handleSubmitStaff} className="space-y-3.5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div>
                          <h3 className="text-sm font-black text-slate-900 uppercase">
                            {editingStaffId
                              ? 'Editar Cuerpo Técnico'
                              : 'Inscribir Entrenador / Asistente / Analista'}
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Registra los datos y número de camiseta/credencial del staff técnico
                          </p>
                        </div>
                        {editingStaffId && (
                          <button
                            type="button"
                            onClick={() => resetStaffForm()}
                            className="text-[11px] font-bold text-rose-600 hover:underline"
                          >
                            Cancelar edición
                          </button>
                        )}
                      </div>

                      {/* Role Selector: Entrenador, Asistente, Analista */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                          Cargo Oficial en el Cuerpo Técnico *
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'entrenador', label: 'Entrenador (DT)' },
                            { id: 'asistente', label: 'Asistente' },
                            { id: 'analista', label: 'Analista' },
                          ].map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => setStaffRole(r.id as StaffMemberRole)}
                              className={`py-2 px-2 rounded-xl text-xs font-extrabold border transition-all ${
                                staffRole === r.id
                                  ? 'bg-[#081223] text-white border-[#081223] shadow-xs'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {r.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Staff Jersey / Identification Number */}
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950 text-white flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex flex-col items-center justify-center font-black border-2 border-white/30 shadow-lg">
                            <span className="text-[8px] uppercase tracking-widest opacity-90">
                              Staff
                            </span>
                            <span className="text-xl font-mono leading-none">
                              #{staffDorsal}
                            </span>
                          </div>
                          <div>
                            <label className="text-xs font-black uppercase tracking-wider text-emerald-200 block">
                              N° de Camiseta / Staff *
                            </label>
                            <p className="text-[11px] text-slate-200">
                              Número asignado a entrenador, asistente o analista
                            </p>
                          </div>
                        </div>

                        <input
                          type="number"
                          min={0}
                          max={99}
                          required
                          value={staffDorsal}
                          onChange={(e) => setStaffDorsal(Number(e.target.value))}
                          className="w-20 text-center font-mono font-black text-lg py-2 px-2 rounded-xl bg-white text-slate-900 border-2 border-emerald-400 focus:outline-none"
                        />
                      </div>

                      {/* Nombres y Apellidos del Staff */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Nombres *
                          </label>
                          <input
                            type="text"
                            required
                            value={staffName}
                            onChange={(e) => setStaffName(e.target.value)}
                            placeholder="Ej. Roberto"
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Apellido Paterno *
                          </label>
                          <input
                            type="text"
                            value={staffPaternal}
                            onChange={(e) => setStaffPaternal(e.target.value)}
                            placeholder="Ej. Méndez"
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Apellido Materno
                          </label>
                          <input
                            type="text"
                            value={staffMaternal}
                            onChange={(e) => setStaffMaternal(e.target.value)}
                            placeholder="Ej. Soto"
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* RUT y Teléfono */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            RUT *
                          </label>
                          <input
                            type="text"
                            value={staffRut}
                            onChange={(e) => setStaffRut(formatRut(e.target.value))}
                            placeholder="12.345.678-9"
                            maxLength={12}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Teléfono de Contacto
                          </label>
                          <input
                            type="text"
                            value={staffPhone}
                            onChange={(e) => setStaffPhone(e.target.value)}
                            placeholder="+56 9 1234 5678"
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        <span>
                          {editingStaffId
                            ? 'Actualizar Integrante Técnico'
                            : `Inscribir ${roleBadgeConfig[staffRole].label} (#${staffDorsal})`}
                        </span>
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* RIGHT COLUMN: REGISTERED STAFF & PLAYERS LIST */}
            <div className={`${isReadOnly ? 'lg:col-span-12' : 'lg:col-span-7'} space-y-5`}>
              {/* 1. REGISTERED COACHING STAFF SECTION */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-black text-slate-900 uppercase">
                      Cuerpo Técnico Inscrito (Entrenadores, Asistentes y Analistas)
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-extrabold text-[11px]">
                    {editableStaff.length} integrantes
                  </span>
                </div>

                {editableStaff.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                    No hay entrenadores, asistentes ni analistas inscritos aún. Usa la pestaña
                    "Entrenador / Staff" para agregarlos.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                    {editableStaff.map((member) => {
                      const badge = roleBadgeConfig[member.role] || roleBadgeConfig.entrenador;
                      return (
                        <div
                          key={member.id}
                          className="p-3 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-center justify-between gap-2.5 hover:border-slate-300 transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center shrink-0 font-mono font-black shadow-2xs">
                              <span className="text-[7px] uppercase text-emerald-300 leading-none">
                                {badge.short}
                              </span>
                              <span className="text-xs leading-tight">
                                #{member.dorsal ?? 1}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <span
                                className={`inline-block text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${badge.bg} ${badge.text}`}
                              >
                                {badge.label}
                              </span>
                              <p className="font-extrabold text-xs text-slate-900 truncate mt-0.5">
                                {member.name} {member.paternalSurname || ''}{' '}
                                {member.maternalSurname || ''}
                              </p>
                              {member.rut && (
                                <p className="text-[10px] font-mono text-slate-500 truncate">
                                  RUT: {member.rut}
                                </p>
                              )}
                            </div>
                          </div>

                          {!isReadOnly && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleEditStaffClick(member)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteStaff(member.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. REGISTERED PLAYERS SECTION */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#0052fe]" />
                    <h3 className="text-sm font-black text-slate-900 uppercase">
                      Plantel Oficial de Jugadores Inscritos
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0052fe] font-extrabold text-[11px]">
                    {editableRoster.length} jugadores
                  </span>
                </div>

                {editableRoster.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
                    <Shirt className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">
                      Aún no hay jugadores inscritos en este equipo
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Completa el formulario de inscripción indicando los datos del jugador y su
                      número de camiseta.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {editableRoster.map((player) => (
                      <div
                        key={player.id}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                          editingPlayerId === player.id
                            ? 'bg-blue-50/70 border-[#0052fe] ring-1 ring-[#0052fe]'
                            : 'bg-slate-50/90 border-slate-200/90 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Jersey Badge */}
                          <div
                            className="w-11 h-11 rounded-2xl flex flex-col items-center justify-center text-white font-mono font-black shrink-0 shadow-xs border border-white/20"
                            style={{
                              backgroundColor: player.isLibero
                                ? '#0891b2'
                                : club.color || '#0052fe',
                            }}
                          >
                            <span className="text-[7px] uppercase tracking-wider opacity-80 leading-none">
                              Dorsal
                            </span>
                            <span className="text-sm leading-tight">#{player.dorsal}</span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                                {player.name} {player.paternalSurname || ''}{' '}
                                {player.maternalSurname || ''}
                              </p>
                              {player.isCaptain && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-black uppercase flex items-center gap-0.5">
                                  <Crown className="w-2.5 h-2.5 text-amber-600" />
                                  <span>C</span>
                                </span>
                              )}
                              {player.isLibero && (
                                <span className="px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-800 border border-cyan-300 text-[9px] font-black uppercase">
                                  {player.liberoType === 'secundario' ? 'L2' : 'L1'}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                              <span className="font-bold text-slate-700">{player.position}</span>
                              {player.rut && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono">{player.rut}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {!isReadOnly && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleEditPlayerClick(player)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Editar jugador"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePlayer(player.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Eliminar jugador"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="font-bold text-slate-900">
              Resumen de Inscripción: {editableRoster.length} Jugadores • {editableStaff.length}{' '}
              Cuerpo Técnico
            </span>
            {hasChanges && (
              <span className="text-amber-600 font-bold">
                • Cambios pendientes de guardar
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              Cerrar
            </button>

            {!isReadOnly && (
              <button
                type="button"
                onClick={handleSaveAll}
                className="px-6 py-2 rounded-full bg-[#0052fe] hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar y Guardar Inscripción</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
