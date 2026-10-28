import { PlayerSanction, DelegateMessage, Player } from '../types';

export interface CreateSanctionInput {
  tournamentId: string;
  clubId: string;
  clubName: string;
  player: Pick<Player, 'id' | 'name' | 'paternalSurname' | 'maternalSurname' | 'dorsal'>;
  reason: string;
  matchesSuspended: number;
  issuedBy?: string;
}

export interface SanctionValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates sanction creation inputs before issuing a disciplinary suspension.
 */
export function validateSanctionInput(input: {
  clubId?: string;
  playerId?: string;
  reason: string;
  matchesSuspended: number;
}): SanctionValidationResult {
  if (!input.clubId) {
    return { isValid: false, error: 'Selecciona el club al que pertenece el jugador.' };
  }
  if (!input.playerId) {
    return { isValid: false, error: 'Selecciona el jugador que recibirá la sanción.' };
  }
  const cleanReason = input.reason.trim();
  if (cleanReason.length < 5) {
    return { isValid: false, error: 'Ingresa el detalle o motivo reglamentario de la sanción (mínimo 5 caracteres).' };
  }
  if (!Number.isInteger(input.matchesSuspended) || input.matchesSuspended < 1 || input.matchesSuspended > 50) {
    return { isValid: false, error: 'La cantidad de fechas de suspensión debe ser entre 1 y 50.' };
  }
  return { isValid: true };
}

/**
 * Builds a formal PlayerSanction record and returns the updated player state with suspension flags.
 */
export function buildPlayerSanction(
  input: CreateSanctionInput,
  customId?: string,
  nowIso?: string
): {
  sanction: PlayerSanction;
  playerPatch: Pick<Player, 'isSuspended' | 'suspendedMatchesRemaining' | 'sanctionReason'>;
} {
  const fullName = [input.player.name, input.player.paternalSurname, input.player.maternalSurname]
    .filter(Boolean)
    .join(' ')
    .trim();

  const sanction: PlayerSanction = {
    id: customId || `sanc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tournamentId: input.tournamentId,
    clubId: input.clubId,
    clubName: input.clubName,
    playerId: input.player.id,
    playerName: fullName,
    playerDorsal: input.player.dorsal,
    reason: input.reason.trim(),
    matchesSuspended: input.matchesSuspended,
    matchesServed: 0,
    status: 'active',
    issuedBy: (input.issuedBy || 'Comité Organizador').trim(),
    createdAt: nowIso || new Date().toISOString(),
  };

  return {
    sanction,
    playerPatch: {
      isSuspended: true,
      suspendedMatchesRemaining: input.matchesSuspended,
      sanctionReason: input.reason.trim(),
    },
  };
}

/**
 * Processes a delegate's appeal for an active sanction if the organizer allows appeals.
 */
export function createSanctionAppeal(params: {
  sanction: PlayerSanction;
  allowAppeals: boolean;
  appealText: string;
  senderName: string;
  customMessageId?: string;
  nowIso?: string;
}): {
  ok: boolean;
  error?: string;
  updatedSanction?: PlayerSanction;
  inboxMessage?: DelegateMessage;
} {
  if (!params.allowAppeals) {
    return {
      ok: false,
      error: 'El Comité Organizador ha desactivado la recepción de apelaciones en este torneo.',
    };
  }

  const trimmedAppeal = params.appealText.trim();
  if (trimmedAppeal.length < 8) {
    return {
      ok: false,
      error: 'El fundamento de la apelación debe contener al menos 8 caracteres.',
    };
  }

  if (params.sanction.status === 'revoked' || params.sanction.status === 'resolved') {
    return {
      ok: false,
      error: 'Esta sanción ya fue resuelta o revocada.',
    };
  }

  const timestamp = params.nowIso || new Date().toISOString();

  const updatedSanction: PlayerSanction = {
    ...params.sanction,
    status: 'appealed',
    appealText: trimmedAppeal,
    appealDate: timestamp,
  };

  const inboxMessage: DelegateMessage = {
    id: params.customMessageId || `msg-ap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tournamentId: params.sanction.tournamentId,
    clubId: params.sanction.clubId,
    clubName: params.sanction.clubName,
    senderName: params.senderName.trim() || `Delegado ${params.sanction.clubName}`,
    type: 'apelacion',
    subject: `Apelación Sanción: #${params.sanction.playerDorsal} ${params.sanction.playerName} (${params.sanction.matchesSuspended} fecha/s)`,
    content: trimmedAppeal,
    sanctionId: params.sanction.id,
    status: 'pending',
    createdAt: timestamp,
  };

  return {
    ok: true,
    updatedSanction,
    inboxMessage,
  };
}

/**
 * Resolves an appeal or inbox message from the organizer's inbox.
 * If an appeal is 'approved', the sanction is revoked and the player is re-enabled.
 */
export function resolveOrganizerInboxMessage(params: {
  message: DelegateMessage;
  decision: 'approved' | 'rejected' | 'replied';
  replyText: string;
  sanctions: PlayerSanction[];
}): {
  updatedMessage: DelegateMessage;
  updatedSanctions: PlayerSanction[];
  reEnabledPlayerId?: string;
} {
  const cleanReply =
    params.replyText.trim() ||
    (params.decision === 'approved'
      ? 'Apelación acogida por el Comité Organizador. Jugador habilitado.'
      : params.decision === 'rejected'
      ? 'Apelación rechazada. Se mantiene la sanción original.'
      : 'Mensaje respondido por la organización.');

  const updatedMessage: DelegateMessage = {
    ...params.message,
    status: params.decision,
    organizerReply: cleanReply,
  };

  let reEnabledPlayerId: string | undefined;

  const updatedSanctions = params.sanctions.map((s) => {
    if (params.message.sanctionId && s.id === params.message.sanctionId) {
      if (params.decision === 'approved') {
        reEnabledPlayerId = s.playerId;
        return {
          ...s,
          status: 'revoked' as const,
          appealResolution: cleanReply,
        };
      }
      if (params.decision === 'rejected') {
        return {
          ...s,
          status: 'active' as const,
          appealResolution: cleanReply,
        };
      }
    }
    return s;
  });

  return {
    updatedMessage,
    updatedSanctions,
    reEnabledPlayerId,
  };
}
