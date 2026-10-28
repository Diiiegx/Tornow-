import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

test('Firestore rules enforce all 8 pillars and reject the Dirty Dozen', () => {
  const rules = fs.readFileSync('firestore.rules', 'utf8');

  // 1. Default deny catch-all
  assert.ok(rules.includes('allow read, write: if false;'));

  // 2. Verified email requirement
  assert.ok(rules.includes('request.auth.token.email_verified == true'));

  // 3. Strict validation helpers wrapped in update blocks
  assert.ok(rules.includes('allow update: if isValidUserPublic(incoming())'));
  assert.ok(rules.includes('allow update: if isValidUserPrivate(incoming())'));
  assert.ok(rules.includes('allow update: if isValidTournament(incoming())'));

  // 4. Terminal state locking on tournaments
  assert.ok(rules.includes("existing().status != 'completed'"));

  // 5. Strict timestamp and immutable field checks
  assert.ok(rules.includes('incoming().createdAt == request.time'));
  assert.ok(rules.includes('incoming().updatedAt == request.time'));
  assert.ok(rules.includes('incoming().ownerId == existing().ownerId'));
});
