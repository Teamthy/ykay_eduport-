# Phase 7 — Production readiness, IT flagship, e2e smoke, cleanup

## Ships
1. `docs/PRODUCTION_READINESS_AUDIT.md` — full leftover inventory after 6E
2. `PRODUCTION_CUTOVER.md` — go-live checklist for real `.env`
3. IT Education elevated:
   - top-level nav item
   - homepage `ITFlagshipSection`
   - optimized `/it-education` hub with live `/api/it/catalog`
4. `DemoIndicator` only if `NEXT_PUBLIC_SHOW_DEMO_BADGE=true`
5. E2E smoke: `npm run test:e2e` (fetch-based, pages + public APIs + auth guards)
6. Artifact cleanup: `npm run cleanup:artifacts`
7. `.gitignore` ignores inject scripts / deliverables / screens backups

## Apply
```powershell
.\phase-7-prod-ready-ingest.ps1
npm run build
# with server:
npm run start
# other terminal:
npm run test:e2e -- --base-url=http://127.0.0.1:3000 --no-server
npm run cleanup:artifacts -- --dry-run
```
