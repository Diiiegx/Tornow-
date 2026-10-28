import { detectMaliciousPayload, sanitizeSafeInput } from './securityShield';
import { FeedbackCategory } from '../types';

export const FEEDBACK_COOKIE_NAME = 'tornow_feedback_hourly_ts';
export const GENERAL_CACHE_COOKIE_NAME = 'tornow_general_cache_v1';
export const FEEDBACK_CACHE_STORAGE_KEY = 'tornow_feedback_last_shown_cache_v1';
export const ONE_HOUR_SECONDS = 3600;
export const ONE_HOUR_MS = ONE_HOUR_SECONDS * 1000;

/**
 * Parses a standard document.cookie or HTTP Cookie header string into a key-value map.
 */
export function parseGeneralCookies(cookieStr = ''): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieStr || typeof cookieStr !== 'string') return result;

  const pairs = cookieStr.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const rawKey = pair.slice(0, idx).trim();
    const rawVal = pair.slice(idx + 1).trim();
    if (!rawKey) continue;
    try {
      result[decodeURIComponent(rawKey)] = decodeURIComponent(rawVal);
    } catch {
      result[rawKey] = rawVal;
    }
  }
  return result;
}

/**
 * Formats a general browser cookie string with path=/, Max-Age, Expires, and SameSite=Lax.
 */
export function formatGeneralCookie(
  name: string,
  value: string,
  maxAgeSeconds = ONE_HOUR_SECONDS,
  nowMs = Date.now()
): string {
  const safeName = encodeURIComponent(name.trim());
  const safeValue = encodeURIComponent(value);
  const expiresDate = new Date(nowMs + maxAgeSeconds * 1000).toUTCString();
  return `${safeName}=${safeValue}; path=/; max-age=${maxAgeSeconds}; expires=${expiresDate}; SameSite=Lax`;
}

/**
 * Determines whether the hourly feedback popup should appear based on both general cookies
 * and local cache state.
 * Appears once every 1 hour (3,600,000 ms).
 */
export function evaluateHourlyFeedbackCooldown(params: {
  cookieHeader?: string;
  cachedTimestamp?: string | number | null;
  nowMs?: number;
}): {
  shouldShowPopup: boolean;
  lastShownAtMs: number;
  nextPopupAtMs: number;
  remainingMinutes: number;
  remainingSeconds: number;
} {
  const { cookieHeader = '', cachedTimestamp = null, nowMs = Date.now() } = params;

  const cookies = parseGeneralCookies(cookieHeader);
  const cookieTs = cookies[FEEDBACK_COOKIE_NAME] ? Number(cookies[FEEDBACK_COOKIE_NAME]) : 0;
  const storageTs = cachedTimestamp !== null && cachedTimestamp !== undefined ? Number(cachedTimestamp) : 0;

  const validCookieTs = Number.isFinite(cookieTs) && cookieTs > 0 ? cookieTs : 0;
  const validStorageTs = Number.isFinite(storageTs) && storageTs > 0 ? storageTs : 0;

  // Use the most recent valid timestamp between the general cookie and the local cache
  const lastShownAtMs = Math.max(validCookieTs, validStorageTs);

  // Guard against future clock skew (> 5 minutes ahead)
  if (lastShownAtMs === 0 || lastShownAtMs > nowMs + 5 * 60 * 1000) {
    return {
      shouldShowPopup: true,
      lastShownAtMs: 0,
      nextPopupAtMs: nowMs,
      remainingMinutes: 0,
      remainingSeconds: 0,
    };
  }

  const elapsedMs = nowMs - lastShownAtMs;
  if (elapsedMs >= ONE_HOUR_MS) {
    return {
      shouldShowPopup: true,
      lastShownAtMs,
      nextPopupAtMs: nowMs,
      remainingMinutes: 0,
      remainingSeconds: 0,
    };
  }

  const remainingMs = ONE_HOUR_MS - elapsedMs;
  const nextPopupAtMs = lastShownAtMs + ONE_HOUR_MS;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));

  return {
    shouldShowPopup: false,
    lastShownAtMs,
    nextPopupAtMs,
    remainingMinutes,
    remainingSeconds,
  };
}

/**
 * Synchronizes both general browser cookies and localStorage cache for the 1-hour feedback cooldown.
 */
export function syncHourlyFeedbackCookieAndCache(nowMs = Date.now()): {
  timestampMs: number;
  feedbackCookieStr: string;
  generalCacheCookieStr: string;
} {
  const tsStr = String(nowMs);
  const feedbackCookieStr = formatGeneralCookie(FEEDBACK_COOKIE_NAME, tsStr, ONE_HOUR_SECONDS, nowMs);
  const generalCacheCookieStr = formatGeneralCookie(
    GENERAL_CACHE_COOKIE_NAME,
    `active_${nowMs}`,
    86400 * 7, // 7 days general cache cookie
    nowMs
  );

  if (typeof document !== 'undefined') {
    try {
      document.cookie = feedbackCookieStr;
      document.cookie = generalCacheCookieStr;
    } catch {
      // Ignore cookie write errors in restricted contexts
    }
  }

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(FEEDBACK_CACHE_STORAGE_KEY, tsStr);
    } catch {
      // Ignore storage quota errors
    }
  }

  return {
    timestampMs: nowMs,
    feedbackCookieStr,
    generalCacheCookieStr,
  };
}

/**
 * Reads current browser cookies and localStorage cache to evaluate the hourly popup state.
 */
export function getBrowserFeedbackCooldownState(nowMs = Date.now()) {
  const cookieHeader = typeof document !== 'undefined' ? document.cookie : '';
  let cachedTimestamp: string | null = null;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      cachedTimestamp = localStorage.getItem(FEEDBACK_CACHE_STORAGE_KEY);
    } catch {
      cachedTimestamp = null;
    }
  }
  return evaluateHourlyFeedbackCooldown({ cookieHeader, cachedTimestamp, nowMs });
}

/**
 * Validates and sanitizes user feedback before storing it in the Admin Inbox.
 */
export function validateFeedbackSubmission(input: {
  rating: number;
  category?: FeedbackCategory;
  comment: string;
  authorName?: string;
}): {
  isValid: boolean;
  error?: string;
  cleanComment: string;
  cleanAuthorName: string;
  cleanCategory: FeedbackCategory;
  cleanRating: number;
} {
  const ratingNum = Math.round(Number(input.rating) || 0);
  if (ratingNum < 1 || ratingNum > 5) {
    return {
      isValid: false,
      error: 'Selecciona una calificación de 1 a 5 estrellas.',
      cleanComment: '',
      cleanAuthorName: '',
      cleanCategory: 'sugerencia',
      cleanRating: 5,
    };
  }

  const checkPayload = detectMaliciousPayload({
    comment: input.comment,
    authorName: input.authorName,
  });
  if (checkPayload.isMalicious) {
    return {
      isValid: false,
      error: checkPayload.reason || 'Contenido bloqueado por el filtro de seguridad.',
      cleanComment: '',
      cleanAuthorName: '',
      cleanCategory: 'sugerencia',
      cleanRating: ratingNum,
    };
  }

  const cleanComment = sanitizeSafeInput(input.comment || '', 450);
  if (cleanComment.length < 3) {
    return {
      isValid: false,
      error: 'Escribe un breve comentario o sugerencia (mínimo 3 caracteres).',
      cleanComment: '',
      cleanAuthorName: '',
      cleanCategory: 'sugerencia',
      cleanRating: ratingNum,
    };
  }

  const cleanAuthorName = sanitizeSafeInput(input.authorName || '', 80) || 'Usuario TorNow';
  const validCategories: FeedbackCategory[] = ['sugerencia', 'experiencia', 'error', 'elogio'];
  const cleanCategory: FeedbackCategory =
    input.category && validCategories.includes(input.category) ? input.category : 'sugerencia';

  return {
    isValid: true,
    cleanComment,
    cleanAuthorName,
    cleanCategory,
    cleanRating: ratingNum,
  };
}
