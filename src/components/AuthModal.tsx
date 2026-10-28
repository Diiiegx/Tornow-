import React, { useState, useEffect } from 'react';
import { useTournament } from '../context/TournamentContext';
import {
  X,
  Lock,
  User,
  Shield,
  Key,
  Building,
  CheckCircle2,
  ArrowRight,
  Trophy,
  Sparkles,
  Zap,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'invite' | 'organizer_key';
  initialInviteKey?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login',
  initialInviteKey = '',
}) => {
  const {
    login,
    loginWithGoogle,
    validateInviteKey,
    redeemInviteKey,
    validateOrganizerKey,
    redeemOrganizerKey,
  } = useTournament();

  const [mode, setMode] = useState<'login' | 'invite' | 'organizer_key'>(defaultMode);

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Club invite redemption state
  const [inviteKey, setInviteKey] = useState(initialInviteKey);
  const [isClubKeyVerified, setIsClubKeyVerified] = useState(false);
  const [verifiedClubName, setVerifiedClubName] = useState('');
  const [verifiedCategory, setVerifiedCategory] = useState('');
  const [clubInviteError, setClubInviteError] = useState('');

  const [clubRegFullName, setClubRegFullName] = useState('');
  const [clubRegUsername, setClubRegUsername] = useState('');
  const [clubRegPassword, setClubRegPassword] = useState('');
  const [clubRegEmail, setClubRegEmail] = useState('');
  const [clubRegPhone, setClubRegPhone] = useState('');

  // Organizer Key redemption state
  const [orgKeyInput, setOrgKeyInput] = useState('');
  const [isOrgKeyVerified, setIsOrgKeyVerified] = useState(false);
  const [verifiedOrgName, setVerifiedOrgName] = useState('');
  const [verifiedOrgEmail, setVerifiedOrgEmail] = useState('');
  const [orgKeyError, setOrgKeyError] = useState('');

  const [orgRegFullName, setOrgRegFullName] = useState('');
  const [orgRegUsername, setOrgRegUsername] = useState('');
  const [orgRegPassword, setOrgRegPassword] = useState('');
  const [orgRegEmail, setOrgRegEmail] = useState('');
  const [orgRegPhone, setOrgRegPhone] = useState('');

  // Sync mode and initial invite key when opened
  useEffect(() => {
    if (initialInviteKey) {
      setMode('invite');
      setInviteKey(initialInviteKey);
      const res = validateInviteKey(initialInviteKey);
      if (res.valid && res.invite) {
        setIsClubKeyVerified(true);
        setVerifiedClubName(res.invite.clubName);
        setVerifiedCategory(res.invite.category);
        setClubRegFullName(res.invite.recipientName || '');
        setClubRegEmail(res.invite.recipientEmail || '');
        setClubRegPhone(res.invite.recipientPhone || '');
      }
    } else {
      setMode(defaultMode);
    }
  }, [isOpen, initialInviteKey, defaultMode]);

  if (!isOpen) return null;

  // 1. Handle Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError('Por favor ingrese usuario y contraseña');
      return;
    }
    const result = login(loginUsername, loginPassword);
    if (result.success) {
      onClose();
    } else {
      setLoginError(result.message);
    }
  };

  // Quick fill credentials for demo testing
  const handleQuickLogin = (user: string, pass: string) => {
    setLoginUsername(user);
    setLoginPassword(pass);
    const result = login(user, pass);
    if (result.success) {
      onClose();
    } else {
      setLoginError(result.message);
    }
  };

  // 2. Club Key Verification
  const handleVerifyClubKey = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setClubInviteError('');
    if (!inviteKey.trim()) {
      setClubInviteError('Por favor introduce una clave de club.');
      return;
    }

    const res = validateInviteKey(inviteKey);
    if (res.valid && res.invite) {
      setIsClubKeyVerified(true);
      setVerifiedClubName(res.invite.clubName);
      setVerifiedCategory(res.invite.category);
      setClubRegFullName(res.invite.recipientName || '');
      setClubRegEmail(res.invite.recipientEmail || '');
      setClubRegPhone(res.invite.recipientPhone || '');
    } else {
      setIsClubKeyVerified(false);
      setClubInviteError(res.message);
    }
  };

  const handleRedeemClubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClubInviteError('');

    if (!clubRegUsername.trim() || !clubRegPassword.trim() || !clubRegFullName.trim()) {
      setClubInviteError('Por favor complete los datos obligatorios.');
      return;
    }

    if (clubRegPassword.length < 4) {
      setClubInviteError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    const res = redeemInviteKey(inviteKey, {
      username: clubRegUsername.trim(),
      password: clubRegPassword,
      fullName: clubRegFullName.trim(),
      email: clubRegEmail.trim(),
      phone: clubRegPhone.trim(),
    });

    if (res.success) {
      onClose();
    } else {
      setClubInviteError(res.message);
    }
  };

  // 3. Organizer Key Verification
  const handleVerifyOrgKey = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setOrgKeyError('');
    if (!orgKeyInput.trim()) {
      setOrgKeyError('Por favor introduce una clave única de organizador.');
      return;
    }

    const res = validateOrganizerKey(orgKeyInput);
    if (res.valid && res.keyObj) {
      setIsOrgKeyVerified(true);
      const isPendingName =
        !res.keyObj.organizerName ||
        res.keyObj.organizerName === 'Por completar por el organizador';
      setVerifiedOrgName(
        res.keyObj.tournamentName
          ? `Torneo: ${res.keyObj.tournamentName}`
          : res.keyObj.organizerName
      );
      setVerifiedOrgEmail(res.keyObj.organizerEmail || '');
      setOrgRegFullName(isPendingName ? '' : res.keyObj.organizerName);
      setOrgRegEmail(res.keyObj.organizerEmail || '');
      setOrgRegPhone(res.keyObj.organizerPhone || '');
    } else {
      setIsOrgKeyVerified(false);
      setOrgKeyError(res.message);
    }
  };

  const handleRedeemOrgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOrgKeyError('');

    if (!orgRegUsername.trim() || !orgRegPassword.trim() || !orgRegFullName.trim()) {
      setOrgKeyError('Por favor completa todos los campos requeridos.');
      return;
    }

    if (orgRegPassword.length < 4) {
      setOrgKeyError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    const res = redeemOrganizerKey(orgKeyInput, {
      username: orgRegUsername.trim(),
      password: orgRegPassword,
      fullName: orgRegFullName.trim(),
      email: orgRegEmail.trim(),
      phone: orgRegPhone.trim(),
    });

    if (res.success) {
      onClose();
    } else {
      setOrgKeyError(res.message);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-[95vw] max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl bg-white border border-slate-200 rounded-[28px] sm:rounded-[32px] shadow-2xl overflow-hidden text-slate-900 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-cyan-400 shadow-sm">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                {mode === 'login'
                  ? 'Acceso a TORNOW'
                  : mode === 'organizer_key'
                  ? 'Activar Cuenta de Organizador'
                  : 'Activar Cuenta de Club'}
              </h2>
              <p className="text-[11px] text-cyan-700 font-bold uppercase tracking-wider">
                TORNOW • Plataforma Masiva de Torneos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Way Mode Switcher: Login | Clave Organizador | Clave Club */}
        <div className="p-3 bg-white border-b border-slate-100">
          <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 text-xs font-bold w-full justify-center">
            <button
              onClick={() => {
                setMode('login');
                setLoginError('');
              }}
              className={`flex-1 py-2 px-2.5 rounded-xl transition-all text-center ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => {
                setMode('organizer_key');
                setOrgKeyError('');
              }}
              className={`flex-1 py-2 px-2 rounded-xl transition-all text-center flex items-center justify-center gap-1 ${
                mode === 'organizer_key'
                  ? 'bg-gradient-to-r from-cyan-600 to-teal-500 text-white shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Key Organizador</span>
            </button>
            <button
              onClick={() => {
                setMode('invite');
                setClubInviteError('');
              }}
              className={`flex-1 py-2 px-2.5 rounded-xl transition-all text-center flex items-center justify-center gap-1 ${
                mode === 'invite'
                  ? 'bg-white text-slate-900 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-cyan-600" />
              <span>Key Club</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: LOGIN */}
          {mode === 'login' && (
            <div className="space-y-4">
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {loginError && (
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <Shield className="w-4 h-4 flex-shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Usuario
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="Nombre de usuario"
                      className="w-full bg-slate-50 border border-slate-200 rounded-full py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Contraseña"
                      className="w-full bg-slate-50 border border-slate-200 rounded-full py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-[#081223] hover:bg-[#0052fe] text-white font-black text-xs uppercase tracking-wider rounded-full shadow-md transition-all active:scale-95"
                >
                  Ingresar a la Plataforma
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200" />
                  <span className="flex-shrink mx-3 text-[11px] font-bold text-slate-400 uppercase">
                    o accede con tu cuenta Google
                  </span>
                  <div className="flex-grow border-t border-slate-200" />
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    setLoginError('');
                    const res = await loginWithGoogle();
                    if (res.success) {
                      onClose();
                    } else {
                      setLoginError(res.message);
                    }
                  }}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs rounded-full shadow-2xs transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Continuar con Google</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: ORGANIZER KEY (Convenio Comercial) */}
          {mode === 'organizer_key' && (
            <div className="space-y-4">
              {orgKeyError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {orgKeyError}
                </div>
              )}

              {!isOrgKeyVerified ? (
                <form onSubmit={handleVerifyOrgKey} className="space-y-4">
                  <div className="p-3.5 bg-blue-50 border border-blue-200/80 rounded-2xl text-xs text-blue-950">
                    <p className="font-extrabold text-[#0052fe] mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#0052fe]" />
                      <span>Clave Comercial de Organizador</span>
                    </p>
                    <p className="text-[11px] text-blue-900 leading-relaxed">
                      La activación de cuenta para organizadores requiere una <strong>Key única</strong> otorgada por TORNOW tras concretar la cotización oficial. Cada clave autoriza la creación y gestión de 1 torneo oficial.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ingresa tu Clave Única de Organizador
                    </label>
                    <input
                      type="text"
                      value={orgKeyInput}
                      onChange={(e) => setOrgKeyInput(e.target.value.toUpperCase())}
                      placeholder="Ej. KEY-ORG-XXXX-XXXX"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs font-mono font-black text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-[#0052fe]/20"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 bg-[#0052fe] hover:bg-[#0042d0] text-white font-black text-xs uppercase tracking-wider rounded-full shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <span>Validar Clave de Organizador</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRedeemOrgSubmit} className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold block text-emerald-900">
                        ¡Key Oficial Válida (1 Mes de Prueba Gratuita)!
                      </span>
                      <p className="text-[11px] text-emerald-800">
                        <strong>{verifiedOrgName}</strong>
                      </p>
                      <span className="text-[10px] text-emerald-700 block mt-0.5">
                        ✓ Completa tu información de organizador a continuación para activar tu cuenta y configurar tu torneo.
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nombre del Organizador o Razón Social *
                    </label>
                    <input
                      type="text"
                      value={orgRegFullName}
                      onChange={(e) => setOrgRegFullName(e.target.value)}
                      placeholder="Ingresa tu nombre o el de tu liga/productora"
                      className="w-full bg-slate-50 border border-slate-200 rounded-full py-2 px-3.5 text-xs text-slate-900 font-medium"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Usuario de Acceso *
                      </label>
                      <input
                        type="text"
                        value={orgRegUsername}
                        onChange={(e) => setOrgRegUsername(e.target.value)}
                        placeholder="ej. producciones_org"
                        className="w-full bg-slate-50 border border-slate-200 rounded-full py-2 px-3.5 text-xs text-slate-900 font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Contraseña *
                      </label>
                      <input
                        type="password"
                        value={orgRegPassword}
                        onChange={(e) => setOrgRegPassword(e.target.value)}
                        placeholder="Mín. 4 caracteres"
                        className="w-full bg-slate-50 border border-slate-200 rounded-full py-2 px-3.5 text-xs text-slate-900 font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Correo de Contacto *
                      </label>
                      <input
                        type="email"
                        value={orgRegEmail}
                        onChange={(e) => setOrgRegEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-full py-2 px-3.5 text-xs text-slate-900 font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Teléfono Móvil
                      </label>
                      <input
                        type="tel"
                        value={orgRegPhone}
                        onChange={(e) => setOrgRegPhone(e.target.value)}
                        placeholder="+56 9..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-full py-2 px-3.5 text-xs text-slate-900 font-medium"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsOrgKeyVerified(false)}
                      className="px-4 py-2.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold"
                    >
                      Atrás
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white font-black text-xs uppercase tracking-wider rounded-full shadow-md transition-all"
                    >
                      Activar Mi Cuenta de Organizador
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: CLUB KEY (Delegado de Club) */}
          {mode === 'invite' && (
            <div className="space-y-4">
              {clubInviteError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {clubInviteError}
                </div>
              )}

              {!isClubKeyVerified ? (
                <form onSubmit={handleVerifyClubKey} className="space-y-4">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600">
                    <p className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-cyan-600" />
                      <span>Clave Única de Delegado de Club</span>
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      El organizador del torneo genera una <strong>clave única e intransferible por club</strong> para que el delegado oficial rellene y gestione su nómina de jugadores.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ingresa tu Clave Única de Club
                    </label>
                    <input
                      type="text"
                      value={inviteKey}
                      onChange={(e) => setInviteKey(e.target.value.toUpperCase())}
                      placeholder="Ej. KEY-CLUB-XXXX-XXXX"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs font-mono font-black text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-[#0052fe]/20"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 bg-[#0052fe] hover:bg-[#0042d0] text-white font-black text-xs uppercase tracking-wider rounded-full shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <span>Verificar Clave de Club</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRedeemClubSubmit} className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="font-extrabold block text-emerald-900">Clave de Club Verificada</span>
                      <p className="text-[11px] text-emerald-800">
                        Club: <strong>{verifiedClubName}</strong> ({verifiedCategory})
                      </p>
                      <span className="text-[10px] text-emerald-700 block mt-0.5">
                        ✓ Serás el delegado oficial de este equipo en el torneo.
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nombre Completo del Delegado *
                    </label>
                    <input
                      type="text"
                      value={clubRegFullName}
                      onChange={(e) => setClubRegFullName(e.target.value)}
                      placeholder="Ej. Roberto Méndez"
                      className="w-full bg-slate-50 border border-slate-200 rounded-full py-2 px-3.5 text-xs text-slate-900 font-medium"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nombre de Usuario *
                      </label>
                      <input
                        type="text"
                        value={clubRegUsername}
                        onChange={(e) => setClubRegUsername(e.target.value)}
                        placeholder="Ej. delegado_club"
                        className="w-full bg-slate-50 border border-slate-200 rounded-full py-2 px-3.5 text-xs text-slate-900 font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Contraseña *
                      </label>
                      <input
                        type="password"
                        value={clubRegPassword}
                        onChange={(e) => setClubRegPassword(e.target.value)}
                        placeholder="Clave de acceso"
                        className="w-full bg-slate-50 border border-slate-200 rounded-full py-2 px-3.5 text-xs text-slate-900 font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        value={clubRegEmail}
                        onChange={(e) => setClubRegEmail(e.target.value)}
                        placeholder="tu@correo.cl"
                        className="w-full bg-slate-50 border border-slate-200 rounded-full py-2 px-3.5 text-xs text-slate-900 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Teléfono de Contacto
                      </label>
                      <input
                        type="tel"
                        value={clubRegPhone}
                        onChange={(e) => setClubRegPhone(e.target.value)}
                        placeholder="+56 9..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-full py-2 px-3.5 text-xs text-slate-900 font-medium"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsClubKeyVerified(false)}
                      className="px-4 py-2.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold"
                    >
                      Atrás
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 px-4 bg-cyan-700 hover:bg-cyan-800 text-white font-black text-xs uppercase tracking-wider rounded-full shadow-md transition-all"
                    >
                      Activar Mi Club Oficial
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
