import { test } from 'node:test';
import assert from 'node:assert';
import {
  validateHumanReadableText,
  cleanTournamentString,
  validateTournamentName,
  MIN_TOURNAMENT_NAME_LENGTH,
  MAX_TOURNAMENT_NAME_LENGTH,
} from './textValidation';

test('validateHumanReadableText rejects gibberish like BDJFJFJJFJF', () => {
  const result = validateHumanReadableText('BDJFJFJJFJF', 'Nombre');
  assert.strictEqual(result.isValid, false);
});

test('validateHumanReadableText rejects keyboard sequence asdf', () => {
  const result = validateHumanReadableText('Torneo asdf 2026', 'Nombre');
  assert.strictEqual(result.isValid, false);
});

test('validateHumanReadableText rejects repetitive letters aaaaa and keyboard loops like asdasdasdasdasdas', () => {
  assert.strictEqual(validateHumanReadableText('Gimnasio aaaaa', 'Sede').isValid, false);
  assert.strictEqual(validateHumanReadableText('asdasdasdasdasdas', 'Nombre').isValid, false);
  assert.strictEqual(validateHumanReadableText('asdasd', 'Nombre').isValid, false);
  assert.strictEqual(validateHumanReadableText('Copa asdasdasd 2026', 'Nombre').isValid, false);
  assert.strictEqual(validateHumanReadableText('qweqweqwe', 'Nombre').isValid, false);
  assert.strictEqual(validateHumanReadableText('zxcvzxcv', 'Nombre').isValid, false);
  assert.strictEqual(validateHumanReadableText('fgdfgdfgd', 'Nombre').isValid, false);
});

test('cleanTournamentString sanitizes extra spaces, repeated symbols, and control characters', () => {
  assert.strictEqual(cleanTournamentString('   Copa   Nacional---2026   '), 'Copa Nacional-2026');
  assert.strictEqual(cleanTournamentString('Liga\t\tApertura...Santiago'), 'Liga Apertura.Santiago');
});

test('validateTournamentName enforces min/max character limits and rejects repetitive names', () => {
  // Too short (< 5)
  assert.strictEqual(validateTournamentName('Copa').isValid, false);
  // Too long (> 60)
  const overLimit = 'Campeonato Nacional Metropolitano Interclubes de Voleibol Apertura 2026';
  assert.ok(overLimit.length > MAX_TOURNAMENT_NAME_LENGTH);
  assert.strictEqual(validateTournamentName(overLimit).isValid, false);

  // Repetitive strings like 'asdasd' or duplicate words
  assert.strictEqual(validateTournamentName('asdasd').isValid, false);
  assert.strictEqual(validateTournamentName('Torneo asdasd').isValid, false);
  assert.strictEqual(validateTournamentName('Copa Copa Apertura').isValid, false);

  // Valid tournament name with extra spaces gets cleaned and accepted
  const valid = validateTournamentName('  Copa   TORNOW  Apertura 2026  ');
  assert.strictEqual(valid.isValid, true);
  assert.strictEqual(valid.cleanedName, 'Copa TORNOW Apertura 2026');
  assert.ok(valid.charCount >= MIN_TOURNAMENT_NAME_LENGTH && valid.charCount <= MAX_TOURNAMENT_NAME_LENGTH);
});

test('validateHumanReadableText accepts real Spanish tournament and venue names', () => {
  assert.strictEqual(validateHumanReadableText('Copa de Voleibol TORNOW', 'Nombre').isValid, true);
  assert.strictEqual(validateHumanReadableText('Club Deportivo Manquehue', 'Entidad').isValid, true);
  assert.strictEqual(validateHumanReadableText('Estadio Bicentenario La Florida', 'Sede').isValid, true);
  assert.strictEqual(validateHumanReadableText('Gimnasio Polideportivo Central', 'Sede').isValid, true);
  assert.strictEqual(validateHumanReadableText('Liga Nacional Apertura 2026', 'Nombre').isValid, true);
});


