using System.Text;
using DrivingTestApi.Data;
using DrivingTestApi.Models;
using DrivingTestApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Caching.Memory;
using System.Globalization;
using System.Security.Claims;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("لم يتم ضبط ConnectionStrings__DefaultConnection.");
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("لم يتم ضبط Jwt__Key.");
if (jwtKey.Length < 32)
    throw new InvalidOperationException("Jwt__Key يجب أن يكون بطول 32 محرفاً على الأقل.");

var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "DrivingTestApi";
var frontendOrigin = (builder.Configuration["FrontendOrigin"] ?? "http://localhost:5173").TrimEnd('/');

if (!builder.Environment.IsDevelopment() && string.IsNullOrWhiteSpace(builder.Configuration["FrontendOrigin"]))
    throw new InvalidOperationException("يجب ضبط FrontendOrigin في بيئة الإنتاج.");

builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.Password.RequiredLength = 8;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
})
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = false,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(1)
    };
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            if (context.Request.Cookies.TryGetValue("auth_token", out var token)) context.Token = token;
            return Task.CompletedTask;
        },
        OnTokenValidated = async context =>
        {
            var userId = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
            var tokenRole = context.Principal?.FindFirstValue(ClaimTypes.Role);
            if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(tokenRole))
            {
                context.Fail("Invalid session.");
                return;
            }

            var cache = context.HttpContext.RequestServices.GetRequiredService<IMemoryCache>();
            var cacheKey = $"auth-status:{userId}:{tokenRole}";

            if (!cache.TryGetValue(cacheKey, out bool valid))
            {
                var userManager = context.HttpContext.RequestServices.GetRequiredService<UserManager<ApplicationUser>>();
                var user = await userManager.FindByIdAsync(userId);
                var roles = user is null ? Array.Empty<string>() : await userManager.GetRolesAsync(user);

                valid = user is not null
                    && user.IsActive
                    && (user.AccessExpiresAt is null || user.AccessExpiresAt > DateTime.UtcNow)
                    && roles.Contains(tokenRole, StringComparer.Ordinal);

                cache.Set(cacheKey, valid, TimeSpan.FromSeconds(30));
            }

            if (!valid)
                context.Fail("Session is no longer valid.");
        }
    };
});

builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
    options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(new[] { "application/json", "text/plain", "text/css", "application/javascript", "image/svg+xml" });
});
builder.Services.Configure<BrotliCompressionProviderOptions>(o => o.Level = System.IO.Compression.CompressionLevel.Fastest);
builder.Services.Configure<GzipCompressionProviderOptions>(o => o.Level = System.IO.Compression.CompressionLevel.Fastest);
builder.Services.AddAuthorization();
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<IClientIpResolver, ClientIpResolver>();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, cancellationToken) =>
    {
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
            context.HttpContext.Response.Headers.RetryAfter = ((int)Math.Ceiling(retryAfter.TotalSeconds)).ToString(CultureInfo.InvariantCulture);
        await context.HttpContext.Response.WriteAsJsonAsync(new { message = "تم تجاوز عدد المحاولات المسموح بها. حاول بعد قليل." }, cancellationToken);
    };
    options.AddPolicy("login", httpContext =>
    {
        var clientIp = httpContext.RequestServices.GetRequiredService<IClientIpResolver>().GetClientIp(httpContext) ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(
            clientIp,
            _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 8,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true
            });
    });
});
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddSingleton<IAuthLogQueue, AuthLogQueue>();
builder.Services.AddHostedService<AuthLogWriter>();
builder.Services.AddHostedService<StartupMaintenanceService>();
builder.Services.AddScoped<AiGenerationJobService>();
builder.Services.AddScoped<ElevenLabsQuestionAudioGenerator>();
builder.Services.AddScoped<LocalQuestionAudioGenerator>();
builder.Services.AddScoped<IQuestionAudioGenerator>(sp =>
    string.Equals(
        builder.Configuration["QUESTION_AUDIO_PROVIDER"] ?? "elevenlabs",
        "local",
        StringComparison.OrdinalIgnoreCase)
        ? sp.GetRequiredService<LocalQuestionAudioGenerator>()
        : sp.GetRequiredService<ElevenLabsQuestionAudioGenerator>());
builder.Services.AddScoped<ComfyUiQuestionImageGenerator>();
builder.Services.AddScoped<IQuestionImageGenerator>(sp =>
    sp.GetRequiredService<ComfyUiQuestionImageGenerator>());
builder.Services.AddHostedService<AiGenerationWorker>();
builder.Services.AddCors(options => options.AddPolicy("Frontend", policy => policy.WithOrigins(frontendOrigin).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
builder.Services.AddControllers();
builder.Services.AddHttpClient("ElevenLabs", client =>
{
    client.BaseAddress = new Uri("https://api.elevenlabs.io/");
    client.Timeout = TimeSpan.FromSeconds(90);
});
builder.Services.AddHttpClient("LocalTts", client =>
{
    client.BaseAddress = new Uri(
        builder.Configuration["QUESTION_AUDIO_LOCAL_URL"] ?? "http://127.0.0.1:5000");
    client.Timeout = TimeSpan.FromMinutes(10);
});
builder.Services.AddHttpClient("ComfyUI", client =>
{
    client.BaseAddress = new Uri(
        builder.Configuration["QUESTION_IMAGE_COMFYUI_URL"] ?? "http://127.0.0.1:8188");
    client.Timeout = TimeSpan.FromSeconds(60);
});
builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

// The production database already exists and this project does not use EF migrations.
// Create the small AI-audio table before accepting requests so question queries never
// race the schema creation on a cold start.
using (var schemaScope = app.Services.CreateScope())
{
    var db = schemaScope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS "QuestionAudios" (
            "QuestionId" integer NOT NULL,
            "AudioBytes" bytea NOT NULL,
            "ContentHash" text NOT NULL,
            "CreatedAt" timestamp with time zone NOT NULL,
            CONSTRAINT "PK_QuestionAudios" PRIMARY KEY ("QuestionId"),
            CONSTRAINT "FK_QuestionAudios_Questions_QuestionId"
                FOREIGN KEY ("QuestionId") REFERENCES "Questions" ("Id") ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS "SystemAudios" (
            "Key" text NOT NULL,
            "AudioBytes" bytea NOT NULL,
            "ContentHash" text NOT NULL,
            "CreatedAt" timestamp with time zone NOT NULL,
            CONSTRAINT "PK_SystemAudios" PRIMARY KEY ("Key")
        );

        CREATE TABLE IF NOT EXISTS "AiGenerationJobs" (
            "Id" bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            "QuestionId" integer NOT NULL,
            "JobType" integer NOT NULL,
            "Status" integer NOT NULL,
            "Attempts" integer NOT NULL,
            "ContentHash" text NOT NULL,
            "Priority" integer NOT NULL,
            "CreatedAt" timestamp with time zone NOT NULL,
            "UpdatedAt" timestamp with time zone NOT NULL,
            "StartedAt" timestamp with time zone NULL,
            "CompletedAt" timestamp with time zone NULL,
            "NextAttemptAt" timestamp with time zone NULL,
            "LockedUntil" timestamp with time zone NULL,
            "LastError" text NULL,
            CONSTRAINT "FK_AiGenerationJobs_Questions_QuestionId"
                FOREIGN KEY ("QuestionId") REFERENCES "Questions" ("Id") ON DELETE CASCADE
        );

        CREATE UNIQUE INDEX IF NOT EXISTS "IX_AiGenerationJobs_QuestionId_JobType_ContentHash"
            ON "AiGenerationJobs" ("QuestionId", "JobType", "ContentHash");

        CREATE INDEX IF NOT EXISTS "IX_AiGenerationJobs_Status_NextAttemptAt_Priority_CreatedAt"
            ON "AiGenerationJobs" ("Status", "NextAttemptAt", "Priority", "CreatedAt");

        CREATE TABLE IF NOT EXISTS "QuestionAiImages" (
            "QuestionId" integer NOT NULL,
            "ImageBytes" bytea NOT NULL,
            "ContentHash" text NOT NULL,
            "ContentType" text NOT NULL,
            "CreatedAt" timestamp with time zone NOT NULL,
            CONSTRAINT "PK_QuestionAiImages" PRIMARY KEY ("QuestionId"),
            CONSTRAINT "FK_QuestionAiImages_Questions_QuestionId"
                FOREIGN KEY ("QuestionId") REFERENCES "Questions" ("Id") ON DELETE CASCADE
        );
        """);
}


if (!app.Environment.IsDevelopment())
    app.UseHsts();

app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";

    if (HttpMethods.IsPost(context.Request.Method) || HttpMethods.IsPut(context.Request.Method) || HttpMethods.IsPatch(context.Request.Method) || HttpMethods.IsDelete(context.Request.Method))
    {
        var origin = context.Request.Headers.Origin.ToString();
        if (!string.IsNullOrWhiteSpace(origin) && !string.Equals(origin, frontendOrigin, StringComparison.OrdinalIgnoreCase))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new { message = "الطلب غير مسموح من هذا المصدر." });
            return;
        }
    }

    await next();
});

// لا نوقف جاهزية الـAPI بعمليات seed/repair أو قراءة عدد الأسئلة.
// هذه الأعمال تُنفذ في الخلفية بعد بدء استقبال الطلبات.

app.UseHttpsRedirection();
app.UseRouting();
app.UseRateLimiter();
app.UseResponseCompression();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = context =>
    {
        var path = context.Context.Request.Path.Value ?? string.Empty;
        if (path.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase) || path.StartsWith("/signs/", StringComparison.OrdinalIgnoreCase) || path.StartsWith("/mechanic/", StringComparison.OrdinalIgnoreCase))
            context.Context.Response.Headers.CacheControl = "public,max-age=31536000,immutable";
    }
});
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/healthz", () => Results.Ok(new { status = "ok" }))
    .AllowAnonymous();

app.MapControllers();
app.Run();
