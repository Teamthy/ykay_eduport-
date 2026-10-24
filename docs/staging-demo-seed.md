# Isolated staging demo seed

This seed is only for a separate Neon test branch. It creates fictional accounts so the Ykay College team can inspect role-specific pages before real onboarding. **Never run it against a database used by the public deployment.** The public OCI deployment can still connect to Neon; the hosting provider does not determine whether a database is staging or Production.

Create a separate Neon branch from the migrated schema branch for demo testing. Use that branch's direct connection URL in the staging environment; do not point the seed workflow at the database branch used by a public deployment.

## Protected GitHub setup

In repository **Settings → Environments**, create `staging-demo` and:

1. Restrict deployments to the `main` branch and require an approver.
2. Add these environment **secrets**:
   - `STAGING_DIRECT_DATABASE_URL` — the unpooled/direct Neon URL for the isolated demo branch.
   - `DEMO_SEED_PASSWORD` — a staging-only password of at least 12 characters. All fictional accounts share it for test convenience; never reuse it or distribute it with Production credentials.
3. Add these environment **variables**:
   - `STAGING_DATABASE_HOST` — hostname only; it must exactly match the staging URL's hostname. Do not include a scheme, port, path, or credentials.
   - `PRODUCTION_DATABASE_STATUS` — set to `NOT_PROVISIONED` while no Production database exists. In that state, leave `PRODUCTION_DATABASE_HOST` unset; do not use a placeholder.
   - Once Production is provisioned, change `PRODUCTION_DATABASE_STATUS` to `AVAILABLE` and set `PRODUCTION_DATABASE_HOST` to the actual Production hostname. It must differ from staging.

The workflow refuses pooled Neon URLs, non-Neon URLs, host mismatches, and identical staging/Production hosts. It uses only `STAGING_DIRECT_DATABASE_URL`; it does not read the `production-migrations` environment secret. When `PRODUCTION_DATABASE_STATUS` is `NOT_PROVISIONED`, the exact staging-host allowlist, protected environment, and manual confirmation remain required.

## Run sequence

1. Open **Actions → Staging demo data seed**, select branch `main`, and run `status`. This validates the target and checks that migrations are up to date; it is read-only.
2. Confirm that the database host belongs to the separate Neon demo branch and is not used by the current public site or OCI Production.
3. Dispatch again with operation `seed` and exact confirmation `SEED STAGING DEMO`. The seed is idempotent for its demo accounts and does not delete existing records.

The script also checks the target and confirmation before it writes. No secret values are logged. A successful seed run reports the number of accounts by role.

## Seeded test data

The seed creates 72 fictional accounts:

| Role | Count |
|---|---:|
| `SUPER_ADMIN` | 1 |
| `ADMIN` | 1 |
| `DIRECTOR` | 1 |
| `BURSAR` | 1 |
| `COORDINATOR` | 1 |
| `HOD` | 1 |
| `TEACHER` | 5 |
| `STUDENT` | 50 |
| `PARENT` | 10 |
| `IT_STUDENT` | 1 |

It also creates the Ykay school record if absent, 12 classes, two compulsory demo subjects per level, teacher profiles and assignments, 50 student profiles and current-session enrolments, and 10 parent profiles linked to five fictional students each. The IT student receives a staging-only sample course. All login addresses use the non-deliverable `demo.example.invalid` domain; no real people or email recipients are used.

This is a role/profile fixture, **not** a full application-wide demo dataset. It does not fabricate fee invoices, payments, exam results, attendance history, or real onboarding records. Payment flows must be tested separately in an isolated environment with appropriate safeguards.

### Login addresses

All 72 accounts share the protected `DEMO_SEED_PASSWORD` value in this isolated environment; the password is never printed by the workflow. Use these addresses:

- `super-admin@demo.example.invalid` — `SUPER_ADMIN`
- `admin@demo.example.invalid` — `ADMIN`
- `director@demo.example.invalid` — `DIRECTOR`
- `bursar@demo.example.invalid` — `BURSAR`
- `coordinator@demo.example.invalid` — `COORDINATOR`
- `hod@demo.example.invalid` — `HOD`
- `it-student@demo.example.invalid` — `IT_STUDENT`
- `teacher01@demo.example.invalid` through `teacher05@demo.example.invalid`
- `student001@demo.example.invalid` through `student050@demo.example.invalid`
- `parent001@demo.example.invalid` through `parent010@demo.example.invalid`

The demo `SUPER_ADMIN` is intentionally privileged within this isolated database. Do not use its credentials on Production. The regular Ykay onboarding seed (`db:seed-ykay`) remains separate and is not run by this workflow.
