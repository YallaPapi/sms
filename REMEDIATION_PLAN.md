# SMS Platform Audit – Remediation Plan (Active)

This plan captures everything we need to do to remove placeholders, demo code, and fake integrations so the platform is reliable for real testing. We will work from this plan.

Scope exclusion: `.env` is already git‑ignored; rotate any real keys separately.

## Remediation Items (What to change)

1) Remove demo/minimal servers and fake flows
- Remove or quarantine: `backend/src/minimal-server.ts`, `backend/src/simple-server.js` (hardcoded demo devices, simulated SMS).
- Ensure only `backend/src/server.ts` is used in scripts and docs.

2) Remove or gate placeholder routes/APIs
- Remove placeholder routers: `backend/src/routes/campaigns.ts`, `backend/src/routes/campaign.ts`, `backend/src/routes/index.ts` (they conflict with real routes in `server.ts`).
- Remove fake external gateway path: `backend/src/services/smsGateway.ts` and its only consumer `backend/src/apis/campaignApi.ts` (posts to `sms-gateway.example.com`).

3) Consolidate database layer on `pg` + migrations
- Keep: `backend/src/database.ts` and `backend/src/database/schema.sql` (run by `runMigration`).
- Remove unused/legacy DB stacks:
  - TypeORM: `backend/src/db/config.ts`, `backend/src/models/campaign.ts`.
  - Sequelize config: `backend/config/config.json` (MySQL placeholder).
  - Stray pool file: `backend/src/config/db.ts` and `backend/src/models/campaignModel.ts` (not used by real services).
- Verify all code paths use `pool` queries from `database.ts`.

4) Device layer correctness
- ADB SMS sending now real: updated `backend/src/services/android/adbService.ts` to attempt multiple `service call isms` signatures before falling back to UI intent.
- Keep WebUSB code out of server path (Node cannot access `navigator.usb`). `backend/src/services/usb/webUSBService.ts` and `usb/usbModemDevice.ts` remain experimental; do not import/use server-side until moved to browser/serial.

5) Frontend wiring and placeholders
- Replace raw `WebSocket('ws://...')` with `socket.io-client` and wire events: `deviceList`, `deviceStatusUpdate`, etc.
- Replace placeholder icons/text (e.g., `??`) in `frontend/src/components/*` with real icons or text.
- Ensure API base URL is set via `REACT_APP_API_BASE_URL` (fallback to `http://localhost:4000`). Align endpoints with `server.ts`.

6) Mobile (React Native) scope for later
- Android native modules currently include placeholder values (e.g., signal strength). Do not rely on them for tomorrow’s tests. Focus on ADB path first.

7) Auth and security (after functional readiness)
- Replace hardcoded admin in `backend/src/routes/auth.ts` with a `users` table and bcrypt‑hashed passwords; gate admin APIs by role.
- Ensure `JWT_SECRET` is set and non‑default in production.

8) Tests & validation
- Add smoke tests for `/api/health`, `/api/devices`, and campaign create/start happy paths.
- Add unit tests for `campaignService` personalization and `smsService` status updates.

## Execution Plan (Phases)

Phase 0 – Done
- ADB: Real SMS sending via `service call isms` with UI‑intent fallback.

Phase 1 – Backend cleanup (unblockers)
- Remove demo servers; remove placeholder routes; delete fake SMS gateway artifacts.
- Standardize on `database.ts` + migrations; remove TypeORM/Sequelize leftovers; verify usage.

Phase 2 – Frontend wiring
- Introduce `socket.io-client` and wire live updates; replace placeholder icons/text.
- Align REST calls and base URL configuration.

Phase 3 – Functional smoke tests
- Send test SMS via ADB device; verify DB writes and device status updates.
- Add Jest smoke tests (API) and a basic CI script.

Phase 4 – Security & auth
- Users table + bcrypt; remove hardcoded admin; enforce role checks; rotate secrets.

## Notes & Next Push
- Working Agreement: We will work from this plan. Changes should reference the relevant item and phase in commit messages.
- Suggested commit message for initial cleanup: 
  - `chore: add remediation plan; remove demo servers and placeholder routes; unify DB layer`

Owner: Stuart (+ collab via Claude Code / Task Master)
Status: Active

