import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectMaliciousPayload,
  sanitizeSafeInput,
  validateYoutubeUrl,
  normalizeClubSocialUrl,
  registerLoginAttempt,
  type RateLimitEntry,
} from './securityShield';

describe('securityShield anti-hacking & validation logic', () => {
  test('detectMaliciousPayload blocks XSS, javascript: URIs, SQL injection, and prototype pollution', () => {
    assert.equal(detectMaliciousPayload('<script>alert(1)</script>').isMalicious, true);
    assert.equal(detectMaliciousPayload('javascript:evil()').isMalicious, true);
    assert.equal(detectMaliciousPayload('<img src=x onerror=alert(1)>').isMalicious, true);
    assert.equal(detectMaliciousPayload('1 UNION ALL SELECT password FROM users').isMalicious, true);
    assert.equal(
      detectMaliciousPayload({ nested: { __proto__: { polluted: true } } }).isMalicious,
      true
    );

    // Safe tournament strings pass cleanly
    assert.equal(detectMaliciousPayload('Liga Metropolitana de Voleibol 2026').isMalicious, false);
  });

  test('sanitizeSafeInput strips HTML/scripts while keeping valid Chilean Spanish text', () => {
    const dirty = 'Club <script>stealCookies()</script><b>Murano</b> onclick=hack()';
    const clean = sanitizeSafeInput(dirty);
    assert.equal(clean.includes('<script>'), false);
    assert.equal(clean.includes('onclick='), false);
    assert.ok(clean.includes('Club'));
    assert.ok(clean.includes('Murano'));
  });

  test('validateYoutubeUrl accepts valid youtube.com / youtu.be links and rejects malicious or non-YouTube URLs', () => {
    // Empty is valid because YouTube link is optional
    const emptyRes = validateYoutubeUrl('');
    assert.equal(emptyRes.isValid, true);
    assert.equal(emptyRes.normalizedUrl, '');

    const validWatch = validateYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    assert.equal(validWatch.isValid, true);
    assert.ok(validWatch.normalizedUrl.includes('youtube.com'));

    const validShort = validateYoutubeUrl('youtu.be/dQw4w9WgXcQ');
    assert.equal(validShort.isValid, true);
    assert.equal(validShort.normalizedUrl, 'https://youtu.be/dQw4w9WgXcQ');

    const badDomain = validateYoutubeUrl('https://malicious-phishing.com/watch?v=123');
    assert.equal(badDomain.isValid, false);
  });

  test('normalizeClubSocialUrl formats handles and URLs into safe https links', () => {
    assert.equal(
      normalizeClubSocialUrl('instagram', '@clubmurano'),
      'https://instagram.com/clubmurano'
    );
    assert.equal(
      normalizeClubSocialUrl('tiktok', 'clubmurano'),
      'https://tiktok.com/@clubmurano'
    );
    assert.equal(
      normalizeClubSocialUrl('website', 'www.clubmurano.cl'),
      'https://www.clubmurano.cl'
    );
  });

  test('registerLoginAttempt locks out brute-force attackers after maxAttempts', () => {
    const store = new Map<string, RateLimitEntry>();
    const now = 1_700_000_000_000;

    for (let i = 1; i <= 5; i++) {
      const attempt = registerLoginAttempt('hacker_ip', store, 5, 60_000, now);
      assert.equal(attempt.allowed, true);
    }

    // 6th attempt must be blocked
    const blocked = registerLoginAttempt('hacker_ip', store, 5, 60_000, now);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.waitSeconds, 60);
  });
});
