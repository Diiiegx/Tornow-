/**
 * TorNow Security Shield (WAF / Anti-XSS / Anti-SQLi / Brute-Force Protection / URL Validator)
 * Protects client inputs and server payloads against common web attacks.
 */

const DANGEROUS_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /<\s*script\b/i, reason: 'Intento de inyección XSS (<script>) detectado y bloqueado.' },
  { pattern: /javascript\s*:/i, reason: 'Protocolo peligroso (javascript:) detectado y bloqueado.' },
  { pattern: /vbscript\s*:/i, reason: 'Protocolo peligroso (vbscript:) detectado y bloqueado.' },
  { pattern: /data\s*:\s*text\/html/i, reason: 'Payload data:text/html bloqueado por seguridad.' },
  { pattern: /\bon(error|load|click|mouseover|focus|blur|submit)\s*=/i, reason: 'Atributo de evento HTML malicioso bloqueado.' },
  { pattern: /<\s*(iframe|object|embed|svg\s+onload)/i, reason: 'Etiqueta embebida no autorizada bloqueada.' },
  { pattern: /(\bUNION\s+ALL\s+SELECT\b|\bDROP\s+TABLE\b|\bINSERT\s+INTO\b.*--)/i, reason: 'Patrón de inyección SQL detectado y bloqueado.' },
  { pattern: /(__proto__|constructor\s*\[\s*['"]prototype['"]\s*\])/i, reason: 'Intento de contaminación de prototipo bloqueado.' },
];

/**
 * Inspects any string, array, or object for malicious XSS, SQLi, or prototype pollution payloads.
 */
export function detectMaliciousPayload(
  payload: unknown,
  depth = 0
): { isMalicious: boolean; reason?: string; threatType?: string } {
  if (depth > 8 || payload === null || payload === undefined) {
    return { isMalicious: false };
  }

  if (typeof payload === 'string') {
    for (const rule of DANGEROUS_PATTERNS) {
      if (rule.pattern.test(payload)) {
        return { isMalicious: true, reason: rule.reason, threatType: rule.reason };
      }
    }
    return { isMalicious: false };
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const res = detectMaliciousPayload(item, depth + 1);
      if (res.isMalicious) return res;
    }
    return { isMalicious: false };
  }

  if (typeof payload === 'object') {
    const proto = Object.getPrototypeOf(payload);
    if (proto !== null && proto !== Object.prototype) {
      const reason = 'Intento de contaminación de prototipo detectado.';
      return { isMalicious: true, reason, threatType: reason };
    }
    for (const key of Object.keys(payload as Record<string, unknown>)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        const reason = 'Intento de contaminación de prototipo en clave JSON.';
        return { isMalicious: true, reason, threatType: reason };
      }
      const val = (payload as Record<string, unknown>)[key];
      const res = detectMaliciousPayload(val, depth + 1);
      if (res.isMalicious) return res;
    }
  }

  return { isMalicious: false };
}

/**
 * Sanitizes user-supplied text by stripping HTML tags, dangerous protocols, and control chars.
 */
export function sanitizeSafeInput(input: string, maxLength = 500): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/\bon\w+\s*=/gi, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates an optional YouTube Live / Video URL provided by the tournament organizer.
 */
export function validateYoutubeUrl(rawUrl?: string): {
  isValid: boolean;
  normalizedUrl: string;
  cleanUrl: string;
  error?: string;
} {
  if (!rawUrl || !rawUrl.trim()) {
    return { isValid: true, normalizedUrl: '', cleanUrl: '' };
  }

  const trimmed = rawUrl.trim();
  const check = detectMaliciousPayload(trimmed);
  if (check.isMalicious) {
    return { isValid: false, normalizedUrl: '', cleanUrl: '', error: check.reason };
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return {
        isValid: false,
        normalizedUrl: '',
        cleanUrl: '',
        error: 'El link debe usar protocolo seguro HTTPS.',
      };
    }
    const host = parsed.hostname.toLowerCase();
    const isYoutube =
      host === 'youtube.com' ||
      host === 'www.youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtu.be';

    if (!isYoutube) {
      return {
        isValid: false,
        normalizedUrl: '',
        cleanUrl: '',
        error: 'Ingresa un enlace oficial de YouTube (youtube.com o youtu.be).',
      };
    }

    const finalUrl = parsed.toString();
    return { isValid: true, normalizedUrl: finalUrl, cleanUrl: finalUrl };
  } catch {
    return {
      isValid: false,
      normalizedUrl: '',
      cleanUrl: '',
      error: 'El formato del enlace de YouTube no es válido.',
    };
  }
}

/**
 * Normalizes and validates a club's social media URL or handle.
 */
export function normalizeClubSocialUrl(
  platform: 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'twitter' | 'website',
  rawInput?: string
): string {
  if (!rawInput || !rawInput.trim()) return '';
  const cleaned = sanitizeSafeInput(rawInput, 250);
  if (!cleaned) return '';

  if (/^https?:\/\//i.test(cleaned)) {
    return cleaned;
  }

  const handle = cleaned.replace(/^@/, '');
  switch (platform) {
    case 'instagram':
      return cleaned.includes('instagram.com') ? `https://${cleaned}` : `https://instagram.com/${handle}`;
    case 'tiktok':
      return cleaned.includes('tiktok.com') ? `https://${cleaned}` : `https://tiktok.com/@${handle}`;
    case 'facebook':
      return cleaned.includes('facebook.com') ? `https://${cleaned}` : `https://facebook.com/${handle}`;
    case 'youtube':
      return cleaned.includes('youtube.com') || cleaned.includes('youtu.be')
        ? `https://${cleaned}`
        : `https://youtube.com/@${handle}`;
    case 'twitter':
      return cleaned.includes('x.com') || cleaned.includes('twitter.com')
        ? `https://${cleaned}`
        : `https://x.com/${handle}`;
    case 'website':
    default:
      return `https://${cleaned}`;
  }
}

export interface RateLimitEntry {
  count: number;
  lockUntil: number;
}

const defaultRateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Brute-force rate limiter for login and key redemption attempts.
 * Supports passing a custom Map store (for isolated unit tests) or a boolean `isSuccess` flag.
 */
export function registerLoginAttempt(
  identifier: string,
  storeOrSuccess: Map<string, RateLimitEntry> | boolean = defaultRateLimitStore,
  maxAttempts = 5,
  lockoutMs = 60_000,
  nowMs = Date.now()
): {
  allowed: boolean;
  isLocked: boolean;
  remainingAttempts: number;
  attemptsRemaining: number;
  waitSeconds: number;
  remainingLockSeconds: number;
} {
  const key = identifier.trim().toLowerCase() || 'anonymous';
  const store =
    storeOrSuccess instanceof Map ? storeOrSuccess : defaultRateLimitStore;

  // If called with `isSuccess = true`, clear previous failed attempts
  if (typeof storeOrSuccess === 'boolean' && storeOrSuccess === true) {
    store.delete(key);
    return {
      allowed: true,
      isLocked: false,
      remainingAttempts: maxAttempts,
      attemptsRemaining: maxAttempts,
      waitSeconds: 0,
      remainingLockSeconds: 0,
    };
  }

  const entry = store.get(key) || { count: 0, lockUntil: 0 };

  if (entry.lockUntil > nowMs) {
    const waitSeconds = Math.ceil((entry.lockUntil - nowMs) / 1000);
    return {
      allowed: false,
      isLocked: true,
      remainingAttempts: 0,
      attemptsRemaining: 0,
      waitSeconds,
      remainingLockSeconds: waitSeconds,
    };
  }

  const nextCount = entry.count + 1;
  if (nextCount > maxAttempts) {
    const lockUntil = nowMs + lockoutMs;
    const waitSeconds = Math.ceil(lockoutMs / 1000);
    store.set(key, { count: nextCount, lockUntil });
    return {
      allowed: false,
      isLocked: true,
      remainingAttempts: 0,
      attemptsRemaining: 0,
      waitSeconds,
      remainingLockSeconds: waitSeconds,
    };
  }

  store.set(key, { count: nextCount, lockUntil: 0 });
  const remainingAttempts = Math.max(0, maxAttempts - nextCount);
  return {
    allowed: true,
    isLocked: false,
    remainingAttempts,
    attemptsRemaining: remainingAttempts,
    waitSeconds: 0,
    remainingLockSeconds: 0,
  };
}
