import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { cleanRut, formatRut, validateChileanRut } from '../utils/chileanRut';
import type { Club, Match, Player } from '../types';

export interface VenueTemplate {
  id: string;
  tournamentId?: string;
  venueName: string;
  entranceGate?: string;
  requiredFields: string[]; // e.g. ['rut', 'name', 'role', 'dorsal', 'licensePlate']
  maxAttendeesPerClub: number;
  securityRequirements?: string;
  idCheckRequired: boolean;
  notes?: string;
  createdAt: string;
  sourceType: 'ai_extracted' | 'preset' | 'manual';
}

export type VenueAttendeeRole = 'Jugador' | 'DT' | 'Asistente' | 'Kinesiólogo' | 'Delegado';

export interface VenueAttendee {
  id: string;
  name: string;
  rut: string;
  role: VenueAttendeeRole;
  dorsal?: number;
  licensePlate?: string;
  isCaptain?: boolean;
  isLibero?: boolean;
  status: 'habilitado' | 'sancionado';
}

export interface MatchVenueRoster {
  id: string; // e.g. "mvr-{matchId}-{clubId}"
  matchId: string;
  tournamentId: string;
  clubId: string;
  clubName: string;
  category: string;
  venue: string;
  matchDate: string; // YYYY-MM-DD
  matchTime: string; // HH:mm
  round: string;
  attendees: VenueAttendee[];
  status: 'draft' | 'submitted' | 'locked';
  submittedAt?: string;
  lockedAt?: string;
  updatedAt: string;
}

export type DeadlineStatusKey = 'OPEN_EARLY' | 'OPEN_FINAL_WINDOW' | 'LOCKED_FOR_VENUE' | 'PAST';

export interface DeadlineStatus {
  key: DeadlineStatusKey;
  hoursRemaining: number;
  canEdit: boolean;
  isWithin24Hours: boolean;
  isLocked12Hours: boolean;
  isPast: boolean;
  label: string;
  description: string;
  badgeBg: string;
  badgeText: string;
}

/**
 * Calculates deadline status based on match date and time:
 * - > 24h: OPEN_EARLY (Nóminas abiertas)
 * - 12h to 24h: OPEN_FINAL_WINDOW (Plazo máximo: 1 día antes, cierre inminente)
 * - < 12h: LOCKED_FOR_VENUE (Bloqueo automático para envío a recinto)
 * - <= 0h: PAST (Fecha concluida o en juego)
 */
export function calculateDeadlineStatus(
  matchDate: string,
  matchTime: string,
  nowDate: Date = new Date()
): DeadlineStatus {
  if (!matchDate) {
    return {
      key: 'OPEN_EARLY',
      hoursRemaining: 999,
      canEdit: true,
      isWithin24Hours: false,
      isLocked12Hours: false,
      isPast: false,
      label: 'Abierta para Nómina',
      description: 'Sin fecha programada definitiva.',
      badgeBg: 'bg-emerald-100 border-emerald-200',
      badgeText: 'text-emerald-800',
    };
  }

  const timeStr = matchTime && matchTime.includes(':') ? matchTime : '10:00';
  const matchDateTime = new Date(`${matchDate}T${timeStr}:00`);

  // Invalid date fallback
  if (isNaN(matchDateTime.getTime())) {
    return {
      key: 'OPEN_EARLY',
      hoursRemaining: 999,
      canEdit: true,
      isWithin24Hours: false,
      isLocked12Hours: false,
      isPast: false,
      label: 'Abierta para Nómina',
      description: 'Fecha en programación.',
      badgeBg: 'bg-emerald-100 border-emerald-200',
      badgeText: 'text-emerald-800',
    };
  }

  const diffMs = matchDateTime.getTime() - nowDate.getTime();
  const hoursRemaining = diffMs / (1000 * 60 * 60);

  if (hoursRemaining <= 0) {
    return {
      key: 'PAST',
      hoursRemaining: Math.max(0, hoursRemaining),
      canEdit: false,
      isWithin24Hours: true,
      isLocked12Hours: true,
      isPast: true,
      label: 'Partido Concluido / En Juego',
      description: 'La fecha ya comenzó o ha finalizado.',
      badgeBg: 'bg-slate-100 border-slate-300',
      badgeText: 'text-slate-600',
    };
  }

  if (hoursRemaining < 12) {
    return {
      key: 'LOCKED_FOR_VENUE',
      hoursRemaining: Number(hoursRemaining.toFixed(1)),
      canEdit: false,
      isWithin24Hours: true,
      isLocked12Hours: true,
      isPast: false,
      label: '🔒 Bloqueada para Recinto (Menos de 12h)',
      description: `Faltan ${hoursRemaining.toFixed(1)}h. Nómina sellada automáticamente para control de seguridad del recinto.`,
      badgeBg: 'bg-rose-100 border-rose-300',
      badgeText: 'text-rose-800',
    };
  }

  if (hoursRemaining <= 24) {
    return {
      key: 'OPEN_FINAL_WINDOW',
      hoursRemaining: Number(hoursRemaining.toFixed(1)),
      canEdit: true,
      isWithin24Hours: true,
      isLocked12Hours: false,
      isPast: false,
      label: '⚠️ Cierre Inminente (<24h)',
      description: `Faltan ${(hoursRemaining - 12).toFixed(1)}h para el bloqueo de seguridad de 12h. Confirma tu nómina ahora.`,
      badgeBg: 'bg-amber-100 border-amber-300',
      badgeText: 'text-amber-800',
    };
  }

  return {
    key: 'OPEN_EARLY',
    hoursRemaining: Number(hoursRemaining.toFixed(1)),
    canEdit: true,
    isWithin24Hours: false,
    isLocked12Hours: false,
    isPast: false,
    label: 'Habilitada para Carga',
    description: `Faltan ${hoursRemaining.toFixed(0)}h para el encuentro. Subir como máximo 1 día antes.`,
    badgeBg: 'bg-blue-100 border-blue-200',
    badgeText: 'text-blue-800',
  };
}

/**
 * Automatically builds a clean VenueAttendee list from a club's active roster and coaching staff.
 * Suspended/sanctioned players are automatically excluded or flagged to guarantee error-free entrance sheets.
 */
export function autoFillClubVenueRoster(
  club: Club,
  options: {
    excludeSuspended?: boolean;
    defaultLicensePlate?: string;
  } = {}
): VenueAttendee[] {
  const { excludeSuspended = true, defaultLicensePlate = '' } = options;
  const attendees: VenueAttendee[] = [];

  // 1. Staff Members (DT, Asistente, Delegado)
  if (club.staff?.headCoach && club.staff.headCoach.trim() !== '') {
    attendees.push({
      id: `staff-hc-${club.id}`,
      name: club.staff.headCoach.trim(),
      rut: 'Por confirmar',
      role: 'DT',
      status: 'habilitado',
      licensePlate: defaultLicensePlate,
    });
  }

  if (club.staff?.assistantCoach && club.staff.assistantCoach.trim() !== '') {
    attendees.push({
      id: `staff-asst-${club.id}`,
      name: club.staff.assistantCoach.trim(),
      rut: 'Por confirmar',
      role: 'Asistente',
      status: 'habilitado',
      licensePlate: defaultLicensePlate,
    });
  }

  if (club.managerName && club.managerName.trim() !== '') {
    attendees.push({
      id: `staff-del-${club.id}`,
      name: club.managerName.trim(),
      rut: 'Por confirmar',
      role: 'Delegado',
      status: 'habilitado',
      licensePlate: defaultLicensePlate,
    });
  }

  // 2. Additional Staff from members array
  if (Array.isArray(club.staff?.members)) {
    club.staff.members.forEach((m) => {
      if (m.name && m.name.trim() !== '') {
        const roleLabel =
          m.role === 'entrenador' ? 'DT' : m.role === 'asistente' ? 'Asistente' : 'Kinesiólogo';
        const formattedName = [m.name, m.paternalSurname, m.maternalSurname]
          .filter(Boolean)
          .join(' ');
        attendees.push({
          id: `staff-m-${m.id || Math.random()}`,
          name: formattedName || m.name,
          rut: m.rut ? formatRut(m.rut) : 'Por confirmar',
          role: roleLabel as VenueAttendeeRole,
          status: 'habilitado',
          licensePlate: defaultLicensePlate,
        });
      }
    });
  }

  // 3. Players from Roster
  if (Array.isArray(club.roster)) {
    club.roster.forEach((player: Player) => {
      const isSuspended = !!player.isSuspended || (player.suspendedMatchesRemaining || 0) > 0;
      if (excludeSuspended && isSuspended) {
        return; // Exclude suspended players strictly
      }

      const formattedName = [player.name, player.paternalSurname, player.maternalSurname]
        .filter(Boolean)
        .join(' ');

      const formattedRutStr = player.rut ? formatRut(player.rut) : 'Por ingresar';

      attendees.push({
        id: `ply-${player.id}`,
        name: formattedName || player.name,
        rut: formattedRutStr,
        role: 'Jugador',
        dorsal: player.dorsal,
        isCaptain: player.isCaptain,
        isLibero: player.isLibero,
        status: isSuspended ? 'sancionado' : 'habilitado',
        licensePlate: defaultLicensePlate,
      });
    });
  }

  return attendees;
}

/**
 * Validates that an attendee list meets the venue requirements:
 * - Checks that RUTs are formatted and not empty
 * - Verifies that no sanctioned/inhabilitated players are included
 * - Ensures all attendees have valid names
 */
export function validateVenueRoster(attendees: VenueAttendee[]): {
  isValid: boolean;
  errors: string[];
  sanctionedCount: number;
  totalValidAttendees: number;
} {
  const errors: string[] = [];
  let sanctionedCount = 0;
  let validCount = 0;

  if (!attendees || attendees.length === 0) {
    return {
      isValid: false,
      errors: ['La nómina no contiene asistentes registrados.'],
      sanctionedCount: 0,
      totalValidAttendees: 0,
    };
  }

  attendees.forEach((att, idx) => {
    if (!att.name || att.name.trim().length < 2) {
      errors.push(`El asistente #${idx + 1} no tiene un nombre válido.`);
    }

    if (att.status === 'sancionado') {
      sanctionedCount++;
      errors.push(`El jugador ${att.name} (#${att.dorsal || 'S/N'}) está inhabilitado por sanción disciplinaria.`);
    } else {
      validCount++;
    }

    // Verify RUT if provided and not placeholder
    if (att.rut && att.rut !== 'Por confirmar' && att.rut !== 'Por ingresar') {
      const clean = cleanRut(att.rut);
      if (clean.length >= 7) {
        const val = validateChileanRut(att.rut);
        if (!val.isValid) {
          errors.push(`RUT inválido para ${att.name}: "${att.rut}".`);
        }
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    sanctionedCount,
    totalValidAttendees: validCount,
  };
}

/**
 * Builds a direct WhatsApp message URL for reminding the club delegate to upload the venue entrance sheet.
 */
export function buildWhatsAppUrgentReminderUrl(params: {
  delegatePhone?: string;
  delegateName: string;
  clubName: string;
  tournamentName: string;
  venueName: string;
  matchDate: string;
  matchTime: string;
  hoursRemaining: number;
}): string {
  const {
    delegatePhone = '',
    delegateName,
    clubName,
    tournamentName,
    venueName,
    matchDate,
    matchTime,
    hoursRemaining,
  } = params;

  let cleanPhone = delegatePhone.replace(/\D/g, '');
  if (cleanPhone.startsWith('9') && cleanPhone.length === 9) {
    cleanPhone = `56${cleanPhone}`;
  } else if (!cleanPhone.startsWith('56') && cleanPhone.length === 8) {
    cleanPhone = `569${cleanPhone}`;
  }

  const hoursToLock = Math.max(0, hoursRemaining - 12).toFixed(1);

  const message = `🚨 *URGENTE: PLANILLA DE INGRESO A RECINTO - TORNOW* 🚨

Estimado(a) *${delegateName}* (Delegado de *${clubName}*):

Te recordamos que para el partido de *${tournamentName}* programado para el *${matchDate} a las ${matchTime}* en el recinto:
📍 *${venueName}*

Es obligatorio ingresar la nómina de ingreso oficial a través de la plataforma.
⏳ *Plazo de cierre:* A las 12 horas previas al partido las nóminas se *bloquearán automáticamente* para la generación y envío del PDF oficial a seguridad del recinto.
⚠️ *Tiempo restante para el bloqueo:* Aprox. ${hoursToLock} horas.

Por favor ingresa a TorNow a la brevedad y confirma la nómina de tu club para evitar inconvenientes en el acceso al recinto.

_Comité Organizador TorNow_`;

  return `https://wa.me/${cleanPhone || '56957950579'}?text=${encodeURIComponent(message)}`;
}

/**
 * Generates a clean, professional, formal PDF document using jsPDF for venue security personnel.
 */
export function generateVenuePdfBlob(params: {
  venueName: string;
  entranceGate?: string;
  tournamentName: string;
  category: string;
  matchDate: string;
  matchTime: string;
  round: string;
  clubsRosters: {
    clubName: string;
    attendees: VenueAttendee[];
  }[];
  organizerName?: string;
  notes?: string;
}): { doc: jsPDF; filename: string } {
  const {
    venueName,
    entranceGate = 'Acceso Peatonal Principal',
    tournamentName,
    category,
    matchDate,
    matchTime,
    round,
    clubsRosters,
    organizerName = 'Comité Organizador TorNow',
    notes,
  } = params;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 16;

  // Header Bar
  doc.setFillColor(0, 82, 254); // TorNow Blue
  doc.rect(14, currentY, pageWidth - 28, 14, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PLANILLA OFICIAL DE CONTROL DE ACCESO A RECINTO', pageWidth / 2, currentY + 6, {
    align: 'center',
  });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('DOCUMENTO EMITIDO POR PLATAFORMA DE GESTIÓN TORNOW (CHILE)', pageWidth / 2, currentY + 11, {
    align: 'center',
  });

  currentY += 20;

  // Tournament & Venue Info Block
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Competición: ${tournamentName.toUpperCase()}`, 14, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(`Categoría: ${category} | Fase: ${round}`, pageWidth - 14, currentY, { align: 'right' });

  currentY += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(`Recinto: ${venueName}`, 14, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha & Hora: ${matchDate} - ${matchTime} hrs`, pageWidth - 14, currentY, { align: 'right' });

  currentY += 5;
  doc.text(`Puerta de Acceso: ${entranceGate}`, 14, currentY);
  doc.text(`Organizador Responsable: ${organizerName}`, pageWidth - 14, currentY, { align: 'right' });

  currentY += 6;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 4;

  // Important Security Notice
  doc.setFillColor(254, 243, 199);
  doc.rect(14, currentY, pageWidth - 28, 9, 'F');
  doc.setTextColor(146, 64, 14);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(
    'AVISO DE PORTERÍA: Todo asistente debe exhibir Cédula de Identidad física vigente. Prohibido el ingreso de personas no autorizadas.',
    pageWidth / 2,
    currentY + 6,
    { align: 'center' }
  );

  currentY += 13;

  // Render Rosters for each club
  clubsRosters.forEach((clubRoster) => {
    // Check page overflow
    if (currentY > 230) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFillColor(241, 245, 249);
    doc.rect(14, currentY, pageWidth - 28, 7, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`CLUB: ${clubRoster.clubName.toUpperCase()} (Total inscritos: ${clubRoster.attendees.length})`, 18, currentY + 5);

    currentY += 9;

    // Table Header
    doc.setFillColor(226, 232, 240);
    doc.rect(14, currentY, pageWidth - 28, 6, 'F');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.text('#', 16, currentY + 4);
    doc.text('DORSAL', 22, currentY + 4);
    doc.text('NOMBRE COMPLETO', 38, currentY + 4);
    doc.text('RUT / DNI', 105, currentY + 4);
    doc.text('ROL', 140, currentY + 4);
    doc.text('FIRMA / V°B°', 170, currentY + 4);

    currentY += 6;
    doc.setFont('helvetica', 'normal');

    clubRoster.attendees.forEach((att, index) => {
      if (currentY > 275) {
        doc.addPage();
        currentY = 16;
      }

      // Zebra striping
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, currentY, pageWidth - 28, 5.5, 'F');
      }

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(7.5);
      doc.text(String(index + 1), 16, currentY + 4);
      doc.text(att.dorsal !== undefined ? `#${att.dorsal}` : '-', 22, currentY + 4);
      doc.text(att.name.slice(0, 36), 38, currentY + 4);
      doc.text(att.rut || 'Por confirmar', 105, currentY + 4);
      doc.text(att.role, 140, currentY + 4);

      // Line for signature
      doc.setDrawColor(203, 213, 225);
      doc.line(168, currentY + 4, 192, currentY + 4);

      currentY += 5.5;
    });

    currentY += 6;
  });

  // Footer notes & signatures
  if (currentY > 240) {
    doc.addPage();
    currentY = 20;
  }

  if (notes) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text(`Observaciones del Recinto: ${notes}`, 14, currentY);
    currentY += 8;
  }

  currentY += 10;
  doc.setDrawColor(148, 163, 184);
  doc.line(30, currentY, 85, currentY);
  doc.line(pageWidth - 85, currentY, pageWidth - 30, currentY);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Firma Delegado de Club', 57.5, currentY + 4, { align: 'center' });
  doc.text('Firma Encargado de Seguridad Recinto', pageWidth - 57.5, currentY + 4, { align: 'center' });

  const safeVenue = venueName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20);
  const safeDate = matchDate.replace(/[^0-9]/g, '');
  const filename = `planilla_ingreso_${safeVenue}_${safeDate}.pdf`;

  return { doc, filename };
}

/**
 * Generates an official .XLSX (Excel) workbook for venue entrance control.
 * Tailored for venues requiring digital spreadsheets for security guards and administration.
 */
export function generateVenueXlsxBlob(params: {
  venueName: string;
  entranceGate?: string;
  tournamentName: string;
  category: string;
  matchDate: string;
  matchTime: string;
  round: string;
  clubsRosters: {
    clubName: string;
    attendees: VenueAttendee[];
  }[];
  organizerName?: string;
  notes?: string;
}): { workbook: XLSX.WorkBook; blob: Blob; filename: string } {
  const {
    venueName,
    entranceGate = 'Acceso Peatonal Principal',
    tournamentName,
    category,
    matchDate,
    matchTime,
    round,
    clubsRosters,
    organizerName = 'Comité Organizador TorNow',
    notes = '',
  } = params;

  const wb = XLSX.utils.book_new();

  // Create flat list of rows for Excel
  const rows: (string | number)[][] = [
    ['PLANILLA OFICIAL DE CONTROL DE ACCESO A RECINTO - TORNOW'],
    ['Competición:', tournamentName, '', 'Categoría:', category],
    ['Recinto Deportivo:', venueName, '', 'Fase / Jornada:', round],
    ['Fecha & Horario:', `${matchDate} a las ${matchTime} hrs`, '', 'Puerta de Acceso:', entranceGate],
    ['Organizador Responsable:', organizerName, '', 'Control de Seguridad:', 'Cédula de Identidad física obligatoria'],
    ['Observaciones:', notes || 'Nómina oficial bloqueada 12 horas antes del partido.'],
    [], // Blank separator row
    [
      'N°',
      'Club',
      'Dorsal',
      'Nombre Completo',
      'RUT / DNI',
      'Rol',
      'Patente Vehículo',
      'Estado',
      'Firma / Recepción Portería',
    ],
  ];

  let counter = 1;
  clubsRosters.forEach((clubRoster) => {
    clubRoster.attendees.forEach((att) => {
      rows.push([
        counter++,
        clubRoster.clubName,
        att.dorsal !== undefined ? `#${att.dorsal}` : '-',
        att.name,
        att.rut || 'Por confirmar',
        att.role,
        att.licensePlate || '-',
        att.status === 'sancionado' ? 'SANCIONADO' : 'HABILITADO',
        '', // Space for manual physical check or digital signature
      ]);
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths for clean formatting
  ws['!cols'] = [
    { wch: 6 },  // N°
    { wch: 28 }, // Club
    { wch: 10 }, // Dorsal
    { wch: 34 }, // Nombre Completo
    { wch: 16 }, // RUT
    { wch: 14 }, // Rol
    { wch: 18 }, // Patente Vehículo
    { wch: 14 }, // Estado
    { wch: 28 }, // Firma / Recepción
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Planilla de Ingreso');

  const safeVenue = venueName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20);
  const safeDate = matchDate.replace(/[^0-9]/g, '');
  const filename = `planilla_ingreso_${safeVenue}_${safeDate}.xlsx`;

  // Write array buffer
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  return { workbook: wb, blob, filename };
}

/**
 * Cross-browser file download helper for Blobs (Excel, PDF, CSV, etc.)
 */
export function downloadBlobInBrowser(blob: Blob, filename: string) {
  if (typeof window === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Automatically populates a club's venue entrance sheet using Gemini AI
 * with seamless deterministic fallback if offline.
 */
export async function fillVenueRosterWithAi(params: {
  venueTemplate?: Partial<VenueTemplate>;
  club: Club;
  matchInfo?: {
    venue?: string;
    date?: string;
    time?: string;
    round?: string;
    category?: string;
  };
}): Promise<VenueAttendee[]> {
  const { venueTemplate = {}, club, matchInfo = {} } = params;

  try {
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      const res = await fetch('/api/gemini/fill-venue-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueTemplate,
          clubName: club.name,
          roster: club.roster,
          staff: club.staff,
          matchInfo,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.attendees) && data.attendees.length > 0) {
          return data.attendees;
        }
      }
    }
  } catch (err) {
    // Graceful fallback to deterministic roster generator
    console.warn('AI venue fill fallback to local engine:', err);
  }

  return autoFillClubVenueRoster(club, { excludeSuspended: true });
}

export function calculateDurationDays(
  unit: 'days' | 'months' | 'annual' = 'months',
  value = 1
): number {
  const safeVal = Math.max(1, Math.floor(Number(value) || 1));
  if (unit === 'days') return safeVal;
  if (unit === 'months') return safeVal * 30;
  return safeVal * 365; // 'annual'
}

export function formatKeyDurationLabel(
  unit: 'days' | 'months' | 'annual' = 'months',
  value = 1
): string {
  const safeVal = Math.max(1, Math.floor(Number(value) || 1));
  if (unit === 'days') return `${safeVal} ${safeVal === 1 ? 'Día' : 'Días'}`;
  if (unit === 'months') return `${safeVal} ${safeVal === 1 ? 'Mes' : 'Meses'} (${safeVal * 30} días)`;
  return `${safeVal} ${safeVal === 1 ? 'Año (Anual)' : 'Años'} (${safeVal * 365} días)`;
}

export interface KeyTrialCountdownResult {
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  totalHoursRemaining: number;
  totalTrialDays: number;
  isExpired: boolean;
  isBlocked: boolean;
  isPanelLockedForNonRenewal: boolean;
  graceDaysRemaining: number;
  graceHoursRemaining: number;
  shouldAutoDeleteKeyAndTournament: boolean;
  formattedCountdown: string;
  shortBadgeLabel: string;
}

/**
 * Calculates the temporary key countdown, non-renewal lock state, and 7-day grace period
 * before automatic deletion of both the Key and the Tournament.
 */
export function calculateKeyTrialCountdown(params: {
  createdAt?: string;
  expiresAt?: string;
  trialDays?: number;
  isBlocked?: boolean;
  gracePeriodStartAt?: string;
  renewalAppealSubmittedAt?: string;
  now?: Date;
}): KeyTrialCountdownResult {
  const {
    createdAt,
    expiresAt,
    trialDays = 30,
    isBlocked = false,
    gracePeriodStartAt,
    renewalAppealSubmittedAt,
    now = new Date(),
  } = params;

  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  let targetExpiryMs: number;
  if (expiresAt) {
    const parsedExp = new Date(expiresAt).getTime();
    targetExpiryMs = Number.isNaN(parsedExp)
      ? now.getTime() + trialDays * 24 * 60 * 60 * 1000
      : parsedExp;
  } else if (createdAt) {
    const parsedCreated = new Date(createdAt).getTime();
    const baseMs = Number.isNaN(parsedCreated) ? now.getTime() : parsedCreated;
    targetExpiryMs = baseMs + trialDays * 24 * 60 * 60 * 1000;
  } else {
    targetExpiryMs = now.getTime() + trialDays * 24 * 60 * 60 * 1000;
  }

  const diffMs = targetExpiryMs - now.getTime();
  const isExpired = diffMs <= 0;

  if (isBlocked || isExpired) {
    const graceStartMs = gracePeriodStartAt
      ? new Date(gracePeriodStartAt).getTime()
      : isExpired
      ? targetExpiryMs
      : now.getTime();

    const safeGraceStartMs = Number.isNaN(graceStartMs) ? now.getTime() : graceStartMs;
    const graceEndMs = safeGraceStartMs + SEVEN_DAYS_MS;
    const graceDiffMs = graceEndMs - now.getTime();

    const graceTotalMinutes = Math.max(0, Math.floor(graceDiffMs / (1000 * 60)));
    const graceDaysRemaining = Math.floor(graceTotalMinutes / (60 * 24));
    const graceHoursRemaining = Math.floor((graceTotalMinutes % (60 * 24)) / 60);

    // If 7 days have elapsed without contact/renewal, auto-delete key & tournament
    const shouldAutoDeleteKeyAndTournament = graceDiffMs <= 0 && !renewalAppealSubmittedAt;

    return {
      daysRemaining: 0,
      hoursRemaining: 0,
      minutesRemaining: 0,
      totalHoursRemaining: 0,
      totalTrialDays: trialDays,
      isExpired,
      isBlocked,
      isPanelLockedForNonRenewal: true,
      graceDaysRemaining,
      graceHoursRemaining,
      shouldAutoDeleteKeyAndTournament,
      formattedCountdown: isBlocked
        ? `Key Bloqueada (Renovación pendiente • ${graceDaysRemaining}d ${graceHoursRemaining}h para eliminación)`
        : `Key Vencida (Sin renovar • ${graceDaysRemaining}d ${graceHoursRemaining}h para eliminación)`,
      shortBadgeLabel: isBlocked ? 'Key Bloqueada' : 'Prueba vencida (0 días)',
    };
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const daysRemaining = Math.floor(totalMinutes / (60 * 24));
  const hoursRemaining = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutesRemaining = totalMinutes % 60;
  const totalHoursRemaining = Number((diffMs / (1000 * 60 * 60)).toFixed(1));

  return {
    daysRemaining,
    hoursRemaining,
    minutesRemaining,
    totalHoursRemaining,
    totalTrialDays: trialDays,
    isExpired: false,
    isBlocked: false,
    isPanelLockedForNonRenewal: false,
    graceDaysRemaining: 7,
    graceHoursRemaining: 0,
    shouldAutoDeleteKeyAndTournament: false,
    formattedCountdown: `${daysRemaining}d ${hoursRemaining}h ${minutesRemaining}m restantes`,
    shortBadgeLabel: `${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'} de prueba gratis`,
  };
}


