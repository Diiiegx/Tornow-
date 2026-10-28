import React, { useState, useEffect } from 'react';
import { useTournament, CreateTournamentInput } from '../context/TournamentContext';
import { SportType, TournamentFormat, OrganizerType, PlayoffStage, OFFICIAL_CATEGORIES } from '../types';
import {
  SPORT_CONFIGS,
  FORMAT_CONFIGS,
  ORGANIZER_TYPES,
  PLAYOFF_STAGE_OPTIONS,
} from '../constants/tournamentPresets';
import { cleanRut, formatRut, validateChileanRut } from '../utils/chileanRut';
import {
  validateHumanReadableText,
  validateTournamentName,
  cleanTournamentString,
  MIN_TOURNAMENT_NAME_LENGTH,
  MAX_TOURNAMENT_NAME_LENGTH,
} from '../utils/textValidation';
import { CHILEAN_COMUNAS } from '../constants/chileanComunas';
import {
  X,
  Trophy,
  Building,
  User,
  Calendar,
  MapPin,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Layers,
  Lock,
  FileText,
  Shield,
  Activity,
  Flame,
  Zap,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  FileCheck,
  Globe,
  EyeOff,
  Upload,
} from 'lucide-react';

interface CreateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (tournamentId: string) => void;
}

export function validateVenue(venueText: string): { isValid: boolean; error?: string } {
  const trimmed = venueText.trim();
  if (!trimmed) {
    return { isValid: false, error: 'La sede es obligatoria (indica recinto o cancha, comuna y dirección).' };
  }
  if (trimmed.length < 10) {
    return { isValid: false, error: 'La sede debe ser detallada (mínimo 10 caracteres: recinto, comuna y dirección).' };
  }
  // Reject numbers-only or symbols-only
  if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑ]{3,}/.test(trimmed)) {
    return { isValid: false, error: 'Ingresa un nombre de recinto y dirección real con texto legible.' };
  }
  // Reject repetitive single characters (aaa, xxxx, etc.)
  if (/(.)\1{3,}/i.test(trimmed)) {
    return { isValid: false, error: 'El texto de la sede no parece una dirección real válida.' };
  }
  // At least 2 words
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 2) {
    return { isValid: false, error: 'Por favor incluye recinto y comuna o dirección (mínimo 2 palabras).' };
  }
  return { isValid: true };
}

export function validateEmail(emailText: string): { isValid: boolean; error?: string } {
  const trimmed = emailText.trim().toLowerCase();
  if (!trimmed) {
    return { isValid: false, error: 'El correo electrónico es obligatorio.' };
  }
  if (/\s/.test(trimmed)) {
    return { isValid: false, error: 'El correo electrónico no debe contener espacios.' };
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Ingresa un correo electrónico válido (ej: organizador@club.cl).' };
  }
  return { isValid: true };
}

export const CreateTournamentModal: React.FC<CreateTournamentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { createTournament, currentUser, tournaments, organizerKeys, redeemAdditionalOrganizerKey } = useTournament();

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isOrganizer = currentUser?.role === 'organizer';
  const myTournamentsCount = tournaments.filter((t) => t.organizerUserId === currentUser?.id).length;
  const organizerQuota = currentUser?.tournamentQuota || 1;
  const isQuotaReached = isOrganizer && myTournamentsCount >= organizerQuota;

  const userAssignedKey = organizerKeys.find(
    (k) => k.id === currentUser?.organizerKeyUsed || k.redeemedByUserId === currentUser?.id
  );

  const [newOrgKeyInput, setNewOrgKeyInput] = useState('');
  const [keyRedeemError, setKeyRedeemError] = useState('');
  const [keyRedeemSuccess, setKeyRedeemSuccess] = useState('');

  const [step, setStep] = useState<number>(1);
  const [showConfirmPopup, setShowConfirmPopup] = useState<boolean>(false);

  // Form State: Tournament & Organizer
  const [name, setName] = useState(userAssignedKey?.tournamentName || '');
  const [organizerType, setOrganizerType] = useState<OrganizerType>('empresa');
  const [organizerName, setOrganizerName] = useState(
    currentUser?.fullName && currentUser.fullName !== 'Por completar por el organizador'
      ? currentUser.fullName
      : ''
  );
  const [organizerRut, setOrganizerRut] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState(currentUser?.email || '');
  // Phone: fixed prefix +569, user only enters 8 digits
  const [phoneDigits, setPhoneDigits] = useState(
    currentUser?.phone ? currentUser.phone.replace(/\D/g, '').slice(-8) : ''
  );
  const [venueName, setVenueName] = useState('');
  const [venueCommune, setVenueCommune] = useState('Santiago');
  const [venueAddress, setVenueAddress] = useState('');
  const [debouncedMapsQuery, setDebouncedMapsQuery] = useState('Santiago, Chile');
  const [isAddressConfirmedWithMaps, setIsAddressConfirmedWithMaps] = useState<boolean>(false);
  const [showMapsPreview, setShowMapsPreview] = useState<boolean>(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0]
  );
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (venueAddress.trim().length < 4) return;
    const timer = setTimeout(() => {
      setDebouncedMapsQuery(`${venueAddress.trim()}, ${venueCommune}, Chile`);
    }, 350);
    return () => clearTimeout(timer);
  }, [venueAddress, venueCommune]);

  // Sport & Format State
  const [selectedSport, setSelectedSport] = useState<SportType>('volleyball');
  const [selectedFormat, setSelectedFormat] = useState<TournamentFormat>('short_league_groups');
  const [customGroupCount, setCustomGroupCount] = useState<number>(2);

  // Playoff Crosses State
  const [enablePlayoffs, setEnablePlayoffs] = useState<boolean>(true);
  const [startingPlayoffStage, setStartingPlayoffStage] = useState<PlayoffStage>('cuartos');

  // Categories State: Only the 9 official categories
  const [categories, setCategories] = useState<string[]>([
    'Sub16',
    'Sub18',
    'TC (Todo Competidor)',
  ]);

  // Rules overrides
  const [pointsWin, setPointsWin] = useState<number>(3);
  const [pointsTie, setPointsTie] = useState<number>(1);
  const [pointsLoss, setPointsLoss] = useState<number>(0);

  // Allow delegates to edit roster
  const [allowRosterEditing, setAllowRosterEditing] = useState<boolean>(true);

  // Organizer Validation & Tournament Visibility (Público vs Oculto)
  const [tournamentVisibility, setTournamentVisibility] = useState<'public' | 'hidden'>('public');

  // Optional Venue Entrance Sheet (Planilla de Ingreso al Recinto)
  const [requiresVenueSheet, setRequiresVenueSheet] = useState<boolean>(false);
  const [venueSheetMode, setVenueSheetMode] = useState<'upload_now' | 'upload_later'>('upload_now');
  const [venueSheetFileName, setVenueSheetFileName] = useState<string>('');

  // General error for step transitions
  const [stepError, setStepError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Real-time Validations with strict anti-gibberish, string cleaning, and min/max length checks
  const nameValidation = validateTournamentName(name);
  const orgNameValidation = validateHumanReadableText(
    organizerName,
    organizerType === 'empresa' ? 'La razón social o institución' : 'El nombre del organizador',
    4,
    70
  );
  const rutValidation = validateChileanRut(organizerRut);
  const emailValidation = validateEmail(organizerEmail);
  const phoneValidation =
    phoneDigits.length === 8
      ? { isValid: true }
      : {
          isValid: false,
          error:
            phoneDigits.length === 0
              ? 'El teléfono móvil es obligatorio.'
              : `Faltan dígitos: has ingresado ${phoneDigits.length} de los 8 requeridos.`,
        };
  const venueNameValidation = validateHumanReadableText(venueName, 'El nombre del recinto o cancha', 4);
  const venueAddressValidation = validateHumanReadableText(venueAddress, 'La dirección de la sede', 5);
  const venueCommuneValidation =
    venueCommune.trim().length >= 2
      ? { isValid: true }
      : { isValid: false, error: 'Selecciona una comuna válida.' };

  const isStep1Valid =
    nameValidation.isValid &&
    orgNameValidation.isValid &&
    rutValidation.isValid &&
    emailValidation.isValid &&
    phoneValidation.isValid &&
    venueNameValidation.isValid &&
    venueAddressValidation.isValid &&
    venueCommuneValidation.isValid &&
    isAddressConfirmedWithMaps;

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatRut(raw);
    setOrganizerRut(formatted);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only accept numeric digits, max 8
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 8);
    setPhoneDigits(digitsOnly);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOrganizerEmail(e.target.value.toLowerCase().trim());
  };

  const handleRedeemNewKey = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyRedeemError('');
    setKeyRedeemSuccess('');
    if (!newOrgKeyInput.trim()) {
      setKeyRedeemError('Por favor ingresa tu nueva clave de organizador.');
      return;
    }
    const res = redeemAdditionalOrganizerKey(newOrgKeyInput);
    if (res.success) {
      setKeyRedeemSuccess(res.message);
      setNewOrgKeyInput('');
    } else {
      setKeyRedeemError(res.message);
    }
  };

  const handleSportChange = (sport: SportType) => {
    setSelectedSport(sport);
    const cfg = SPORT_CONFIGS[sport];
    setPointsWin(cfg.rules.pointsWin);
    setPointsTie(cfg.rules.pointsTie);
    setPointsLoss(cfg.rules.pointsLoss);
  };

  const handleToggleCategory = (cat: string) => {
    if (categories.includes(cat)) {
      if (categories.length === 1) {
        setStepError('Debes mantener al menos una categoría seleccionada.');
        return;
      }
      setCategories(categories.filter((c) => c !== cat));
    } else {
      setCategories([...categories, cat]);
    }
    setStepError(null);
  };

  const validateStep = (currentStep: number): boolean => {
    setStepError(null);
    if (currentStep === 1) {
      if (!nameValidation.isValid) {
        setStepError(nameValidation.error || 'Nombre del torneo inválido.');
        return false;
      }
      if (!orgNameValidation.isValid) {
        setStepError(orgNameValidation.error || 'Nombre del organizador inválido.');
        return false;
      }
      if (!rutValidation.isValid) {
        setStepError(rutValidation.error || 'RUT inválido.');
        return false;
      }
      if (!phoneValidation.isValid) {
        setStepError(`Teléfono: ${phoneValidation.error}`);
        return false;
      }
      if (!emailValidation.isValid) {
        setStepError(`Email: ${emailValidation.error}`);
        return false;
      }
      if (!venueNameValidation.isValid) {
        setStepError(`Recinto: ${venueNameValidation.error}`);
        return false;
      }
      if (!venueAddressValidation.isValid) {
        setStepError(`Dirección: ${venueAddressValidation.error}`);
        return false;
      }
      if (!venueCommuneValidation.isValid) {
        setStepError(`Comuna: ${venueCommuneValidation.error}`);
        return false;
      }
      if (!isAddressConfirmedWithMaps) {
        setStepError('Debes verificar y confirmar la dirección oficial de la sede en Google Maps antes de continuar.');
        return false;
      }
      return true;
    }

    if (currentStep === 4) {
      if (categories.length === 0) {
        setStepError('Debes seleccionar al menos una categoría para el torneo.');
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const handleBack = () => {
    setStepError(null);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  // Open the mandatory confirmation popup
  const handleOpenConfirmationPopup = () => {
    if (!validateStep(1) || !validateStep(4)) return;
    setShowConfirmPopup(true);
  };

  // Final confirmation and commit
  const handleFinalConfirmSave = () => {
    setShowConfirmPopup(false);

    let groups: string[] | undefined = undefined;
    if (selectedFormat === 'short_league_groups') {
      const letters = ['A', 'B', 'C', 'D'];
      groups = Array.from({ length: customGroupCount }, (_, i) => `Grupo ${letters[i]}`);
    }

    const fullVenue = `${cleanTournamentString(venueName, true)} (${cleanTournamentString(venueAddress, true)}, ${venueCommune.trim()})`;
    const cleanedTourName = cleanTournamentString(name, true).slice(0, MAX_TOURNAMENT_NAME_LENGTH);

    const payload: CreateTournamentInput = {
      name: cleanedTourName,
      organizerName: cleanTournamentString(organizerName, true),
      organizerType,
      organizerContact: {
        email: organizerEmail.trim().toLowerCase(),
        phone: `+569${phoneDigits}`,
        rut: organizerRut.trim(),
        commune: venueCommune.trim(),
        address: cleanTournamentString(venueAddress, true),
        addressConfirmedWithMaps: true,
        isLocked: true, // Permanent lock once confirmed
      },
      sport: selectedSport,
      format: selectedFormat,
      categories,
      groups,
      venue: fullVenue,
      startDate,
      endDate,
      description: description.trim(),
      isDemo: false,
      allowRosterEditing,
      visibility: tournamentVisibility,
      isValidatedByOrganizer: true,
      requiresVenueSheet,
      venueSheetTemplatePending:
        requiresVenueSheet && (venueSheetMode === 'upload_later' || !venueSheetFileName),
      venueSheetTemplateFileName:
        requiresVenueSheet && venueSheetMode === 'upload_now' && venueSheetFileName
          ? venueSheetFileName
          : undefined,
      playoffs: enablePlayoffs
        ? {
            enabled: true,
            startingStage: startingPlayoffStage,
            matchups: [
              {
                id: 'pl-1',
                stage: startingPlayoffStage,
                roundLabel:
                  startingPlayoffStage === 'octavos'
                    ? 'Octavos 1'
                    : startingPlayoffStage === 'cuartos'
                    ? 'Cuartos 1'
                    : 'Semifinal 1',
                team1Label: '1° Posición Clasificada',
                team2Label: '2° Posición Clasificada',
                court: fullVenue,
              },
            ],
          }
        : undefined,
      rules: {
        pointsWin,
        pointsTie,
        pointsLoss,
      },
    };

    const newTournament = createTournament(payload);
    if (onSuccess) {
      onSuccess(newTournament.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-[96vw] max-w-md sm:max-w-2xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl rounded-[28px] sm:rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-[#081223] text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0052fe] flex items-center justify-center text-white shadow-md">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base leading-tight">
                Crear Campeonato Oficial
              </h2>
              <p className="text-[10px] sm:text-xs text-blue-300">
                Paso {step} de 5: Configuración y Validación Oficial TORNOW
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quota Banner */}
        {isSuperAdmin ? (
          <div className="px-5 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900">
            <span className="flex items-center gap-1.5 font-bold">
              <span>👑</span>
              <span>Acceso Administrador: Creación directa sin clave</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#0052fe] text-white font-black">
              Ilimitado
            </span>
          </div>
        ) : isOrganizer ? (
          <div className="px-5 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700">
            <span>Cupo de torneos para tu cuenta:</span>
            <span className="font-mono text-xs font-black text-slate-900 px-2 py-0.5 rounded-full bg-white border border-slate-200">
              {myTournamentsCount} / {organizerQuota} torneos (1 por clave)
            </span>
          </div>
        ) : null}

        {/* Stepper Progress Tabs */}
        {!isQuotaReached && (
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-[11px] font-bold overflow-x-auto no-scrollbar">
            {[
              { num: 1, label: 'Organizador' },
              { num: 2, label: 'Deporte' },
              { num: 3, label: 'Formato & Cruces' },
              { num: 4, label: 'Categorías' },
              { num: 5, label: 'Revisión' },
            ].map((s) => {
              const isCurrent = step === s.num;
              const isCompleted = step > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num < step || validateStep(step)) setStep(s.num);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all whitespace-nowrap ${
                    isCurrent
                      ? 'bg-[#081223] text-white shadow-xs font-black'
                      : isCompleted
                      ? 'text-[#0052fe] bg-blue-50 font-bold'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                      isCurrent
                        ? 'bg-[#0052fe] text-white font-black'
                        : isCompleted
                        ? 'bg-[#0052fe] text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isCompleted ? '✓' : s.num}
                  </span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {isQuotaReached ? (
            <div className="p-6 text-center space-y-4 bg-slate-50 border border-slate-200 rounded-3xl animate-in fade-in">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
                <Lock className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  Límite de Torneo por Clave Alcanzado
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Cada Clave de Organizador autoriza la creación de <strong>1 torneo oficial</strong>. Tu cuenta ya ha utilizado su cupo ({myTournamentsCount} de {organizerQuota} torneos).
                </p>
                <p className="text-xs text-slate-500 font-medium pt-1">
                  Para crear un nuevo torneo, introduce la nueva clave provista por soporte.
                </p>
              </div>

              {keyRedeemError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {keyRedeemError}
                </div>
              )}
              {keyRedeemSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                  {keyRedeemSuccess}
                </div>
              )}

              <form onSubmit={handleRedeemNewKey} className="max-w-md mx-auto space-y-3 pt-2">
                <input
                  type="text"
                  value={newOrgKeyInput}
                  onChange={(e) => setNewOrgKeyInput(e.target.value.toUpperCase())}
                  placeholder="Introduce tu nueva Clave de Organizador"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-slate-300 text-xs font-mono font-black uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0052fe]/20"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-full bg-[#0052fe] hover:bg-[#0042d0] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
                >
                  Validar Nueva Clave (+1 Torneo)
                </button>
              </form>
            </div>
          ) : (
            <>
              {stepError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{stepError}</span>
                </div>
              )}

              {/* STEP 1: Datos Reales del Organizador con Validación en Vivo */}
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl text-[11px] text-blue-900 leading-relaxed flex items-start gap-2.5">
                    <FileCheck className="w-4 h-4 text-[#0052fe] flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Validación de Datos Oficiales:</strong>
                      Todos los datos deben ser verídicos. RUT, teléfono, email y sede se validan en tiempo real y quedarán permanentemente bloqueados tras la confirmación final.
                    </div>
                  </div>

                  {/* Nombre del Torneo con Limpieza de Strings y Límite Mín/Máx de Caracteres */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-black uppercase text-slate-700 tracking-wider">
                        Nombre del Campeonato *
                      </label>
                      <div className="flex items-center gap-2">
                        {name.length > 0 && name !== cleanTournamentString(name, true) && (
                          <button
                            type="button"
                            onClick={() => setName(cleanTournamentString(name, true))}
                            className="text-[10px] font-bold text-[#0052fe] hover:underline bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200"
                          >
                            Limpiar formato
                          </button>
                        )}
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                            name.length === 0
                              ? 'bg-slate-100 text-slate-500 border-slate-200'
                              : nameValidation.charCount < MIN_TOURNAMENT_NAME_LENGTH ||
                                nameValidation.charCount > MAX_TOURNAMENT_NAME_LENGTH
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {nameValidation.charCount} / {MAX_TOURNAMENT_NAME_LENGTH} caracteres (mín. {MIN_TOURNAMENT_NAME_LENGTH})
                        </span>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={name}
                        maxLength={MAX_TOURNAMENT_NAME_LENGTH + 15}
                        onChange={(e) => {
                          // Prevent leading spaces and collapse consecutive triple spaces while typing
                          const nextVal = e.target.value.replace(/^\s+/, '').replace(/\s{2,}/g, ' ');
                          setName(nextVal);
                        }}
                        onBlur={() => {
                          if (name.trim()) {
                            setName(cleanTournamentString(name, true));
                          }
                        }}
                        placeholder="Ej: Copa TORNOW Apertura 2026, Liga Inter-Colegios..."
                        className={`w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
                          nameValidation.isValid
                            ? 'border-emerald-500 bg-emerald-50/20 focus:ring-emerald-500/20'
                            : name.length > 0
                            ? 'border-rose-400 focus:ring-rose-500/20'
                            : 'border-slate-300 focus:ring-[#0052fe]/20'
                        }`}
                      />
                      {nameValidation.isValid && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3.5 top-3" />
                      )}
                    </div>
                    {name.length > 0 && !nameValidation.isValid ? (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{nameValidation.error}</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-1">
                        Entre {MIN_TOURNAMENT_NAME_LENGTH} y {MAX_TOURNAMENT_NAME_LENGTH} caracteres reales. Se bloquean nombres repetitivos (como &quot;asdasd&quot;) o excesivamente largos.
                      </p>
                    )}
                  </div>

                  {/* Tipo de Organizador */}
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-700 mb-2 tracking-wider">
                      Tipo de Entidad Organizadora *
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {ORGANIZER_TYPES.map((type) => {
                        const isSelected = organizerType === type.id;
                        const Icon = type.id === 'empresa' ? Building : User;
                        return (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setOrganizerType(type.id)}
                            className={`p-3 rounded-2xl border text-left transition-all relative ${
                              isSelected
                                ? 'border-[#0052fe] bg-blue-50/70 shadow-sm ring-1 ring-[#0052fe]'
                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div
                                className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                                  isSelected ? 'bg-[#0052fe] text-white' : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-[#0052fe]" />}
                            </div>
                            <p className="font-extrabold text-xs text-slate-900 leading-tight">
                              {type.title}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1 leading-snug line-clamp-2">
                              {type.subtitle}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Nombre del Organizador */}
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-700 mb-1 tracking-wider">
                      {organizerType === 'empresa'
                        ? 'Razón Social / Nombre de la Institución o Club *'
                        : 'Nombre Completo del Organizador *'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={organizerName}
                        onChange={(e) => setOrganizerName(e.target.value)}
                        placeholder={
                          organizerType === 'empresa'
                            ? 'Ej: Club Deportivo Los Andes SpA, Asociación Metropolitana'
                            : 'Ej: Carlos Valenzuela Muñoz'
                        }
                        className={`w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 ${
                          orgNameValidation.isValid
                            ? 'border-emerald-500 bg-emerald-50/20 focus:ring-emerald-500/20'
                            : organizerName.length > 0
                            ? 'border-rose-400 focus:ring-rose-500/20'
                            : 'border-slate-300 focus:ring-[#0052fe]/20'
                        }`}
                      />
                      {orgNameValidation.isValid && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3.5 top-3" />
                      )}
                    </div>
                    {organizerName.length > 0 && !orgNameValidation.isValid && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{orgNameValidation.error}</span>
                      </p>
                    )}
                  </div>

                  {/* RUT con Formateo Dinámico y Validación Módulo 11 */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-black uppercase text-slate-700 tracking-wider">
                        RUT de la Entidad u Organizador *
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Validación Módulo 11
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={organizerRut}
                        onChange={handleRutChange}
                        placeholder="Ej: 12.345.678-9 o 76.123.456-K"
                        maxLength={12}
                        className={`w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border text-xs sm:text-sm font-mono font-bold uppercase text-slate-900 focus:outline-none focus:ring-2 ${
                          rutValidation.isValid
                            ? 'border-emerald-500 bg-emerald-50/20 focus:ring-emerald-500/20'
                            : organizerRut.length > 0
                            ? 'border-rose-400 focus:ring-rose-500/20'
                            : 'border-slate-300 focus:ring-[#0052fe]/20'
                        }`}
                      />
                      {rutValidation.isValid && (
                        <div className="absolute right-3.5 top-2.5 flex items-center gap-1 text-emerald-600 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="hidden sm:inline text-[10px]">RUT Válido</span>
                        </div>
                      )}
                    </div>
                    {organizerRut.length > 0 && !rutValidation.isValid && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{rutValidation.error}</span>
                      </p>
                    )}
                  </div>

                  {/* Teléfono Móvil con Prefijo Fijo +569 */}
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-700 mb-1 tracking-wider">
                      Teléfono Móvil de Contacto *
                    </label>
                    <div className="flex items-center">
                      <span className="px-3 py-2.5 bg-slate-200 text-slate-800 font-mono font-black text-xs sm:text-sm rounded-l-2xl border border-r-0 border-slate-300 select-none flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-600" />
                        <span>+56 9</span>
                      </span>
                      <div className="relative flex-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={phoneDigits}
                          onChange={handlePhoneChange}
                          placeholder="12345678"
                          maxLength={8}
                          className={`w-full px-3.5 py-2.5 rounded-r-2xl bg-slate-50 border text-xs sm:text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 ${
                            phoneValidation.isValid
                              ? 'border-emerald-500 bg-emerald-50/20 focus:ring-emerald-500/20'
                              : phoneDigits.length > 0
                              ? 'border-rose-400 focus:ring-rose-500/20'
                              : 'border-slate-300 focus:ring-[#0052fe]/20'
                          }`}
                        />
                        {phoneValidation.isValid && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3.5 top-3" />
                        )}
                      </div>
                    </div>
                    {phoneDigits.length > 0 && !phoneValidation.isValid && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{phoneValidation.error}</span>
                      </p>
                    )}
                  </div>

                  {/* Correo Electrónico Oficial */}
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-700 mb-1 tracking-wider">
                      Correo Electrónico Oficial *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={organizerEmail}
                        onChange={handleEmailChange}
                        placeholder="contacto@torneo.cl"
                        className={`w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 ${
                          emailValidation.isValid
                            ? 'border-emerald-500 bg-emerald-50/20 focus:ring-emerald-500/20'
                            : organizerEmail.length > 0
                            ? 'border-rose-400 focus:ring-rose-500/20'
                            : 'border-slate-300 focus:ring-[#0052fe]/20'
                        }`}
                      />
                      {emailValidation.isValid && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3.5 top-3" />
                      )}
                    </div>
                    {organizerEmail.length > 0 && !emailValidation.isValid && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{emailValidation.error}</span>
                      </p>
                    )}
                  </div>

                  {/* Sede: Recinto o Cancha, Comuna, Dirección y Verificación con Google Maps */}
                  <div className="space-y-3 pt-2 border-t border-slate-200/80">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#0052fe]" />
                        <span>Sede Oficial del Campeonato *</span>
                      </label>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Confirmación con Google Maps obligatoria
                      </span>
                    </div>

                    {/* Nombre del Recinto / Cancha */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Nombre del Recinto, Club o Cancha *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={venueName}
                          onChange={(e) => {
                            setVenueName(e.target.value);
                            setIsAddressConfirmedWithMaps(false);
                          }}
                          placeholder="Ej: Polideportivo Las Condes, Estadio Italiano, Gimnasio San Joaquín"
                          className={`w-full px-3.5 py-2 rounded-2xl bg-slate-50 border text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 ${
                            venueNameValidation.isValid
                              ? 'border-emerald-500 bg-emerald-50/20 focus:ring-emerald-500/20'
                              : venueName.length > 0
                              ? 'border-rose-400 focus:ring-rose-500/20'
                              : 'border-slate-300 focus:ring-[#0052fe]/20'
                          }`}
                        />
                        {venueNameValidation.isValid && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3.5 top-2.5" />
                        )}
                      </div>
                      {venueName.length > 0 && !venueNameValidation.isValid && (
                        <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{venueNameValidation.error}</span>
                        </p>
                      )}
                    </div>

                    {/* Comuna y Dirección */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Comuna *
                        </label>
                        <select
                          value={venueCommune}
                          onChange={(e) => {
                            setVenueCommune(e.target.value);
                            setIsAddressConfirmedWithMaps(false);
                          }}
                          className="w-full px-3 py-2 rounded-2xl bg-slate-50 border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0052fe]/20"
                        >
                          {CHILEAN_COMUNAS.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Dirección (Calle y Número) *
                        </label>
                        <input
                          type="text"
                          value={venueAddress}
                          onChange={(e) => {
                            setVenueAddress(e.target.value);
                            setIsAddressConfirmedWithMaps(false);
                          }}
                          placeholder="Ej: Av. Apoquindo 4501, Pasaje Los Olmos 312"
                          className={`w-full px-3.5 py-2 rounded-2xl bg-slate-50 border text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 ${
                            venueAddressValidation.isValid
                              ? 'border-emerald-500 bg-emerald-50/20 focus:ring-emerald-500/20'
                              : venueAddress.length > 0
                              ? 'border-rose-400 focus:ring-rose-500/20'
                              : 'border-slate-300 focus:ring-[#0052fe]/20'
                          }`}
                        />
                        {venueAddress.length > 0 && !venueAddressValidation.isValid && (
                          <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{venueAddressValidation.error}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Google Maps Verification Box */}
                    <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-[#0052fe] text-white flex items-center justify-center">
                            <MapPin className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-900">
                              Verificación de Sede con Google Maps
                            </span>
                            <p className="text-[10px] text-slate-500">
                              {venueAddress.trim()
                                ? `${venueAddress}, ${venueCommune}, Chile`
                                : 'Ingresa la dirección para ubicarla en el mapa'}
                            </p>
                          </div>
                        </div>

                        {venueAddress.trim().length >= 4 && (
                          <button
                            type="button"
                            onClick={() => setShowMapsPreview(!showMapsPreview)}
                            className="text-[11px] font-bold text-[#0052fe] hover:underline"
                          >
                            {showMapsPreview ? 'Ocultar mapa' : 'Ver mapa interactivo'}
                          </button>
                        )}
                      </div>

                      {/* Maps Iframe Embed */}
                      {(showMapsPreview || !isAddressConfirmedWithMaps) && venueAddress.trim().length >= 4 && (
                        <div className="w-full h-44 rounded-xl overflow-hidden border border-slate-300 shadow-inner bg-slate-100">
                          <iframe
                            title="Google Maps Sede Oficial"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            loading="lazy"
                            allowFullScreen
                            referrerPolicy="no-referrer-when-downgrade"
                            src={
                              import.meta.env.VITE_GOOGLE_MAPS_API_KEY
                                ? `https://www.google.com/maps/embed/v1/place?key=${
                                    import.meta.env.VITE_GOOGLE_MAPS_API_KEY
                                  }&q=${encodeURIComponent(debouncedMapsQuery)}`
                                : `https://maps.google.com/maps?q=${encodeURIComponent(
                                    debouncedMapsQuery
                                  )}&t=&z=16&ie=UTF8&iwloc=&output=embed`
                            }
                          />
                        </div>
                      )}

                      {/* Confirmation toggle button */}
                      <div className="flex items-center justify-between pt-1">
                        {isAddressConfirmedWithMaps ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-100/80 px-3 py-1.5 rounded-xl text-xs font-extrabold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Ubicación verificada y confirmada en Google Maps</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-amber-800 font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                            <span>Presiona el botón para confirmar la dirección exacta.</span>
                          </div>
                        )}

                        <button
                          type="button"
                          disabled={!venueAddressValidation.isValid || !venueNameValidation.isValid}
                          onClick={() => setIsAddressConfirmedWithMaps(!isAddressConfirmedWithMaps)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all shadow-xs ${
                            isAddressConfirmedWithMaps
                              ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                              : venueAddressValidation.isValid && venueNameValidation.isValid
                              ? 'bg-[#0052fe] hover:bg-[#0042d0] text-white active:scale-95'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {isAddressConfirmedWithMaps ? 'Cambiar confirmación' : 'Confirmar con Google Maps'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Fechas de inicio y término */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Fecha de Inicio
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Fecha Término / Clausura
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Planilla de Acceso al Recinto (Opcional) */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 mt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-[#0052fe]" />
                          <span>Planilla de Acceso al Recinto (Opcional)</span>
                        </span>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Indica si el recinto deportivo exige planilla de ingreso de jugadores y staff en portería.
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider self-start sm:self-center ${
                          requiresVenueSheet
                            ? 'bg-[#0052fe] text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {requiresVenueSheet ? 'Sí requiere planilla' : 'No requiere (Opcional)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setRequiresVenueSheet(false)}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          !requiresVenueSheet
                            ? 'border-slate-900 bg-white ring-2 ring-slate-900/10 text-slate-900 font-extrabold'
                            : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600 font-semibold'
                        }`}
                      >
                        <div>
                          <span className="text-xs block font-black">No necesito planilla de acceso</span>
                          <span className="text-[10px] text-slate-500 block font-normal">
                            El recinto es de libre ingreso o no solicita nómina en portería
                          </span>
                        </div>
                        {!requiresVenueSheet && (
                          <CheckCircle2 className="w-4 h-4 text-slate-900 shrink-0" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setRequiresVenueSheet(true)}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          requiresVenueSheet
                            ? 'border-[#0052fe] bg-blue-50/70 ring-2 ring-[#0052fe]/20 text-blue-950 font-extrabold'
                            : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600 font-semibold'
                        }`}
                      >
                        <div>
                          <span className="text-xs block font-black">Sí necesito planilla de ingreso</span>
                          <span className="text-[10px] text-slate-500 block font-normal">
                            La IA rellenará la planilla por club 1 día antes de cada fecha
                          </span>
                        </div>
                        {requiresVenueSheet && (
                          <CheckCircle2 className="w-4 h-4 text-[#0052fe] shrink-0" />
                        )}
                      </button>
                    </div>

                    {requiresVenueSheet && (
                      <div className="pt-2 border-t border-slate-200/80 space-y-2.5 animate-in fade-in duration-150">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setVenueSheetMode('upload_now')}
                            className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                              venueSheetMode === 'upload_now'
                                ? 'border-[#0052fe] bg-white font-extrabold text-slate-900 shadow-2xs'
                                : 'border-slate-200 bg-slate-100/70 text-slate-600 font-semibold'
                            }`}
                          >
                            <span className="block font-black text-[#0052fe]">
                              📤 Subir plantilla ahora mismo
                            </span>
                            <span className="text-[10px] text-slate-500 font-normal">
                              Adjunta el archivo Excel (.xlsx), PDF o imagen del recinto
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setVenueSheetMode('upload_later')}
                            className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                              venueSheetMode === 'upload_later'
                                ? 'border-amber-500 bg-amber-50/80 font-extrabold text-amber-950 shadow-2xs'
                                : 'border-slate-200 bg-slate-100/70 text-slate-600 font-semibold'
                            }`}
                          >
                            <span className="block font-black text-amber-800">
                              ⏳ Aún no tengo la planilla de acceso
                            </span>
                            <span className="text-[10px] text-slate-600 font-normal">
                              Sí la necesito, pero la subiré más adelante en el Panel de Organizador
                            </span>
                          </button>
                        </div>

                        {venueSheetMode === 'upload_now' ? (
                          <div className="p-3 rounded-xl bg-white border border-dashed border-blue-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div className="text-xs">
                              <span className="font-extrabold text-slate-800 block">
                                {venueSheetFileName
                                  ? `✓ Plantilla cargada: ${venueSheetFileName}`
                                  : 'Selecciona el archivo de plantilla del recinto (.xlsx, .pdf, imagen)'}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                La IA usará este formato para rellenar las nóminas de cada club sin errores.
                              </span>
                            </div>
                            <label className="px-3 py-1.5 rounded-xl bg-[#0052fe] hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0">
                              <Upload className="w-3.5 h-3.5" />
                              <span>{venueSheetFileName ? 'Cambiar Archivo' : 'Subir Plantilla'}</span>
                              <input
                                type="file"
                                accept=".xlsx,.xls,.csv,.pdf,image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) setVenueSheetFileName(f.name);
                                }}
                              />
                            </label>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-semibold flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>
                              Quedará activado el módulo de Planilla de Ingreso y podrás subir el archivo cuando el recinto te lo entregue desde tu Panel de Organizador.
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: Deporte */}
              {step === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <label className="block text-xs font-black uppercase text-slate-700 tracking-wider">
                    Selecciona la Disciplina Deportiva *
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(Object.keys(SPORT_CONFIGS) as SportType[]).map((sportKey) => {
                      const cfg = SPORT_CONFIGS[sportKey];
                      const isSelected = selectedSport === sportKey;

                      return (
                        <button
                          key={sportKey}
                          type="button"
                          onClick={() => handleSportChange(sportKey)}
                          className={`p-4 rounded-2xl border text-left transition-all relative ${
                            isSelected
                              ? 'border-[#0052fe] bg-blue-50/70 shadow-sm ring-1 ring-[#0052fe]'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">{cfg.emoji}</span>
                            {isSelected && <Check className="w-4 h-4 text-[#0052fe]" />}
                          </div>
                          <p className="font-extrabold text-sm text-slate-900">{cfg.name}</p>
                          <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                            {cfg.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 3: Formato & Cruces */}
              {step === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <label className="block text-xs font-black uppercase text-slate-700 tracking-wider">
                    Estructura de Competición *
                  </label>

                  <div className="space-y-3">
                    {FORMAT_CONFIGS &&
                      (Object.keys(FORMAT_CONFIGS) as TournamentFormat[]).map((fmtKey) => {
                        const fmt = FORMAT_CONFIGS[fmtKey];
                        const isSelected = selectedFormat === fmtKey;

                        return (
                          <div
                            key={fmtKey}
                            onClick={() => setSelectedFormat(fmtKey)}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'border-[#0052fe] bg-blue-50/70 ring-1 ring-[#0052fe]'
                                : 'border-slate-200 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-sm text-slate-900">
                                {fmt.title}
                              </span>
                              {isSelected && <Check className="w-4 h-4 text-[#0052fe]" />}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{fmt.description}</p>

                            {fmtKey === 'short_league_groups' && isSelected && (
                              <div className="mt-3 pt-3 border-t border-blue-200 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700">
                                  Cantidad de Grupos:
                                </span>
                                <div className="flex gap-2">
                                  {[2, 3, 4].map((g) => (
                                    <button
                                      key={g}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCustomGroupCount(g);
                                      }}
                                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                                        customGroupCount === g
                                          ? 'bg-[#081223] text-white shadow-xs'
                                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                      }`}
                                    >
                                      {g} Grupos
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* Playoff Configuration */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-amber-500" />
                          <span>Cruces para Etapas Finales (Playoffs)</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Define desde qué fase eliminatoria clasificarán los mejores equipos
                        </p>
                      </div>

                      <input
                        type="checkbox"
                        checked={enablePlayoffs}
                        onChange={(e) => setEnablePlayoffs(e.target.checked)}
                        className="w-4 h-4 accent-[#0052fe] rounded cursor-pointer"
                      />
                    </div>

                    {enablePlayoffs && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {PLAYOFF_STAGE_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setStartingPlayoffStage(opt.id)}
                            className={`p-2 rounded-xl border text-xs font-bold text-center transition-all ${
                              startingPlayoffStage === opt.id
                                ? 'bg-[#0052fe] text-white border-[#0052fe] shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <p className="capitalize">{opt.id}</p>
                            <span className="text-[10px] font-normal opacity-80 block">
                              {opt.matchesCount} partido(s)
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4: Categorías (Selección Múltiple con Checkboxes Obligatorios) */}
              {step === 4 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <label className="text-xs font-black uppercase text-slate-900 tracking-wider block">
                        Categorías Oficiales Disponibles *
                      </label>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Selecciona las casillas de las categorías participantes. Es obligatorio elegir al menos una.
                      </p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-[#0052fe] font-mono">
                      {categories.length} de {OFFICIAL_CATEGORIES.length}
                    </span>
                  </div>

                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl text-[11px] text-blue-900 leading-relaxed">
                    <strong>Competencia Independiente:</strong> Cada categoría seleccionada funciona como una competencia separada, con sus propios equipos, cruces, programación y tabla de posiciones.
                  </div>

                  {/* Exact list of 9 categories with Checkboxes in official order */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {OFFICIAL_CATEGORIES.map((catName) => {
                      const isChecked = categories.includes(catName);

                      return (
                        <label
                          key={catName}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer select-none transition-all ${
                            isChecked
                              ? 'border-[#0052fe] bg-blue-50/60 shadow-xs ring-1 ring-[#0052fe]'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleCategory(catName)}
                              className="w-4 h-4 rounded text-[#0052fe] focus:ring-[#0052fe] accent-[#0052fe] cursor-pointer"
                            />
                            <span className="text-xs font-extrabold text-slate-900">
                              {catName}
                            </span>
                          </div>
                          {isChecked && (
                            <span className="text-[10px] font-bold text-[#0052fe] bg-white px-2 py-0.5 rounded-full border border-blue-200 shadow-2xs">
                              Activa
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>

                  {/* Roster Editing Toggle */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 mt-4">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-[#0052fe]" />
                        <span>Permitir a los Delegados Modificar Nóminas</span>
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {allowRosterEditing
                          ? 'Los delegados pueden inscribir y editar jugadores con su clave única.'
                          : 'Nóminas cerradas: solo lectura.'}
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={allowRosterEditing}
                        onChange={(e) => setAllowRosterEditing(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0052fe]"></div>
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 5: Revisión General */}
              {step === 5 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-4 rounded-3xl bg-gradient-to-br from-[#081223] via-[#0e1d38] to-[#081223] text-white shadow-xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" />
                        <span>Ficha Oficial del Torneo</span>
                      </span>
                      <span className="text-xs font-bold text-amber-400 capitalize">
                        {SPORT_CONFIGS[selectedSport].name}
                      </span>
                    </div>

                    <h3 className="text-lg font-black tracking-tight">{name}</h3>

                    <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Organizador
                        </span>
                        <span className="font-semibold">{organizerName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          RUT Oficial
                        </span>
                        <span className="font-mono font-bold text-blue-300">{organizerRut}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Teléfono
                        </span>
                        <span className="font-mono">+56 9 {phoneDigits}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Email
                        </span>
                        <span className="truncate block">{organizerEmail}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/10 text-xs">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Sede y Dirección
                      </span>
                      <span className="font-semibold text-slate-200 block">
                        {venueName} ({venueAddress}, {venueCommune})
                      </span>
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ubicación verificada y confirmada en Google Maps</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary of categories */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                        Categorías Independientes ({categories.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {categories.map((c) => (
                        <span
                          key={c}
                          className="px-2.5 py-1 rounded-full bg-white border border-slate-300 text-slate-800 text-xs font-extrabold shadow-2xs"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Validación del Organizador: Poner en Público u Oculto */}
                  <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-[#0052fe]" />
                          <span>Validar Torneo como Organizador (Visibilidad)</span>
                        </span>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Elige si deseas validar y publicar el torneo de inmediato en modo <strong>Público</strong> o mantenerlo <strong>Oculto</strong> mientras terminas de inscribir clubes.
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider self-start sm:self-center ${
                          tournamentVisibility === 'public'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-500 text-slate-950'
                        }`}
                      >
                        {tournamentVisibility === 'public' ? '🌐 Público (Validado)' : '🔒 Oculto (Privado)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setTournamentVisibility('public')}
                        className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                          tournamentVisibility === 'public'
                            ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/30 text-emerald-950 font-extrabold'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              tournamentVisibility === 'public'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <Globe className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs block font-black">Validar y Poner en Público</span>
                            <span className="text-[10px] text-slate-500 block font-normal">
                              Visible en la cartelera y buscador oficial
                            </span>
                          </div>
                        </div>
                        {tournamentVisibility === 'public' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setTournamentVisibility('hidden')}
                        className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                          tournamentVisibility === 'hidden'
                            ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/30 text-amber-950 font-extrabold'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              tournamentVisibility === 'hidden'
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <EyeOff className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs block font-black">Poner en Oculto (Privado)</span>
                            <span className="text-[10px] text-slate-500 block font-normal">
                              Solo visible para ti como organizador
                            </span>
                          </div>
                        </div>
                        {tournamentVisibility === 'hidden' && (
                          <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Controls */}
        {!isQuotaReached && (
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Atrás</span>
              </button>
            ) : (
              <div />
            )}

            {step < 5 ? (
              <button
                type="button"
                disabled={step === 1 && !isStep1Valid}
                onClick={handleNext}
                className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 shadow-md transition-all ml-auto ${
                  step === 1 && !isStep1Valid
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-[#081223] hover:bg-[#0052fe] text-white active:scale-95'
                }`}
              >
                <span>Continuar</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenConfirmationPopup}
                className="px-6 py-2.5 rounded-2xl bg-[#0052fe] hover:bg-[#0042d0] text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all ml-auto active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-blue-200" />
                <span>Revisar y Guardar Torneo</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* POPUP DE CONFIRMACIÓN DE DATOS OBLIGATORIO */}
      {showConfirmPopup && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white w-[95vw] max-w-md sm:max-w-xl lg:max-w-2xl rounded-[28px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 shadow-xs">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  Confirmación de Datos Oficiales
                </h3>
                <p className="text-xs text-slate-500">
                  Verifica que la información del torneo sea exacta
                </p>
              </div>
            </div>

            {/* MANDATORY NOTICE REQUIRED BY USER SPEC */}
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-950 text-xs leading-relaxed font-bold shadow-xs">
              ⚠️ “Los datos entregados no podrán ser modificados después. Revisa que estén correctos antes de confirmar.”
            </div>

            {/* SUMMARY TABLE OF ENTERED DATA */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex items-start justify-between border-b border-slate-200/80 pb-1.5">
                <span className="text-slate-500 font-bold">Torneo:</span>
                <span className="font-extrabold text-slate-900 text-right">{name}</span>
              </div>
              <div className="flex items-start justify-between border-b border-slate-200/80 pb-1.5">
                <span className="text-slate-500 font-bold">Organizador:</span>
                <span className="font-semibold text-slate-900 text-right">{organizerName}</span>
              </div>
              <div className="flex items-start justify-between border-b border-slate-200/80 pb-1.5">
                <span className="text-slate-500 font-bold">RUT:</span>
                <span className="font-mono font-black text-[#0052fe] text-right">{organizerRut}</span>
              </div>
              <div className="flex items-start justify-between border-b border-slate-200/80 pb-1.5">
                <span className="text-slate-500 font-bold">Teléfono:</span>
                <span className="font-mono font-bold text-slate-900 text-right">+56 9 {phoneDigits}</span>
              </div>
              <div className="flex items-start justify-between border-b border-slate-200/80 pb-1.5">
                <span className="text-slate-500 font-bold">Email:</span>
                <span className="font-semibold text-slate-900 text-right">{organizerEmail}</span>
              </div>
              <div className="flex items-start justify-between border-b border-slate-200/80 pb-1.5">
                <span className="text-slate-500 font-bold">Sede Oficial:</span>
                <div className="text-right max-w-[240px]">
                  <span className="font-semibold text-slate-900 block leading-tight">
                    {venueName} ({venueAddress}, {venueCommune})
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold inline-flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                    Confirmada con Google Maps
                  </span>
                </div>
              </div>
              <div className="flex items-start justify-between border-b border-slate-200/80 pb-1.5">
                <span className="text-slate-500 font-bold">Estado de Visibilidad:</span>
                <button
                  type="button"
                  onClick={() =>
                    setTournamentVisibility((prev) => (prev === 'public' ? 'hidden' : 'public'))
                  }
                  className={`px-2.5 py-1 rounded-full text-[11px] font-black flex items-center gap-1.5 transition-all ${
                    tournamentVisibility === 'public'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {tournamentVisibility === 'public' ? (
                    <>
                      <Globe className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Validado • Público (Clic para ocultar)</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                      <span>Oculto • Privado (Clic para hacer público)</span>
                    </>
                  )}
                </button>
              </div>
              <div className="pt-0.5">
                <span className="text-slate-500 font-bold block mb-1">Categorías Seleccionadas:</span>
                <div className="flex flex-wrap gap-1">
                  {categories.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 rounded-md bg-white border border-slate-300 font-bold text-[10px] text-slate-800"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* POPUP ACTION BUTTONS */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmPopup(false)}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                Volver y corregir
              </button>
              <button
                type="button"
                onClick={handleFinalConfirmSave}
                className="px-5 py-2.5 rounded-2xl bg-[#0052fe] hover:bg-[#0042d0] text-white text-xs font-black shadow-lg shadow-blue-600/30 transition-all active:scale-95"
              >
                Confirmar y guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
