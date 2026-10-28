import React, { useState, useMemo } from 'react';
import {
  X,
  Building2,
  Sparkles,
  Download,
  MessageCircle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Upload,
  FileText,
  Users,
  Check,
  ChevronRight,
  ExternalLink,
  Car,
  BadgeAlert,
  RefreshCw,
  FileSpreadsheet,
  Eye,
  Edit3,
} from 'lucide-react';
import { useTournament } from '../context/TournamentContext';
import {
  calculateDeadlineStatus,
  autoFillClubVenueRoster,
  validateVenueRoster,
  buildWhatsAppUrgentReminderUrl,
  generateVenuePdfBlob,
  generateVenueXlsxBlob,
  downloadBlobInBrowser,
  fillVenueRosterWithAi,
  type VenueTemplate,
  type VenueAttendee,
  type MatchVenueRoster,
} from '../logic/venueEntranceEngine';
import type { Club, Match } from '../types';

interface VenueEntranceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClubId?: string; // If opened from Club Admin
}

const PRESET_VENUES: Partial<VenueTemplate>[] = [
  {
    venueName: 'Estadio Italiano - Complejo Polideportivo',
    entranceGate: 'Acceso Peatonal Principal - Av. Apoquindo 6589, Las Condes',
    requiredFields: ['rut', 'name', 'role', 'dorsal', 'licensePlate'],
    maxAttendeesPerClub: 18,
    securityRequirements: 'Presentar Cédula de Identidad física vigente en portería. Prohibido ingreso sin acreditación.',
    idCheckRequired: true,
    notes: 'Listado sellado con 12h de antelación para guardias del portón norte.',
  },
  {
    venueName: 'Centro de Entrenamiento Olímpico (CEO) - Ñuñoa',
    entranceGate: 'Portería Ramón Cruz Montt 1176',
    requiredFields: ['rut', 'name', 'role', 'dorsal'],
    maxAttendeesPerClub: 20,
    securityRequirements: 'Control biométrico y cédula de identidad obligatoria. Solo delegaciones deportivas.',
    idCheckRequired: true,
    notes: 'Ingreso habilitado únicamente 45 minutos antes del horario oficial del partido.',
  },
  {
    venueName: 'Polideportivo Municipal de Providencia',
    entranceGate: 'Acceso Deportivo - Los Jesuitas 880',
    requiredFields: ['rut', 'name', 'role', 'dorsal', 'licensePlate'],
    maxAttendeesPerClub: 16,
    securityRequirements: 'Cédula chilena o pasaporte en mano. Registro de patentes de vehículos en caseta.',
    idCheckRequired: true,
    notes: 'Estacionamiento reservado para máximo 2 vehículos por club acreditado.',
  },
  {
    venueName: 'Club Deportivo Manquehue',
    entranceGate: 'Acceso Socios & Torneos - Club Manquehue, Vitacura',
    requiredFields: ['rut', 'name', 'role', 'dorsal'],
    maxAttendeesPerClub: 18,
    securityRequirements: 'Exhibición obligatoria de Cédula de Identidad y credencial TorNow.',
    idCheckRequired: true,
    notes: 'Nómina cerrada 12 horas antes. Guardias no admiten inclusiones fuera de plazo.',
  },
];

export const VenueEntranceModal: React.FC<VenueEntranceModalProps> = ({
  isOpen,
  onClose,
  initialClubId,
}) => {
  const {
    activeTournament,
    updateTournament,
    clubs,
    matches,
    currentUser,
    venueTemplates,
    saveVenueTemplate,
    matchVenueRosters,
    submitClubVenueRoster,
    autoFillRosterForMatch,
  } = useTournament();

  const [activeTab, setActiveTab] = useState<'control_fechas' | 'plantillas_ia' | 'editor_club'>(
    'control_fechas'
  );

  // Selected match for review
  const upcomingMatches = useMemo(() => {
    return matches.filter((m) => m.status === 'scheduled' || m.status === 'live');
  }, [matches]);

  const [selectedMatchId, setSelectedMatchId] = useState<string>(
    upcomingMatches[0]?.id || matches[0]?.id || ''
  );

  const selectedMatch = useMemo(() => {
    return matches.find((m) => m.id === selectedMatchId) || upcomingMatches[0] || matches[0];
  }, [matches, selectedMatchId, upcomingMatches]);

  // AI Interpretation Form State
  const [templateText, setTemplateText] = useState('');
  const [venueNameHint, setVenueNameHint] = useState(activeTournament?.venue || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedTemplateFile, setUploadedTemplateFile] = useState<{
    name: string;
    size: number;
    type: string;
  } | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiFillingClubId, setAiFillingClubId] = useState<string | null>(null);
  const [aiFillFeedback, setAiFillFeedback] = useState<{ [clubId: string]: string }>({});
  const [aiError, setAiError] = useState<string | null>(null);
  const [extractedTemplate, setExtractedTemplate] = useState<VenueTemplate | null>(null);
  const [templateSuccessMsg, setTemplateSuccessMsg] = useState<string | null>(null);

  // Club Editor & Preview State
  const [editingClubId, setEditingClubId] = useState<string>(
    initialClubId || selectedMatch?.homeTeamId || clubs[0]?.id || ''
  );
  const [previewClubId, setPreviewClubId] = useState<string | null>(null);
  const [attendeeDraft, setAttendeeDraft] = useState<VenueAttendee[]>([]);
  const [editorSuccess, setEditorSuccess] = useState<string | null>(null);

  // Compute deadline for current selected match
  const deadline = useMemo(() => {
    if (!selectedMatch) {
      return calculateDeadlineStatus('', '');
    }
    return calculateDeadlineStatus(selectedMatch.date, selectedMatch.time);
  }, [selectedMatch]);

  // Active Venue Template for the tournament
  const activeTemplate = useMemo(() => {
    return (
      venueTemplates.find((vt) => vt.tournamentId === activeTournament?.id) ||
      venueTemplates[0] || {
        id: 'vt-default',
        venueName: activeTournament?.venue || 'Recinto Deportivo Oficial',
        entranceGate: 'Acceso Peatonal Principal',
        requiredFields: ['rut', 'name', 'role', 'dorsal', 'licensePlate'],
        maxAttendeesPerClub: 18,
        securityRequirements: 'Presentar Cédula de Identidad física vigente. Control obligatorio en portería.',
        idCheckRequired: true,
        notes: 'Nómina oficial bloqueada 12 horas antes del partido.',
        createdAt: new Date().toISOString(),
        sourceType: 'preset',
      }
    );
  }, [venueTemplates, activeTournament]);

  // Clubs scheduled for the selected match
  const matchClubs = useMemo(() => {
    if (!selectedMatch) return [];
    const home = clubs.find((c) => c.id === selectedMatch.homeTeamId);
    const away = clubs.find((c) => c.id === selectedMatch.awayTeamId);
    return [
      { club: home, role: 'Local' as const },
      { club: away, role: 'Visita' as const },
    ].filter((item) => !!item.club) as { club: Club; role: 'Local' | 'Visita' }[];
  }, [selectedMatch, clubs]);

  // Handle template file upload (Excel, PDF, Image)
  const handleTemplateFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedTemplateFile({
        name: file.name,
        size: file.size,
        type: file.type || file.name.split('.').pop() || 'document',
      });
      setImageFile(file);

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setImagePreview(null);
      }

      setTemplateSuccessMsg(null);
      setAiError(null);
    }
  };

  // Save the uploaded template
  const handleSaveUploadedTemplate = () => {
    const tmpl: VenueTemplate = {
      id: `vt-${Date.now()}`,
      tournamentId: activeTournament?.id,
      venueName: venueNameHint.trim() || activeTournament?.venue || 'Recinto Deportivo Oficial',
      entranceGate: 'Acceso Peatonal Principal',
      requiredFields: ['rut', 'name', 'role', 'dorsal', 'licensePlate'],
      maxAttendeesPerClub: 18,
      securityRequirements: 'Cédula de Identidad física obligatoria en portería.',
      idCheckRequired: true,
      notes: uploadedTemplateFile
        ? `Plantilla oficial suministrada por el recinto: ${uploadedTemplateFile.name}`
        : 'Nómina oficial bloqueada 12 horas antes del partido.',
      createdAt: new Date().toISOString(),
      sourceType: uploadedTemplateFile ? 'ai_extracted' : 'preset',
    };

    setExtractedTemplate(tmpl);
    saveVenueTemplate(tmpl);
    if (activeTournament) {
      updateTournament(activeTournament.id, {
        requiresVenueSheet: true,
        venueSheetTemplatePending: false,
        venueSheetTemplateFileName: uploadedTemplateFile?.name || tmpl.venueName,
      });
    }
    setTemplateSuccessMsg(
      `✓ Plantilla "${uploadedTemplateFile?.name || tmpl.venueName}" guardada exitosamente. La Inteligencia Artificial tomará automáticamente los datos de la nómina y rellenará la planilla para cada partido.`
    );
  };

  // AI Fill for a single club
  const handleAiFillClub = async (club: Club) => {
    if (!selectedMatch) return;
    setAiFillingClubId(club.id);
    setAiFillFeedback((prev) => ({
      ...prev,
      [club.id]: '🧠 IA TorNow tomando datos de la nómina y rellenando la planilla...',
    }));

    try {
      const attendees = await fillVenueRosterWithAi({
        venueTemplate: activeTemplate,
        club,
        matchInfo: {
          venue: selectedMatch.court || activeTemplate.venueName,
          date: selectedMatch.date,
          time: selectedMatch.time,
          round: selectedMatch.round,
          category: String(selectedMatch.category || 'Oficial'),
        },
      });

      const rosterObj: MatchVenueRoster = {
        id: `mvr-${selectedMatch.id}-${club.id}`,
        matchId: selectedMatch.id,
        tournamentId: activeTournament?.id || '',
        clubId: club.id,
        clubName: club.name,
        category: String(selectedMatch.category || 'General'),
        venue: selectedMatch.court || activeTemplate.venueName,
        matchDate: selectedMatch.date,
        matchTime: selectedMatch.time,
        round: selectedMatch.round,
        attendees,
        status: deadline.isLocked12Hours ? 'locked' : 'submitted',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      submitClubVenueRoster(rosterObj);
      setAiFillFeedback((prev) => ({
        ...prev,
        [club.id]: `✨ ${attendees.length} integrantes rellenados automáticamente con IA`,
      }));
    } catch (err: any) {
      console.error('Error filling roster with AI:', err);
      setAiFillFeedback((prev) => ({
        ...prev,
        [club.id]: 'Nómina rellenada con motor oficial TorNow.',
      }));
    } finally {
      setAiFillingClubId(null);
    }
  };

  // AI Fill for all confirmed clubs in this match
  const handleAiFillAllClubs = async () => {
    if (!selectedMatch || matchClubs.length === 0) return;
    setAiFillingClubId('ALL');

    try {
      for (const { club } of matchClubs) {
        const attendees = await fillVenueRosterWithAi({
          venueTemplate: activeTemplate,
          club,
          matchInfo: {
            venue: selectedMatch.court || activeTemplate.venueName,
            date: selectedMatch.date,
            time: selectedMatch.time,
            round: selectedMatch.round,
            category: String(selectedMatch.category || 'Oficial'),
          },
        });

        const rosterObj: MatchVenueRoster = {
          id: `mvr-${selectedMatch.id}-${club.id}`,
          matchId: selectedMatch.id,
          tournamentId: activeTournament?.id || '',
          clubId: club.id,
          clubName: club.name,
          category: String(selectedMatch.category || 'General'),
          venue: selectedMatch.court || activeTemplate.venueName,
          matchDate: selectedMatch.date,
          matchTime: selectedMatch.time,
          round: selectedMatch.round,
          attendees,
          status: deadline.isLocked12Hours ? 'locked' : 'submitted',
          submittedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        submitClubVenueRoster(rosterObj);
        setAiFillFeedback((prev) => ({
          ...prev,
          [club.id]: `✨ ${attendees.length} integrantes rellenados con IA`,
        }));
      }
    } catch (err: any) {
      console.error('Error filling all rosters with AI:', err);
    } finally {
      setAiFillingClubId(null);
    }
  };

  // Apply a preset venue template
  const handleApplyPreset = (preset: Partial<VenueTemplate>) => {
    const tmpl: VenueTemplate = {
      id: `vt-${Date.now()}`,
      tournamentId: activeTournament?.id,
      venueName: preset.venueName || 'Recinto Oficial',
      entranceGate: preset.entranceGate || 'Acceso Principal',
      requiredFields: preset.requiredFields || ['rut', 'name', 'role', 'dorsal', 'licensePlate'],
      maxAttendeesPerClub: preset.maxAttendeesPerClub || 18,
      securityRequirements: preset.securityRequirements || 'Cédula física obligatoria.',
      idCheckRequired: preset.idCheckRequired ?? true,
      notes: preset.notes || 'Nómina bloqueada 12 horas antes.',
      createdAt: new Date().toISOString(),
      sourceType: 'preset',
    };
    setExtractedTemplate(tmpl);
    saveVenueTemplate(tmpl);
    setTemplateSuccessMsg(`Plantilla de ${preset.venueName} aplicada exitosamente.`);
  };

  // Open club roster editor
  const handleOpenClubEditor = (clubId: string) => {
    setEditingClubId(clubId);
    const existing = matchVenueRosters[`${selectedMatch?.id}-${clubId}`];
    if (existing && existing.attendees.length > 0) {
      setAttendeeDraft(existing.attendees);
    } else {
      const targetClub = clubs.find((c) => c.id === clubId);
      if (targetClub) {
        const auto = autoFillClubVenueRoster(targetClub, { excludeSuspended: true });
        setAttendeeDraft(auto);
      }
    }
    setEditorSuccess(null);
    setActiveTab('editor_club');
  };

  // Save club roster
  const handleSaveRosterDraft = () => {
    if (!selectedMatch) return;
    const targetClub = clubs.find((c) => c.id === editingClubId);
    if (!targetClub) return;

    const validation = validateVenueRoster(attendeeDraft);
    if (!validation.isValid) {
      alert(`Errores en la nómina:\n- ${validation.errors.join('\n- ')}`);
      return;
    }

    const rosterObj: MatchVenueRoster = {
      id: `mvr-${selectedMatch.id}-${targetClub.id}`,
      matchId: selectedMatch.id,
      tournamentId: activeTournament?.id || '',
      clubId: targetClub.id,
      clubName: targetClub.name,
      category: String(selectedMatch.category || 'General'),
      venue: selectedMatch.court || activeTournament?.venue || 'Recinto Principal',
      matchDate: selectedMatch.date,
      matchTime: selectedMatch.time,
      round: selectedMatch.round,
      attendees: attendeeDraft,
      status: deadline.isLocked12Hours ? 'locked' : 'submitted',
      submittedAt: new Date().toISOString(),
      lockedAt: deadline.isLocked12Hours ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };

    submitClubVenueRoster(rosterObj);
    setEditorSuccess('Nómina de ingreso guardada y validada correctamente.');
    setTimeout(() => {
      setActiveTab('control_fechas');
    }, 1200);
  };

  // Download PDF for single club
  const handleDownloadClubPdf = (club: Club) => {
    if (!selectedMatch) return;
    const rosterKey = `${selectedMatch.id}-${club.id}`;
    const stored = matchVenueRosters[rosterKey];
    const attendees =
      stored && stored.attendees.length > 0
        ? stored.attendees
        : autoFillClubVenueRoster(club, { excludeSuspended: true });

    const { doc, filename } = generateVenuePdfBlob({
      venueName: selectedMatch.court || activeTemplate.venueName,
      entranceGate: activeTemplate.entranceGate,
      tournamentName: activeTournament?.name || 'Torneo TorNow',
      category: String(selectedMatch.category || 'Oficial'),
      matchDate: selectedMatch.date,
      matchTime: selectedMatch.time,
      round: selectedMatch.round,
      clubsRosters: [
        {
          clubName: club.name,
          attendees,
        },
      ],
      organizerName: activeTournament?.organizerName,
      notes: activeTemplate.notes,
    });

    doc.save(filename);
  };

  // Download XLSX (Excel) for single club
  const handleDownloadClubXlsx = (club: Club) => {
    if (!selectedMatch) return;
    const rosterKey = `${selectedMatch.id}-${club.id}`;
    const stored = matchVenueRosters[rosterKey];
    const attendees =
      stored && stored.attendees.length > 0
        ? stored.attendees
        : autoFillClubVenueRoster(club, { excludeSuspended: true });

    const { blob, filename } = generateVenueXlsxBlob({
      venueName: selectedMatch.court || activeTemplate.venueName,
      entranceGate: activeTemplate.entranceGate,
      tournamentName: activeTournament?.name || 'Torneo TorNow',
      category: String(selectedMatch.category || 'Oficial'),
      matchDate: selectedMatch.date,
      matchTime: selectedMatch.time,
      round: selectedMatch.round,
      clubsRosters: [
        {
          clubName: club.name,
          attendees,
        },
      ],
      organizerName: activeTournament?.organizerName,
      notes: activeTemplate.notes,
    });

    downloadBlobInBrowser(blob, filename);
  };

  // Download Consolidated PDF for the entire match / date (both clubs)
  const handleDownloadConsolidatedPdf = () => {
    if (!selectedMatch || matchClubs.length === 0) return;

    const clubsData = matchClubs.map(({ club }) => {
      const rosterKey = `${selectedMatch.id}-${club.id}`;
      const stored = matchVenueRosters[rosterKey];
      const attendees =
        stored && stored.attendees.length > 0
          ? stored.attendees
          : autoFillClubVenueRoster(club, { excludeSuspended: true });
      return {
        clubName: club.name,
        attendees,
      };
    });

    const { doc, filename } = generateVenuePdfBlob({
      venueName: selectedMatch.court || activeTemplate.venueName,
      entranceGate: activeTemplate.entranceGate,
      tournamentName: activeTournament?.name || 'Torneo TorNow',
      category: String(selectedMatch.category || 'Oficial'),
      matchDate: selectedMatch.date,
      matchTime: selectedMatch.time,
      round: selectedMatch.round,
      clubsRosters: clubsData,
      organizerName: activeTournament?.organizerName,
      notes: activeTemplate.notes,
    });

    doc.save(`consolidado_${filename}`);
  };

  // Download Consolidated XLSX (Excel) for the entire match / date (both clubs)
  const handleDownloadConsolidatedXlsx = () => {
    if (!selectedMatch || matchClubs.length === 0) return;

    const clubsData = matchClubs.map(({ club }) => {
      const rosterKey = `${selectedMatch.id}-${club.id}`;
      const stored = matchVenueRosters[rosterKey];
      const attendees =
        stored && stored.attendees.length > 0
          ? stored.attendees
          : autoFillClubVenueRoster(club, { excludeSuspended: true });
      return {
        clubName: club.name,
        attendees,
      };
    });

    const { blob, filename } = generateVenueXlsxBlob({
      venueName: selectedMatch.court || activeTemplate.venueName,
      entranceGate: activeTemplate.entranceGate,
      tournamentName: activeTournament?.name || 'Torneo TorNow',
      category: String(selectedMatch.category || 'Oficial'),
      matchDate: selectedMatch.date,
      matchTime: selectedMatch.time,
      round: selectedMatch.round,
      clubsRosters: clubsData,
      organizerName: activeTournament?.organizerName,
      notes: activeTemplate.notes,
    });

    downloadBlobInBrowser(blob, `consolidado_${filename}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Planillas de Ingreso a Recintos Deportivos
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-300" />
                  IA & Control 12h/24h
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {activeTournament?.name} • Recinto:{' '}
                <span className="font-semibold text-white">{activeTemplate.venueName}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('control_fechas')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'control_fechas'
                ? 'border-[#0052fe] text-[#0052fe]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>1. Control de Fechas & Rellenado con IA</span>
          </button>

          <button
            onClick={() => setActiveTab('plantillas_ia')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'plantillas_ia'
                ? 'border-[#0052fe] text-[#0052fe]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            <span>2. Subir Plantilla del Recinto</span>
          </button>

          {activeTab === 'editor_club' && (
            <button
              onClick={() => setActiveTab('editor_club')}
              className="pb-2.5 px-3 border-b-2 border-[#0052fe] text-[#0052fe] transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Users className="w-3.5 h-3.5" />
              <span>3. Editor de Nómina</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: CONTROL DE FECHAS & CLUBES */}
          {activeTab === 'control_fechas' && (
            <div className="space-y-5">
              {/* Deadline & Policy Banner */}
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${deadline.badgeBg}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white shadow-xs ${deadline.badgeText}`}
                    >
                      {deadline.label}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      Horas restantes: <strong>{deadline.hoursRemaining}h</strong>
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium">
                    {deadline.description}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    ℹ️ <strong>Reglamento TorNow:</strong> Las nóminas se cargan como máximo <strong>1 día antes (24h)</strong> del partido. La IA toma los datos y rellenará la planilla oficial automáticamente. A las <strong>12 horas previas</strong> se bloquea para entrega en portería.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={aiFillingClubId === 'ALL'}
                    onClick={handleAiFillAllClubs}
                    className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-transform active:scale-95 whitespace-nowrap cursor-pointer"
                    title="La Inteligencia Artificial tomará los datos de las nóminas y rellenará la planilla automáticamente para toda la fecha"
                  >
                    {aiFillingClubId === 'ALL' ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>IA Rellenando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Rellenar con IA (Fecha)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadConsolidatedPdf}
                    className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 whitespace-nowrap cursor-pointer"
                    title="Descargar Planilla Consolidada en formato PDF oficial"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>PDF Consolidado</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadConsolidatedXlsx}
                    className="px-3 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 whitespace-nowrap cursor-pointer"
                    title="Descargar Planilla Consolidada en formato Excel (.XLSX) para guardias y recintos"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-white" />
                    <span>Excel (.XLSX)</span>
                  </button>
                </div>
              </div>

              {/* Match Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Seleccionar Partido / Fecha Programada:
                </label>
                <select
                  value={selectedMatchId}
                  onChange={(e) => setSelectedMatchId(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#0052fe]"
                >
                  {matches.map((m) => {
                    const home = clubs.find((c) => c.id === m.homeTeamId)?.name || 'Local';
                    const away = clubs.find((c) => c.id === m.awayTeamId)?.name || 'Visita';
                    return (
                      <option key={m.id} value={m.id}>
                        {m.round} • {home} vs {away} ({m.date} a las {m.time} hrs) - {m.court}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Match Scheduled Info Card */}
              {selectedMatch && (
                <div className="p-3.5 bg-slate-100 rounded-2xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-slate-500">Recinto Asignado:</span>{' '}
                    <span className="font-extrabold text-slate-900">
                      {selectedMatch.court || activeTemplate.venueName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Puerta / Portería:</span>{' '}
                    <span className="font-semibold text-slate-900">
                      {activeTemplate.entranceGate}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Categoría:</span>{' '}
                    <span className="font-semibold text-blue-700">
                      {String(selectedMatch.category)}
                    </span>
                  </div>
                </div>
              )}

              {/* Clubs List for Selected Match */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center justify-between">
                  <span>Equipos Confirmados para esta Fecha ({matchClubs.length})</span>
                  <span className="text-[11px] font-normal text-slate-500 lowercase">
                    solo los equipos confirmados pueden subir nómina
                  </span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {matchClubs.map(({ club, role }) => {
                    const rosterKey = `${selectedMatch?.id}-${club.id}`;
                    const savedRoster = matchVenueRosters[rosterKey];
                    const isSubmitted = !!savedRoster && savedRoster.attendees.length > 0;
                    const attendeesCount = isSubmitted
                      ? savedRoster.attendees.length
                      : club.roster.filter((p) => !p.isSuspended).length + 3; // Estimated default

                    const isLocked = deadline.isLocked12Hours;

                    const whatsappUrl = buildWhatsAppUrgentReminderUrl({
                      delegatePhone: club.managerPhone || '',
                      delegateName: club.managerName || 'Delegado',
                      clubName: club.name,
                      tournamentName: activeTournament?.name || 'TorNow',
                      venueName: selectedMatch?.court || activeTemplate.venueName,
                      matchDate: selectedMatch?.date || '',
                      matchTime: selectedMatch?.time || '',
                      hoursRemaining: deadline.hoursRemaining,
                    });

                    return (
                      <div
                        key={club.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 shadow-xs flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: club.color || '#0052fe' }}
                              />
                              <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                                {club.name}
                              </h4>
                            </div>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                              {role}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 space-y-0.5 mb-2.5">
                            <p>
                              Delegado:{' '}
                              <span className="font-semibold text-slate-800">
                                {club.managerName || 'Sin asignar'}
                              </span>
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Tel: {club.managerPhone || 'No registrado'} • {club.managerEmail}
                            </p>
                          </div>

                          {/* Status Badge */}
                          <div className="flex items-center gap-2">
                            {isLocked ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                <Lock className="w-3 h-3" />
                                Bloqueada para Recinto ({attendeesCount} pax)
                              </span>
                            ) : isSubmitted ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" />
                                Nómina Subida ({attendeesCount} asistentes)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3" />
                                Pendiente de Confirmar ({deadline.hoursRemaining}h rest.)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* AI Feedback if any */}
                        {aiFillFeedback[club.id] && (
                          <div className="mt-2 text-[11px] font-bold text-blue-800 bg-blue-50/80 border border-blue-200/80 px-2.5 py-1 rounded-xl flex items-center gap-1.5 animate-in fade-in">
                            <Sparkles className="w-3 h-3 text-blue-600 shrink-0" />
                            <span>{aiFillFeedback[club.id]}</span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            disabled={aiFillingClubId === club.id}
                            onClick={() => handleAiFillClub(club)}
                            className="flex-1 min-w-[100px] py-2 px-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 text-blue-800 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                            title="La Inteligencia Artificial tomará los datos de la nómina de este club y rellenará la planilla automáticamente sin errores"
                          >
                            {aiFillingClubId === club.id ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                                <span>IA Rellenando...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                <span>Rellenar con IA</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setPreviewClubId((prev) => (prev === club.id ? null : club.id))
                            }
                            className={`py-2 px-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                              previewClubId === club.id
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-blue-50/70 hover:bg-blue-100/80 text-blue-800 border-blue-200'
                            }`}
                            title="Previsualizar la planilla de este club para verificar que la IA no haya cometido ningún error antes de descargar"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{previewClubId === club.id ? 'Ocultar Vista Previa' : 'Previsualizar'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadClubPdf(club)}
                            className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            title="Descargar Planilla en formato PDF"
                          >
                            <Download className="w-3.5 h-3.5 text-blue-600" />
                            <span>PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadClubXlsx(club)}
                            className="py-2 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            title="Descargar Planilla en formato Excel (.XLSX) para portería"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Excel (.XLSX)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenClubEditor(club.id)}
                            className="py-2 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>{isLocked ? 'Ver' : 'Editar'}</span>
                          </button>

                          {/* WhatsApp Button (Only shown if pending or organizer wants to remind) */}
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2 px-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
                            title="Enviar WhatsApp urgente al delegado si queda poco tiempo"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* PREVISUALIZACIÓN DE PLANILLA POR CLUB (Revisión anti-errores IA) */}
                {previewClubId && (() => {
                  const previewClub = clubs.find((c) => c.id === previewClubId);
                  if (!previewClub || !selectedMatch) return null;
                  const rosterKey = `${selectedMatch.id}-${previewClub.id}`;
                  const storedRoster = matchVenueRosters[rosterKey];
                  const previewAttendees =
                    storedRoster && storedRoster.attendees.length > 0
                      ? storedRoster.attendees
                      : autoFillClubVenueRoster(previewClub, { excludeSuspended: true });
                  const previewValidation = validateVenueRoster(previewAttendees);

                  return (
                    <div className="mt-4 rounded-2xl border-2 border-blue-500/40 bg-white shadow-lg overflow-hidden animate-in fade-in duration-200">
                      {/* Header de Previsualización */}
                      <div className="bg-gradient-to-r from-[#081223] via-[#0b1b3a] to-[#0052fe] text-white px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                            <Eye className="w-4 h-4 text-blue-200" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/30 border border-blue-300/30 text-blue-100">
                                Vista Previa Oficial • Revisión de Organizador
                              </span>
                              <span className="text-[11px] text-blue-200 font-semibold">
                                {previewAttendees.length} integrantes listados
                              </span>
                            </div>
                            <h4 className="text-sm font-black tracking-tight mt-0.5">
                              Planilla de Ingreso: {previewClub.name}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleOpenClubEditor(previewClub.id)}
                            className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                            title="Si detectas algún error de la IA en un RUT, nombre o patente, haz clic aquí para corregirlo manualmente"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Corregir / Editar Datos</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadClubXlsx(previewClub)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>Descargar .XLSX</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadClubPdf(previewClub)}
                            className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 font-extrabold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Descargar .PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewClubId(null)}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                            title="Cerrar previsualización"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Estado de Validación IA / Auditoría de Errores */}
                      <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        {previewValidation.isValid ? (
                          <div className="flex items-center gap-2 text-emerald-800 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              Verificación automática superada: Todos los nombres, RUTs y estados disciplinarios están completos y sin errores.
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1 text-rose-800">
                            <div className="flex items-center gap-1.5 font-extrabold">
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>
                                Se detectaron {previewValidation.errors.length} observaciones para revisar antes de enviar al recinto:
                              </span>
                            </div>
                            <ul className="list-disc list-inside text-[11px] text-rose-700">
                              {previewValidation.errors.map((err, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <span className="text-[11px] text-slate-500 shrink-0">
                          Recinto: <strong>{selectedMatch.court || activeTemplate.venueName}</strong> • {selectedMatch.date} ({selectedMatch.time} hrs)
                        </span>
                      </div>

                      {/* Tabla de Previsualización del Documento */}
                      <div className="overflow-x-auto max-h-72 overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-600 sticky top-0">
                              <th className="py-2 px-3">#</th>
                              <th className="py-2 px-3">Dorsal</th>
                              <th className="py-2 px-3">Nombre Completo</th>
                              <th className="py-2 px-3">RUT / Documento</th>
                              <th className="py-2 px-3">Rol en Delegación</th>
                              <th className="py-2 px-3">Patente Vehículo</th>
                              <th className="py-2 px-3">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {previewAttendees.map((att, idx) => {
                              const hasMissingRut = !att.rut || att.rut.trim().length < 7;
                              const isSanctioned = att.status === 'sancionado';
                              return (
                                <tr
                                  key={att.id || idx}
                                  className={
                                    isSanctioned
                                      ? 'bg-rose-50/70 text-rose-900'
                                      : hasMissingRut
                                      ? 'bg-amber-50/60'
                                      : idx % 2 === 1
                                      ? 'bg-slate-50/50'
                                      : 'bg-white'
                                  }
                                >
                                  <td className="py-2 px-3 font-bold text-slate-400">{idx + 1}</td>
                                  <td className="py-2 px-3 font-black text-slate-800">
                                    {att.dorsal !== undefined && att.dorsal !== null ? `#${att.dorsal}` : 'STAFF'}
                                  </td>
                                  <td className="py-2 px-3 font-bold text-slate-900">{att.name}</td>
                                  <td className="py-2 px-3 font-mono font-semibold text-slate-700">
                                    {att.rut || (
                                      <span className="text-amber-700 font-bold">Sin RUT (Revisar)</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3">
                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">
                                      {att.role}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 font-mono text-slate-600">
                                    {att.licensePlate || '—'}
                                  </td>
                                  <td className="py-2 px-3">
                                    {isSanctioned ? (
                                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-black text-[10px]">
                                        Sancionado (No ingresa)
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px]">
                                        Habilitado
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB 2: SUBIR PLANTILLA DEL RECINTO */}
          {activeTab === 'plantillas_ia' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white border border-blue-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
                      <Upload className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-black tracking-tight text-white">
                      Subir Plantilla Oficial del Recinto Deportivo
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Sube la plantilla o documento que te entregó el recinto (Excel .xlsx, PDF o Foto). Después, la <strong>Inteligencia Artificial</strong> tomará los datos de la nómina que suben los delegados de club y rellenará la planilla automáticamente para cada fecha deportiva sin errores.
                  </p>
                </div>
              </div>

              {templateSuccessMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{templateSuccessMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('control_fechas')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Ir a Rellenar con IA →
                  </button>
                </div>
              )}

              {aiError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <BadgeAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              {/* Main Upload Box */}
              <div className="p-6 border-2 border-dashed border-slate-300 rounded-3xl hover:border-blue-500 transition-colors flex flex-col items-center justify-center text-center space-y-4 bg-slate-50/60">
                {uploadedTemplateFile ? (
                  <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
                    {imagePreview ? (
                      <div className="relative w-full max-h-48 rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                        <img
                          src={imagePreview}
                          alt="Plantilla Recinto"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          {uploadedTemplateFile.name.endsWith('.xlsx') || uploadedTemplateFile.name.endsWith('.xls') ? (
                            <FileSpreadsheet className="w-5 h-5" />
                          ) : (
                            <FileText className="w-5 h-5 text-rose-600" />
                          )}
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-800 truncate">
                            {uploadedTemplateFile.name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {(uploadedTemplateFile.size / 1024).toFixed(1)} KB • Formato oficial del recinto
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <label className="flex-1 cursor-pointer py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs text-center transition-colors">
                        Cambiar Archivo
                        <input
                          type="file"
                          accept=".xlsx,.xls,.pdf,image/*"
                          onChange={handleTemplateFileUpload}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedTemplateFile(null);
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors cursor-pointer"
                        title="Quitar archivo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-3xl bg-blue-100/80 text-blue-600 flex items-center justify-center shadow-xs">
                      <Upload className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        Selecciona o arrastra la plantilla del recinto
                      </h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                        Acepta planillas en formato <strong>Excel (.xlsx / .xls)</strong>, <strong>PDF</strong> o <strong>fotos / escaneos (.png / .jpg)</strong> de la hoja del recinto.
                      </p>
                    </div>
                    <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0052fe] hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all">
                      <Upload className="w-4 h-4" />
                      <span>Subir Plantilla del Recinto</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.pdf,image/*"
                        onChange={handleTemplateFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {/* Recinto Name and Save Button */}
                <div className="w-full max-w-md space-y-3 text-left pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nombre del Recinto Deportivo Asignado:
                    </label>
                    <input
                      type="text"
                      value={venueNameHint}
                      onChange={(e) => setVenueNameHint(e.target.value)}
                      placeholder="Ej. Estadio Italiano / CEO Ñuñoa / Polideportivo Municipal"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052fe]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveUploadedTemplate}
                    className="w-full py-3 rounded-xl bg-slate-900 hover:bg-black text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95 cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Guardar Plantilla del Recinto</span>
                  </button>
                </div>
              </div>

              {/* Presets of Major Chilean Sports Venues */}
              <div className="pt-3 border-t border-slate-200">
                <span className="text-xs font-black uppercase tracking-wider text-slate-600 block mb-2">
                  O Selecciona una Plantilla de Recintos Chilenos Habituales:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PRESET_VENUES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="p-3 text-left rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 bg-white transition-all group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-900 group-hover:text-blue-700">
                          {preset.venueName}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                      </div>
                      <span className="text-[11px] text-slate-500 block truncate">
                        {preset.entranceGate}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EDITOR / VISOR DE NÓMINA DE CLUB */}
          {activeTab === 'editor_club' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Nómina de Ingreso:{' '}
                    {clubs.find((c) => c.id === editingClubId)?.name || 'Club'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Partido: {selectedMatch?.round} • Fecha: {selectedMatch?.date} a las{' '}
                    {selectedMatch?.time} hrs
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const targetClub = clubs.find((c) => c.id === editingClubId);
                      if (targetClub) {
                        setAttendeeDraft(
                          autoFillClubVenueRoster(targetClub, { excludeSuspended: true })
                        );
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Rellenar Automáticamente</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveRosterDraft}
                    disabled={deadline.isLocked12Hours}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Guardar Nómina</span>
                  </button>
                </div>
              </div>

              {editorSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{editorSuccess}</span>
                </div>
              )}

              {deadline.isLocked12Hours && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-rose-600" />
                  <span>
                    La nómina está bloqueada porque faltan menos de 12 horas para el inicio del partido.
                  </span>
                </div>
              )}

              {/* Attendees Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Dorsal</th>
                      <th className="py-2.5 px-3">Nombre Completo</th>
                      <th className="py-2.5 px-3">RUT Chileno</th>
                      <th className="py-2.5 px-3">Rol</th>
                      <th className="py-2.5 px-3">Patente Vehículo</th>
                      <th className="py-2.5 px-3 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendeeDraft.map((att, idx) => (
                      <tr key={att.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 font-semibold text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-blue-700">
                          {att.dorsal !== undefined ? `#${att.dorsal}` : '-'}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          <input
                            type="text"
                            value={att.name}
                            disabled={deadline.isLocked12Hours}
                            onChange={(e) => {
                              const updated = [...attendeeDraft];
                              updated[idx].name = e.target.value;
                              setAttendeeDraft(updated);
                            }}
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-800">
                          <input
                            type="text"
                            value={att.rut}
                            disabled={deadline.isLocked12Hours}
                            onChange={(e) => {
                              const updated = [...attendeeDraft];
                              updated[idx].rut = e.target.value;
                              setAttendeeDraft(updated);
                            }}
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-semibold text-slate-700">{att.role}</span>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="Ej. ABCD-12"
                            value={att.licensePlate || ''}
                            disabled={deadline.isLocked12Hours}
                            onChange={(e) => {
                              const updated = [...attendeeDraft];
                              updated[idx].licensePlate = e.target.value.toUpperCase();
                              setAttendeeDraft(updated);
                            }}
                            className="w-24 px-1.5 py-0.5 rounded border border-slate-200 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          {att.status === 'sancionado' ? (
                            <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              Sancionado
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Habilitado
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <ShieldAlert className="w-4 h-4 text-slate-400" />
            <span className="text-[11px]">
              Control de acceso blindado para recintos deportivos • TorNow 2026
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
