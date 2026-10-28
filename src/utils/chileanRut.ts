/**
 * Utility for Chilean RUT formatting and strict Modulo 11 verification
 * Prevents invented RUTs, dummy sequences, and returns concise "RUT inválido."
 */

export function cleanRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase();
}

export function formatRut(rawRut: string): string {
  const clean = cleanRut(rawRut);
  if (!clean) return '';
  if (clean.length === 1) return clean;

  const dv = clean.slice(-1);
  let body = clean.slice(0, -1);

  let formattedBody = '';
  while (body.length > 3) {
    formattedBody = '.' + body.slice(-3) + formattedBody;
    body = body.slice(0, -3);
  }
  formattedBody = body + formattedBody;

  return `${formattedBody}-${dv}`;
}

// Known common invented / dummy sequential patterns
const INVENTED_RUT_PATTERNS = [
  '12345678',
  '23456789',
  '34567890',
  '87654321',
  '98765432',
  '1234567',
  '7654321',
  '10203040',
  '11223344',
  '12121212',
  '99999999',
];

export function validateChileanRut(rawRut: string): { isValid: boolean; error?: string } {
  const clean = cleanRut(rawRut);
  if (!clean) {
    return { isValid: false, error: 'El RUT es obligatorio.' };
  }

  if (clean.length < 8 || clean.length > 9) {
    return { isValid: false, error: 'RUT inválido.' };
  }

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);

  // Check if body is strictly numbers
  if (!/^\d+$/.test(body)) {
    return { isValid: false, error: 'RUT inválido.' };
  }

  // Reject RUT with all identical digits (11.111.111-1, 22.222.222-2, etc.)
  if (/^(\d)\1+$/.test(body)) {
    return { isValid: false, error: 'RUT inválido.' };
  }

  // Reject known invented sequential patterns
  if (INVENTED_RUT_PATTERNS.includes(body)) {
    return { isValid: false, error: 'RUT inválido.' };
  }

  const numBody = parseInt(body, 10);

  // Check realistic Chilean RUT ranges:
  // Personal IDs (Personas Naturales): 1.000.000 to 28.500.000
  // Corporate IDs (Empresas / Personas Jurídicas / Clubes): 60.000.000 to 99.999.999
  // Range 28.500.000 - 59.999.999 does not exist in the Chilean tax/electoral registry.
  if (numBody < 1000000) {
    return { isValid: false, error: 'RUT inválido.' };
  }
  if (numBody > 28500000 && numBody < 60000000) {
    return { isValid: false, error: 'RUT inválido.' };
  }
  if (numBody > 99999999) {
    return { isValid: false, error: 'RUT inválido.' };
  }

  // Modulo 11 Algorithm
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  let expectedDv = '';
  if (remainder === 11) expectedDv = '0';
  else if (remainder === 10) expectedDv = 'K';
  else expectedDv = remainder.toString();

  if (dv !== expectedDv) {
    return {
      isValid: false,
      error: 'RUT inválido.',
    };
  }

  return { isValid: true };
}
