# 04 — Repository and delivery

How Famex OS is separated from Ykay, how it stays in step with it, and how it
gets to production.

---

## §1 — Fresh history, deliberately

Famex OS began as a **code-only copy** of the Ykay College EduPortal with a new
root commit. No Ykay commit history is present, and none ever will be.

**Why:** the products are separate. Shared history invites three specific
accidents — an accidental push to Ykay's `main`, a rebase that drags Ykay's
in-flight work into Famex, and pull requests that mix two products' concerns.
A fresh root makes all three impossible instead of merely discouraged.

**What that costs:** we lose `git log` as a history of the school portal's
decisions. That is acceptable because the *decisions* live in `docs/rebuild/`
and this pack, which is the durable record; commit history was never the
contract.

**The rule that follows from it:** Ykay is an **upstream reference**, never a
branch. It is configured as a remote for reading and diffing only, with its push
URL disabled so a typo cannot publish anything there.

---

## §2 — Bootstrapping a new school's repository

`scripts/new-school-clone.sh` (in this repo and in Ykay, identical) does the
whole sequence safely. Use it instead of hand-typing git commands — the manual
route has already produced a half-initialised repository once.

```bash
bash scripts/new-school-clone.sh \
  --dest ../NextSchool-Os \
  --origin https://github.com/Teamthy/NextSchool-Os.git \
  --name "Next School"

# add --dry-run to see every action without writing anything
# add --skip-install to stop before npm ci (no network, or in a hurry)
# add --checks to run typecheck + tests after install
```

Eight steps, each verified by test:

1. Depth-1, code-only clone of the source.
2. `rm -rf .git` and a fresh root commit on `main`.
3. `.gitignore` hardening (the `node_modules` rule must not match the symlink
   form only — that bug shipped once).
4. `origin` → the new repository; `upstream` → the source, **with the push URL
   disabled** to a path-style URL so a mistaken `git push upstream` fails
   loudly instead of confusingly.
5. Credential scan: risky filenames plus `AKIA`, `sk_live_`, `ghp_` and private
   key patterns.
6. `.env` created from `.env.example` with fresh 48-character
   `AUTH_SECRET`/`JOBS_SECRET`/`CRON_SECRET`, the previous school's identity
   blanked, and `chmod 600` applied **last** (a `mv` after the chmod resets the
   mode — that bug also shipped once).
7. Seed commit, refusing to proceed if `node_modules` is staged.
8. Optional `npm ci`, `prisma generate` and `--checks`.

**Six things never to do**, all of which the script refuses:

| Never | Why |
|---|---|
| Clone into the destination and leave Ykay's history attached | the two products blur immediately |
| Point `origin` at the source repository | the first push publishes to Ykay |
| Push to `upstream` | it is a read-only reference |
| Copy `.env`, `.next` or `node_modules` | secrets, build state and 200 MB of noise |
| Reuse the old database | school data must never mix |
| Hand-type the sequence | it has already gone wrong once |

---

## §3 — The upstream sync ritual

Ykay continues to be developed. Famex takes a change from it deliberately, never
automatically:

```bash
git fetch upstream
git log --oneline upstream/main ^HEAD          # what is new there
git diff HEAD...upstream/main -- <paths>       # what would come in
git cherry-pick <sha>                          # one change at a time
```

Rules:

1. **Never merge `upstream/main` into Famex.** Merge commits from the reference
   implementation reintroduce exactly the history this repo deliberately lacks.
2. **Take changes path-by-path or commit-by-commit**, with a test that proves it
   still behaves.
3. **Never sync anything from the EDUos layer** (super-admin, plans, tenancy,
   platform landing) — it is stripped here (§5).
4. **A sync is a normal PR**: it goes through the §8 gates like any other change.

---

## §4 — The rebrand ratchet

The baseline measurement is **550 brand literals across 153 files** in the base.
That number may fall and must never rise.

- `npm run audit:brand` reports findings against
  `scripts/brand-audit.baseline.json`.
- The baseline is re-cut **once**, at the end of W1, against the Famex identity.
- After that, new brand literals fail CI.
- Brand values come from tokens and settings: school name, crest, colours,
  contacts, letterhead, report-card header, email footer, PWA icons, PDF
  watermarks. Nothing hard-codes "Ykay", and nothing hard-codes "Famex" either —
  a second school must not require a code change.

---

## §5 — Single-school module switches

`School.modules` is the contract between what the school runs, what the nav
shows, and what the licence covers (F0-17, F0-25):

- every route group declares a module key;
- `npm run check:modules` (once W2 lands) asserts nav ↔ route ↔ entitlement
  agree — a screen with no key, or a key with no screen, fails CI;
- stripping the EDUos layer means **no module key exists for tenancy,
  plans or the super-admin console** — their absence is enforced, not remembered;
- the `Subscriptions` key is replaced by `licence-usage`, and the page behind it
  shows a single-school licence (§20 of the catalogue).

`schoolId` remains on business tables and `npm run check:tenant-coverage` stays
in CI: that is what keeps a future second campus a configuration decision rather
than a data-migration project. No *new* tenancy work is undertaken.

---

## §6 — Environments

| Environment | Purpose | Data | Notes |
|---|---|---|---|
| Local | development | seeded fixtures | `npm run db:seed*`; never production data |
| Staging | UAT and rehearsals | structure only, no real children | the school's staff test here |
| Production | the school | real | backups, monitoring, alerts on |

- **Separate databases, always.** A staging copy must never contain a real
  pupil's record; anonymise before copying anything.
- **Secrets live in the environment**, never in the repo. The clone script
  generates fresh ones per school.
- **Migrations run in staging first**, and the runbook records the exact
  migration applied at each release.

---

## §7 — Scheduled work

| Job | Current | Target |
|---|---|---|
| Notification dispatch | **once daily at 08:00, 25 jobs per run** | every 5 minutes, batched per channel, with retry and delivery receipts (W4) |
| Fee reminders | part of the daily drain | scheduled per due date, **utility templates only** |
| Attendance absence alerts | — | after the register closes, cheapest working channel (W5) |
| Licence/usage counters | — | hourly rollup from `AiUsage` + `MessageDispatch` (W12) |
| Backups | database daily | database daily + off-site copy, restore rehearsed quarterly (W12) |

A once-daily 08:00 drain is fine for announcements and wrong for anything
time-sensitive: a parent learning at 08:00 tomorrow that their child missed
school today is not a notification, it is a report.

---

## §8 — The first ten days

| Day | Action |
|---|---|
| 1 | Confirm the repo, remotes and gates; re-run `check:features` and `cost:model`; agree the schedule |
| 2 | W1 begins: list every EDUos artefact and delete it in one reviewable PR |
| 3 | Rebrand ratchet: tokens, assets, baseline re-cut for Famex |
| 4 | Single-school pass: module registry, Licence & Usage page, no tenant UI |
| 5 | W2 starts: provisioning wizard; first dry-run of a fresh school setup |
| 6 | Ledger design review: accounts, posting rules, opening balances (W3) |
| 7 | Paystack and WhatsApp accounts opened **in the school's name** |
| 8 | WABA registration submitted (Nigeria) — approval takes time, start early |
| 9 | Content plan agreed: who writes the first 500 CBT items and the first 20 lessons |
| 10 | First gate run on real work, output pasted into the PR; schedule re-based if W1 moved |

---

## §9 — Handover

The school owns its data, its domain and its WhatsApp account. Delivery includes
the export tooling (F19-12), the runbooks (F23-02, F23-03), the training pack
(F23-10) and a UAT pack the school runs itself (F23-11). A system the school
cannot operate without the original team is not finished.
