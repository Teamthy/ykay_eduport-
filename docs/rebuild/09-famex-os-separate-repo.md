# 09 — Direction change: Famex OS is a separate repository

**Decision (user, 2026-10-13):** the new school project is called **Famex OS** and
lives in its **own repository**. The Ykay College project is not to be disturbed.

This supersedes the D1 recommendation in `01-approach.md §2` ("one repo, second
deployment"). Everything else in this pack still applies — the finance ledger,
GPS attendance, CBT at scale, WhatsApp Business, five-year ops, migration, risks
and go-live planning are all still the plan; only the *packaging* changed.

## What changed

| | Previous recommendation (D1-B) | Adopted (fork to own repo) |
|---|---|---|
| Codebase | one repo, two deployments | two repos: Ykay stays as-is, Famex OS is its own product |
| Isolation | separate database, same code | separate repository **and** database |
| Maintenance | fixes applied once | shared core must be **ported deliberately** (monthly sync ritual) |
| Branding | tenant branding row | Famex is its own product with its own name, tokens and module set |
| Scope | Ykay parity + 4 subsystems | Ykay parity + ~25% new modules (AI layer, e-learning and live classes, HR, Parent PRM, front desk, subscriptions, offline exam centre) |

The trade-off is real and worth stating once: two repos means two upgrade
schedules, and every shared-core security fix has to be cherry-picked. The
mitigation is the porting policy in the Famex pack
(`docs/famex/04-repo-and-delivery.md §2`) — a monthly two-hour sync ritual with a
written log, and shared-core files tagged `// SHARED-CORE: ykay@<sha>`.

## Where the work now lives

- **Famex OS repo (local checkout):** `/home/user/Famex-Os` — full base platform
  imported as a fresh single commit on `main`, plus `docs/famex/`:
  `00-README.md` (surface, decisions FP-1…FP-8, phases), `01-module-map.md`
  (all 19 modules / ~110 screens classified reuse-extend-new with effort),
  `02-ai-layer.md`, `03-elearning-and-virtual-classes.md`,
  `04-repo-and-delivery.md`.
- **GitHub:** `Teamthy/Famex-Os` still has to be created — the connected GitHub
  app lacks `createRepository` (403). Once it exists:
  ```bash
  cd /home/user/Famex-Os
  git remote add origin https://github.com/Teamthy/Famex-Os.git
  git push -u origin main
  ```
- **This repo (Ykay):** untouched except for this note. It remains the reference
  implementation and the source of shared-core fixes.

## Open product decisions (mirrored in the Famex pack)

FP-1 SaaS vs single install · FP-2 AI provider strategy · FP-3 credit economy ·
FP-4 virtual class provider · FP-5 offline exam centre · FP-6 mobile app model ·
FP-7 payroll in v1 · FP-8 AI-drafted parent replies.
