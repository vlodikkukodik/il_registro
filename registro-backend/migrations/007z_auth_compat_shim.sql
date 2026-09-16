-- 007z_auth_compat_shim.sql
-- Compatibility shim for native PostgreSQL deployments (no Supabase).
-- Supabase provisions an `auth` schema with `auth.uid()` used by RLS policies
-- in 008_rls_policies.sql. This app authenticates in the Go backend and never
-- sets Supabase auth context, so provide a harmless fallback that returns NULL
-- when no Supabase `auth.uid()` already exists (keeps real Supabase deployments untouched).

CREATE SCHEMA IF NOT EXISTS auth;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'auth' AND p.proname = 'uid'
    ) THEN
        CREATE FUNCTION auth.uid() RETURNS UUID AS $func$
            SELECT NULL::uuid;
        $func$ LANGUAGE sql STABLE;
    END IF;
END $$;
