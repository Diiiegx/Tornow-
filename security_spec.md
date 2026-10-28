# TORNOW Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Global Deny by Default**: Any path not explicitly matched is denied (`allow read, write: if false`).
2. **Verified Identity**: All writes require `request.auth != null && request.auth.token.email_verified == true`.
3. **PII Split Isolation**: User PII (`email`, `phone`) is stored strictly under `/users/{userId}/private/{docId}` and readable only by `isOwner(userId)` or `isAdmin()`.
4. **Immutable Ownership & Timestamps**: `uid`, `ownerId`, and `createdAt` cannot be modified after creation; `createdAt == request.time` on create and `updatedAt == request.time` on create/update.
5. **Terminal State Locking**: Once a tournament reaches `status == 'completed'`, non-admin users cannot update it.

## 2. The "Dirty Dozen" Payloads
1. **Unverified Email Spoof**: Authenticated request with `email: "diegostrqfe@gmail.com"` and `email_verified: false` attempting admin write -> `PERMISSION_DENIED`.
2. **Cross-User Ownership Spoof**: User `uid_A` creating `/tournaments/t1` with `ownerId: "uid_B"` -> `PERMISSION_DENIED`.
3. **Shadow Field Injection (Create)**: Creating `/tournaments/t1` with extra field `isAdmin: true` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection (Update)**: Updating `/tournaments/t1` with unallowed field `hacked: true` -> `PERMISSION_DENIED`.
5. **ID Poisoning Attack**: Document ID containing invalid characters or > 128 chars -> `PERMISSION_DENIED`.
6. **Value Poisoning (Oversized String)**: Setting `name` to a 5,000-character string -> `PERMISSION_DENIED`.
7. **PII Leak Attempt**: User `uid_B` attempting `get` on `/users/uid_A/private/info` -> `PERMISSION_DENIED`.
8. **Unscoped List Scraping**: User `uid_B` listing `/tournaments` without filtering `resource.data.ownerId == request.auth.uid` -> `PERMISSION_DENIED`.
9. **Immutable Field Mutation (`ownerId`)**: Owner attempting to change `ownerId` during update -> `PERMISSION_DENIED`.
10. **Immutable Field Mutation (`createdAt`)**: Owner attempting to change `createdAt` during update -> `PERMISSION_DENIED`.
11. **Fake Client Timestamp**: Client passing past/future `updatedAt` instead of `request.time` -> `PERMISSION_DENIED`.
12. **Terminal State Bypass**: Owner attempting to update a tournament whose existing `status == 'completed'` -> `PERMISSION_DENIED`.
