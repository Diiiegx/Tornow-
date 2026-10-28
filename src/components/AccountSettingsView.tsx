import React, { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import {
  User,
  Shield,
  Key,
  Lock,
  Smartphone,
  Mail,
  Bell,
  Volume2,
  VolumeX,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Laptop,
  Check,
  MessageCircle,
  Save,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { UserRole } from '../types';
import { AppNavTab } from './BottomNavDock';

interface AccountSettingsViewProps {
  onOpenAuth?: (mode?: 'login' | 'invite' | 'organizer_key') => void;
  onNavigateToTab?: (tab: AppNavTab) => void;
}

export const AccountSettingsView: React.FC<AccountSettingsViewProps> = ({
  onOpenAuth,
  onNavigateToTab,
}) => {
  const {
    currentUser,
    logout,
    changePassword,
    updateUserProfile,
    sessionHistory,
    closeOtherSessions,
    soundEnabled,
    setSoundEnabled,
    browserNotificationsEnabled,
    requestBrowserNotifications,
    notificationPreferences,
    updateNotificationPreferences,
    tournaments,
  } = useTournament();

  // Profile Edit State
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // If user is guest/not logged in
  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto space-y-6 pb-20 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl p-8 sm:p-10 text-center border border-slate-200 shadow-sm space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#0052fe] flex items-center justify-center mx-auto shadow-inner">
            <User className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Mi Cuenta Deportiva
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              Inicia sesión o canjea tu clave única de acceso para gestionar tu club, tus nóminas de jugadores o administrar tus campeonatos.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              type="button"
              onClick={() => onOpenAuth && onOpenAuth('login')}
              className="py-3 px-6 rounded-full bg-[#0052fe] hover:bg-[#0042d0] text-white font-extrabold text-xs shadow-md transition-all active:scale-95"
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth && onOpenAuth('organizer_key')}
              className="py-3 px-6 rounded-full bg-slate-900 hover:bg-black text-white font-extrabold text-xs shadow transition-all active:scale-95"
            >
              Canjear Clave Organizador
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth && onOpenAuth('invite')}
              className="py-3 px-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs transition-all active:scale-95"
            >
              Clave Delegado de Club
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTab && onNavigateToTab('resumen')}
              className="py-3 px-6 rounded-full border border-slate-300 hover:bg-slate-50 text-slate-700 font-extrabold text-xs transition-all active:scale-95"
            >
              Volver a Inicio
            </button>
          </div>

          <div className="pt-6 border-t border-slate-100 text-xs text-slate-400">
            ¿Necesitas contratar un campeonato para tu institución?{' '}
            <a
              href="https://wa.me/56957950579?text=Hola%20TORNOW,%20quisiera%20cotizar%20un%20torneo%20oficial"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0052fe] font-bold hover:underline"
            >
              Contactar Soporte por WhatsApp (+56957950579)
            </a>
          </div>
        </div>
      </div>
    );
  }

  const roleLabelMap: Record<UserRole, { label: string; color: string }> = {
    super_admin: { label: 'Administrador General', color: 'bg-red-50 text-red-700 border-red-200' },
    organizer: { label: 'Organizador Oficial', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    club_admin: { label: 'Delegado de Club', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    usuario: { label: 'Usuario Estándar', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  };

  const myRole = roleLabelMap[currentUser.role] || roleLabelMap.usuario;
  const myTournamentsCount = tournaments.filter((t) => t.organizerUserId === currentUser.id).length;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    const res = updateUserProfile({ fullName, email, phone });
    if (res.success) {
      setProfileSuccess(res.message);
      setTimeout(() => setProfileSuccess(''), 3000);
    } else {
      setProfileError(res.message);
    }
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas nuevas no coinciden.');
      return;
    }

    const res = changePassword(currentPassword, newPassword);
    if (res.success) {
      setPasswordSuccess(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 3000);
    } else {
      setPasswordError(res.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 animate-in fade-in duration-200">
      {/* User Header Profile Card */}
      <section className="bg-gradient-to-r from-[#081223] via-[#0b1b3a] to-[#0052fe] text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-xl font-black text-white shadow-inner flex-shrink-0">
              {currentUser.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${myRole.color} bg-white/90`}>
                  {myRole.label}
                </span>
                <span className="text-xs text-blue-200 font-mono">@{currentUser.username}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {currentUser.fullName}
              </h1>
              <p className="text-xs text-slate-300">
                {currentUser.email} {currentUser.phone ? `• Tel: ${currentUser.phone}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              logout();
              if (onNavigateToTab) onNavigateToTab('resumen');
            }}
            className="py-2.5 px-4 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 font-bold text-xs flex items-center justify-center gap-2 transition-all self-start sm:self-auto"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>

        {/* Organizer Quota Badge */}
        {currentUser.role === 'organizer' && (
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-blue-200">
            <span>
              Cupo de organización comercial: <strong className="text-white">{myTournamentsCount}</strong> de <strong className="text-white">{currentUser.tournamentQuota || 1}</strong> torneo(s) creado(s).
            </span>
            <span className="text-[10px] bg-black/40 px-2.5 py-1 rounded-full font-mono text-amber-300 border border-white/10">
              1 Torneo por Clave Comercial
            </span>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Personal Data & Security */}
        <div className="space-y-6">
          {/* Edit Profile Form */}
          <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="w-4 h-4 text-[#0052fe]" />
              <h2 className="text-sm font-extrabold text-slate-900">Datos Personales</h2>
            </div>

            {profileSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}
            {profileError && (
              <div className="p-3 bg-red-50 text-red-800 text-xs rounded-xl flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052fe]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052fe]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Teléfono Móvil</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+56 9 1234 5678"
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052fe]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-full bg-[#0052fe] hover:bg-[#0042d0] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow transition-all active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Cambios</span>
              </button>
            </form>
          </section>

          {/* Change Password Form */}
          <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Lock className="w-4 h-4 text-[#0052fe]" />
              <h2 className="text-sm font-extrabold text-slate-900">Seguridad & Contraseña</h2>
            </div>

            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}
            {passwordError && (
              <div className="p-3 bg-red-50 text-red-800 text-xs rounded-xl flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Contraseña Actual</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Tu clave actual"
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052fe]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nueva Contraseña</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052fe]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Confirmar Nueva Contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0052fe]"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-full bg-slate-900 hover:bg-black text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow transition-all active:scale-95"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Actualizar Contraseña</span>
              </button>
            </form>
          </section>
        </div>

        {/* Right Column: Sessions Cache & Preferences */}
        <div className="space-y-6">
          {/* Active Sessions Log (Cache & Registro de Sesiones) */}
          <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-[#0052fe]" />
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">Registro de Inicio de Sesiones</h2>
                  <p className="text-[11px] text-slate-500">Historial y persistencia en caché</p>
                </div>
              </div>
              {sessionHistory.length > 1 && (
                <button
                  type="button"
                  onClick={closeOtherSessions}
                  className="text-[11px] font-bold text-red-600 hover:underline"
                >
                  Cerrar otras
                </button>
              )}
            </div>

            <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-100 text-xs text-blue-900 space-y-1">
              <span className="font-extrabold flex items-center gap-1.5 text-blue-950">
                <Shield className="w-3.5 h-3.5 text-[#0052fe]" />
                Sistema de Caché Seguro Activo
              </span>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Tus credenciales están guardadas de forma segura en la caché de este navegador para que no tengas que iniciar sesión cada vez que entras a la aplicación.
              </p>
            </div>

            {/* Session Items */}
            <div className="space-y-2.5">
              {sessionHistory.length === 0 ? (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 block">Sesión Actual Activa</span>
                    <span className="text-[11px] text-slate-500">Santiago, Región Metropolitana (Chile)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                    Activa
                  </span>
                </div>
              ) : (
                sessionHistory.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                        {sess.device}
                      </span>
                      {sess.status === 'active' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          {sess.isCurrentSession ? 'Sesión Actual' : 'Activa'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">
                          Cerrada
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>{sess.ipLocation}</span>
                      <span>{sess.loginAt}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Preferences */}
          <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Volume2 className="w-4 h-4 text-[#0052fe]" />
              <h2 className="text-sm font-extrabold text-slate-900">Preferencias de la Aplicación</h2>
            </div>

            <div className="space-y-3">
              {/* Sound Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <span className="text-xs font-extrabold text-slate-900 block">Efectos de Sonido</span>
                  <span className="text-[11px] text-slate-500">Silbatos, pitos de set y alertas sonoras</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    soundEnabled ? 'bg-[#0052fe] justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <span className="bg-white w-4 h-4 rounded-full shadow-md" />
                </button>
              </div>

              {/* Push Notifications Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <span className="text-xs font-extrabold text-slate-900 block">Notificaciones del Navegador</span>
                  <span className="text-[11px] text-slate-500">Alertas de marcadores, nóminas y sistema de tu torneo</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await requestBrowserNotifications();
                  }}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                    browserNotificationsEnabled
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-[#0052fe] text-white hover:bg-[#0042d0]'
                  }`}
                >
                  {browserNotificationsEnabled ? 'Activadas' : 'Activar'}
                </button>
              </div>

              {/* Granular Tournament Notification Filters */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#0052fe]" />
                  <span className="text-xs font-extrabold text-slate-900">
                    Tópicos de Notificación (Exclusivas de tu Torneo)
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="text-slate-700 font-semibold">Alertas de Sistema y Seguridad</span>
                    <input
                      type="checkbox"
                      checked={notificationPreferences.sistema}
                      onChange={(e) => updateNotificationPreferences({ sistema: e.target.checked })}
                      className="rounded text-[#0052fe] focus:ring-[#0052fe]"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="text-slate-700 font-semibold">Actualización de Resultados y Partidos</span>
                    <input
                      type="checkbox"
                      checked={notificationPreferences.marcador}
                      onChange={(e) => updateNotificationPreferences({ marcador: e.target.checked })}
                      className="rounded text-[#0052fe] focus:ring-[#0052fe]"
                    />
                  </label>
                  {(currentUser.role === 'organizer' || currentUser.role === 'super_admin') && (
                    <label className="flex items-center justify-between text-xs cursor-pointer">
                      <span className="text-slate-700 font-semibold">Modificaciones de Nómina por Club</span>
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
                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="text-slate-700 font-semibold">Cambios de Horario y Cancha</span>
                    <input
                      type="checkbox"
                      checked={notificationPreferences.cambio_horario}
                      onChange={(e) =>
                        updateNotificationPreferences({ cambio_horario: e.target.checked })
                      }
                      className="rounded text-[#0052fe] focus:ring-[#0052fe]"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="text-slate-700 font-semibold">Comunicados Oficiales y Disciplinaria</span>
                    <input
                      type="checkbox"
                      checked={notificationPreferences.oficiales}
                      onChange={(e) =>
                        updateNotificationPreferences({ oficiales: e.target.checked })
                      }
                      className="rounded text-[#0052fe] focus:ring-[#0052fe]"
                    />
                  </label>
                </div>
              </div>

              {/* Direct WhatsApp Support */}
              <a
                href="https://wa.me/56957950579?text=Hola%20soporte%20TORNOW,%20necesito%20asistencia%20con%20mi%20cuenta"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/30 flex items-center justify-between text-xs text-slate-800 hover:bg-[#25D366]/20 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <MessageCircle className="w-5 h-5 text-[#25D366]" />
                  <div>
                    <span className="font-extrabold text-slate-900 block">Soporte Oficial por WhatsApp</span>
                    <span className="text-[11px] text-slate-600">+56 9 5795 0579</span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </a>

              {/* Direct Email Support */}
              <a
                href="mailto:tornowcl@gmail.com?subject=Soporte%20TORNOW%20-%20Consulta"
                className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-between text-xs text-slate-800 hover:bg-blue-100/60 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Mail className="w-5 h-5 text-[#0052fe]" />
                  <div>
                    <span className="font-extrabold text-slate-900 block">Correo Oficial de Soporte</span>
                    <span className="text-[11px] text-slate-600 font-mono">tornowcl@gmail.com</span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
