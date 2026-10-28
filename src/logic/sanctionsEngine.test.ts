import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSanctionInput,
  buildPlayerSanction,
  createSanctionAppeal,
  resolveOrganizerInboxMessage,
} from './sanctionsEngine';

describe('sanctionsEngine pure logic', () => {
  it('validates sanction inputs accurately', () => {
    const missingClub = validateSanctionInput({ clubId: '', playerId: 'p1', reason: 'Conducta antideportiva', matchesSuspended: 2 });
    assert.equal(missingClub.isValid, false);

    const shortReason = validateSanctionInput({ clubId: 'c1', playerId: 'p1', reason: 'abc', matchesSuspended: 2 });
    assert.equal(shortReason.isValid, false);

    const invalidDates = validateSanctionInput({ clubId: 'c1', playerId: 'p1', reason: 'Doble tarjeta roja', matchesSuspended: 0 });
    assert.equal(invalidDates.isValid, false);

    const valid = validateSanctionInput({ clubId: 'c1', playerId: 'p1', reason: 'Conducta antideportiva reiterada', matchesSuspended: 3 });
    assert.equal(valid.isValid, true);
  });

  it('builds a player sanction and marks player as suspended', () => {
    const result = buildPlayerSanction(
      {
        tournamentId: 'tour-1',
        clubId: 'club-1',
        clubName: 'Vóley Manquehue',
        player: {
          id: 'p-10',
          name: 'Matías',
          paternalSurname: 'Valenzuela',
          dorsal: 10,
        },
        reason: 'Expulsión directa por reclamos airados al árbitro',
        matchesSuspended: 2,
        issuedBy: 'Tribunal de Disciplina',
      },
      'sanc-test-1',
      '2026-10-27T12:00:00.000Z'
    );

    assert.equal(result.sanction.id, 'sanc-test-1');
    assert.equal(result.sanction.playerName, 'Matías Valenzuela');
    assert.equal(result.sanction.matchesSuspended, 2);
    assert.equal(result.sanction.status, 'active');
    assert.equal(result.playerPatch.isSuspended, true);
    assert.equal(result.playerPatch.suspendedMatchesRemaining, 2);
  });

  it('blocks delegate appeal when organizer disables appeals', () => {
    const { sanction } = buildPlayerSanction({
      tournamentId: 'tour-1',
      clubId: 'club-1',
      clubName: 'Vóley Manquehue',
      player: { id: 'p-10', name: 'Matías', dorsal: 10 },
      reason: 'Acumulación de tarjetas',
      matchesSuspended: 1,
    });

    const blocked = createSanctionAppeal({
      sanction,
      allowAppeals: false,
      appealText: 'Solicitamos reconsideración por error de identidad en planilla.',
      senderName: 'Delegado Manquehue',
    });

    assert.equal(blocked.ok, false);
    assert.ok(blocked.error?.includes('desactivado'));
  });

  it('creates an appeal and inbox message when appeals are enabled, and resolves it properly', () => {
    const { sanction } = buildPlayerSanction(
      {
        tournamentId: 'tour-1',
        clubId: 'club-1',
        clubName: 'Vóley Manquehue',
        player: { id: 'p-10', name: 'Matías', dorsal: 10 },
        reason: 'Tarjeta roja en set 3',
        matchesSuspended: 2,
      },
      'sanc-99'
    );

    const appealRes = createSanctionAppeal({
      sanction,
      allowAppeals: true,
      appealText: 'Adjuntamos video donde se aprecia que el jugador #10 no participó del incidente.',
      senderName: 'Carlos Soto (Delegado)',
      customMessageId: 'msg-99',
    });

    assert.equal(appealRes.ok, true);
    assert.equal(appealRes.updatedSanction?.status, 'appealed');
    assert.equal(appealRes.inboxMessage?.type, 'apelacion');
    assert.equal(appealRes.inboxMessage?.sanctionId, 'sanc-99');

    // Now resolve the appeal by approving it
    const resolution = resolveOrganizerInboxMessage({
      message: appealRes.inboxMessage!,
      decision: 'approved',
      replyText: 'Revisado el video, se absuelve al jugador #10 y queda habilitado.',
      sanctions: [appealRes.updatedSanction!],
    });

    assert.equal(resolution.updatedMessage.status, 'approved');
    assert.equal(resolution.updatedSanctions[0].status, 'revoked');
    assert.equal(resolution.reEnabledPlayerId, 'p-10');
  });
});
