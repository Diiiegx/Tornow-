import { test } from 'node:test';
import assert from 'node:assert';
import { cleanRut, formatRut, validateChileanRut } from './chileanRut';

test('cleanRut removes points and dashes', () => {
  assert.strictEqual(cleanRut('12.345.678-9'), '123456789');
  assert.strictEqual(cleanRut('76.084.420-k'), '76084420K');
});

test('formatRut formats numbers with dots and dash', () => {
  assert.strictEqual(formatRut('76084420K'), '76.084.420-K');
});

test('validateChileanRut outputs strictly "RUT inválido." on wrong DV', () => {
  const result = validateChileanRut('18.234.567-0');
  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.error, 'RUT inválido.');
});

test('validateChileanRut rejects invented sequential RUTs like 12.345.678-5', () => {
  const result = validateChileanRut('12.345.678-5');
  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.error, 'RUT inválido.');
});

test('validateChileanRut rejects out-of-range non-existent Chilean RUTs', () => {
  // Range between 28.5M and 60M is not registered
  const result = validateChileanRut('35.000.000-4');
  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.error, 'RUT inválido.');
});

test('validateChileanRut accepts legitimate registered Chilean company and personal RUTs', () => {
  // 76.084.420-9
  assert.strictEqual(validateChileanRut('76.084.420-9').isValid, true);
  // 17.892.451-6
  assert.strictEqual(validateChileanRut('17.892.451-6').isValid, true);
});
