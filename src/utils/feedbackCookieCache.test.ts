import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  FEEDBACK_COOKIE_NAME,
  ONE_HOUR_MS,
  parseGeneralCookies,
  formatGeneralCookie,
  evaluateHourlyFeedbackCooldown,
  validateFeedbackSubmission,
} from './feedbackCookieCache';

describe('feedbackCookieCache general cookies & 1-hour popup cooldown logic', () => {
  test('parseGeneralCookies and formatGeneralCookie handle standard general cookies accurately', () => {
    const now = 1_700_000_000_000;
    const formatted = formatGeneralCookie(FEEDBACK_COOKIE_NAME, String(now), 3600, now);
    assert.ok(formatted.includes(`${FEEDBACK_COOKIE_NAME}=${now}`));
    assert.ok(formatted.includes('path=/'));
    assert.ok(formatted.includes('max-age=3600'));
    assert.ok(formatted.includes('SameSite=Lax'));

    const parsed = parseGeneralCookies(`theme=dark; ${FEEDBACK_COOKIE_NAME}=${now}; lang=es`);
    assert.equal(parsed.theme, 'dark');
    assert.equal(parsed[FEEDBACK_COOKIE_NAME], String(now));
    assert.equal(parsed.lang, 'es');
  });

  test('evaluateHourlyFeedbackCooldown allows popup when no cookie/cache exists or after 60 minutes', () => {
    const now = 1_700_000_000_000;

    // 1. First visit (no cookie, no cache) -> shouldShowPopup = true
    const firstVisit = evaluateHourlyFeedbackCooldown({
      cookieHeader: '',
      cachedTimestamp: null,
      nowMs: now,
    });
    assert.equal(firstVisit.shouldShowPopup, true);
    assert.equal(firstVisit.remainingMinutes, 0);

    // 2. 20 minutes after popup shown -> shouldShowPopup = false, 40 minutes remaining
    const twentyMinLater = now + 20 * 60 * 1000;
    const midHour = evaluateHourlyFeedbackCooldown({
      cookieHeader: `${FEEDBACK_COOKIE_NAME}=${now}`,
      cachedTimestamp: String(now),
      nowMs: twentyMinLater,
    });
    assert.equal(midHour.shouldShowPopup, false);
    assert.equal(midHour.remainingMinutes, 40);

    // 3. Exactly 60 minutes (1 hour) later -> shouldShowPopup = true again
    const oneHourLater = now + ONE_HOUR_MS;
    const afterOneHour = evaluateHourlyFeedbackCooldown({
      cookieHeader: `${FEEDBACK_COOKIE_NAME}=${now}`,
      cachedTimestamp: String(now),
      nowMs: oneHourLater,
    });
    assert.equal(afterOneHour.shouldShowPopup, true);
    assert.equal(afterOneHour.remainingMinutes, 0);
  });

  test('validateFeedbackSubmission validates stars, sanitizes comments, and blocks XSS', () => {
    const valid = validateFeedbackSubmission({
      rating: 5,
      category: 'elogio',
      comment: 'Excelente plataforma para gestionar nuestra liga de voleibol.',
      authorName: 'Carlos Delegado',
    });
    assert.equal(valid.isValid, true);
    assert.equal(valid.cleanRating, 5);
    assert.equal(valid.cleanCategory, 'elogio');

    const invalidShort = validateFeedbackSubmission({
      rating: 4,
      comment: 'ok',
    });
    assert.equal(invalidShort.isValid, false);

    const malicious = validateFeedbackSubmission({
      rating: 3,
      comment: '<script>alert("xss")</script> Hack',
    });
    assert.equal(malicious.isValid, false);
  });
});
