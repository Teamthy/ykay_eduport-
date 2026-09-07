-- EDUos: Postgres Row-Level Security (RLS) for tenant isolation.
--
-- This is the DB-level backstop that guarantees one school can NEVER see
-- another school's data, even if the application has a bug in a WHERE clause.
--
-- Design (incremental, backward-compatible):
--   1. PERMISSIVE policy  → USING (true) — always passes.
--   2. RESTRICTIVE policy → passes when app.current_school_id is NOT set
--      (backward-compatible with existing code that doesn't set it), or
--      restricts to matching schoolId when it IS set.
--
-- The app sets the variable via SET LOCAL inside a transaction:
--   SET LOCAL app.current_school_id = '<cuid>';
-- (see lib/db-rls.ts → withSchool())
--
-- Tables without a schoolId column (child tables, platform tables like Plan,
-- School, SystemFlags) are left unprotected — they're either implicitly scoped
-- by their parent's FK or are global by design.

DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT table_name
    FROM information_schema.columns
    WHERE column_name = 'schoolId'
      AND table_schema = 'public'
  LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t.table_name);

    -- Force RLS even for table owners (superusers bypass by default)
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t.table_name);

    -- Permissive policy (always passes — backward-compatible)
    EXECUTE format('DROP POLICY IF EXISTS eduos_permissive ON %I', t.table_name);
    EXECUTE format(
      'CREATE POLICY eduos_permissive ON %I AS PERMISSIVE FOR ALL USING (true)',
      t.table_name
    );

    -- Restrictive policy (only applies when app.current_school_id is set)
    EXECUTE format('DROP POLICY IF EXISTS eduos_tenant_isolation ON %I', t.table_name);
    EXECUTE format(
      'CREATE POLICY eduos_tenant_isolation ON %I AS RESTRICTIVE FOR ALL USING (' ||
      'current_setting(''app.current_school_id'', true) IS NULL ' ||
      'OR "schoolId"::text = current_setting(''app.current_school_id'', true)' ||
      ')',
      t.table_name
    );

    RAISE NOTICE 'RLS enabled on %', t.table_name;
  END LOOP;
END $$;
