# Database security model

## Current architecture

The frontend never connects to Supabase/PostgREST directly.

The request path is:

`Student/Admin -> ASP.NET Core API -> EF Core -> PostgreSQL`

The application authenticates users with ASP.NET Identity + JWT. There is no mapping between `AspNetUsers.Id` and `auth.uid()`.

## RLS policy decision

All 20 application tables in the `public` schema use **RLS enabled + deny by default**.

No `anon` or `authenticated` policies are intentionally created because those roles are not part of the application's data access path.

That means:

- direct Data API table access remains unavailable to `anon` and `authenticated`
- accidental future grants still cannot expose rows without a policy
- EF Core continues to work through the trusted server connection

## PostgreSQL grants

The application tables explicitly revoke table privileges from:

- `anon`
- `authenticated`
- `service_role`

Default privileges for future `postgres`-owned tables and sequences are also revoked from those roles.

Public function execution is disabled by default for future `postgres`-owned functions.

## Backend role

Production connections observed from the database use the `postgres` role.

`postgres` has `BYPASSRLS`, so the current backend is intentionally not constrained by RLS. This is a defense-in-depth boundary for other PostgreSQL/API roles, not the application's primary authorization mechanism.

## Verification

Run the following checks after deployments:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated', 'service_role')
order by table_name, grantee, privilege_type;

select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Expected result for application tables:

- `rowsecurity = true`
- no table grants for `anon/authenticated/service_role`
- no direct-user policies
