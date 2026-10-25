-- RLS: two tenant tables were created after the backfill loop and never got a
-- policy.
--
-- 20260804000000_rls_backfill_and_coverage_guard loops over every table that
-- carried a `schoolId` *at the time it ran*. It deliberately installs no DDL
-- event trigger (it deadlocks on CREATE TABLE — see the comment in that
-- migration), so coverage is enforced outside the database by
-- `npm run verify:rls:coverage`. That check is how these two were found:
--
--   TimetableSlot  created 20260810  schoolId NOT NULL  no policy  → CI red
--   CbtAttempt     created 20260904  schoolId NULL      no policy  → CI red
--
-- Without a policy, both tables are readable and writable across tenants by any
-- role that can reach them. TimetableSlot holds every class's timetable, and
-- CbtAttempt holds practice and exam attempts with their scores and the student
-- they belong to.
--
-- eduos_apply_tenant_rls() is idempotent: it enables RLS, forces it (so the
-- table owner cannot bypass it either), and recreates the permissive plus the
-- restrictive isolation policies. Re-running this migration is a no-op.
--
-- CbtAttempt.schoolId is nullable for attempts recorded before sessions were
-- introduced. The policy compares `"schoolId"::text` to the session GUC, so
-- those legacy rows are only visible when no tenant context is set — which is
-- how every current CBT route reads them. Do not "fix" the column by
-- backfilling a school onto rows that have no verified owner.

SELECT eduos_apply_tenant_rls('TimetableSlot');
SELECT eduos_apply_tenant_rls('CbtAttempt');

-- Prove it took, so a partially-applied migration fails here rather than in CI
-- an hour later.
DO $$
DECLARE
  unprotected text;
BEGIN
  SELECT string_agg(c.table_name, ', ' ORDER BY c.table_name)
    INTO unprotected
  FROM information_schema.columns c
  JOIN pg_class pc ON pc.relname = c.table_name
  JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = 'public'
  WHERE c.table_schema = 'public'
    AND c.column_name = 'schoolId'
    AND c.table_name IN ('TimetableSlot', 'CbtAttempt')
    AND (NOT pc.relrowsecurity OR NOT pc.relforcerowsecurity);

  IF unprotected IS NOT NULL THEN
    RAISE EXCEPTION 'RLS still missing on: %', unprotected;
  END IF;
END $$;
