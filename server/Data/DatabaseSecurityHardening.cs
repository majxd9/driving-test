using Microsoft.EntityFrameworkCore;

namespace DrivingTestApi.Data;

/// <summary>
/// Database-level hardening for the application's public schema.
///
/// The API uses ASP.NET Identity/JWT and EF Core over a direct PostgreSQL
/// connection. Students do not access Supabase/PostgREST directly, so the
/// safe default for anon/authenticated is deny-all at the database layer.
/// The trusted backend connection remains functional because it currently
/// uses the postgres role, which has BYPASSRLS.
/// </summary>
public static class DatabaseSecurityHardening
{
    public static Task ApplyAsync(AppDbContext db)
    {
        const string sql = """
DO $$
DECLARE
    table_name text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'AspNetRoles',
        'AspNetUsers',
        'AuthLogs',
        'ExamModels',
        'Questions',
        'AspNetRoleClaims',
        'AspNetUserClaims',
        'AspNetUserLogins',
        'AspNetUserRoles',
        'AspNetUserTokens',
        'ExamResults',
        'ExamAttempts',
        'QuestionAudios',
        'SystemAudios',
        'AiGenerationJobs',
        'QuestionAiImages',
        'AiGenerationUsage',
        'AiGenerationControl',
        'AiImageReviews',
        'AiTestRuns'
    ]
    LOOP
        EXECUTE format(
            'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
            table_name
        );

        EXECUTE format(
            'REVOKE ALL ON TABLE public.%I FROM anon, authenticated, service_role',
            table_name
        );
    END LOOP;
END
$$;

-- Keep future postgres-owned application tables closed to the Supabase API roles.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON TABLES FROM anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;

-- The application is not using PostgREST RPCs. Do not expose future public
-- functions by the PostgreSQL default EXECUTE privilege.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;

-- These helper functions existed before the hardening work. Keep them
-- backend-only and pin their search_path to remove the linter warning.
DO $$
BEGIN
    IF to_regprocedure('public.driving_prepare_tts_text(text)') IS NOT NULL THEN
        EXECUTE 'REVOKE EXECUTE ON FUNCTION public.driving_prepare_tts_text(text) FROM PUBLIC, anon, authenticated, service_role';
        EXECUTE 'ALTER FUNCTION public.driving_prepare_tts_text(text) SET search_path = pg_catalog';
    END IF;

    IF to_regprocedure('public.driving_question_audio_current_hash(integer)') IS NOT NULL THEN
        EXECUTE 'REVOKE EXECUTE ON FUNCTION public.driving_question_audio_current_hash(integer) FROM PUBLIC, anon, authenticated, service_role';
        EXECUTE 'ALTER FUNCTION public.driving_question_audio_current_hash(integer) SET search_path = pg_catalog, public, extensions';
    END IF;
END
$$;
""";

        return db.Database.ExecuteSqlRawAsync(sql);
    }
}
