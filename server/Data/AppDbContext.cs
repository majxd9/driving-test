using System.Text.Json;
using DrivingTestApi.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace DrivingTestApi.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Question> Questions => Set<Question>();
    public DbSet<ExamModel> ExamModels => Set<ExamModel>();
    public DbSet<AuthLog> AuthLogs => Set<AuthLog>();
    public DbSet<ExamAttempt> ExamAttempts => Set<ExamAttempt>();
    public DbSet<ExamResult> ExamResults => Set<ExamResult>();
    public DbSet<QuestionAudio> QuestionAudios => Set<QuestionAudio>();
    public DbSet<SystemAudio> SystemAudios => Set<SystemAudio>();
    public DbSet<AiGenerationJob> AiGenerationJobs => Set<AiGenerationJob>();
    public DbSet<QuestionAiImage> QuestionAiImages => Set<QuestionAiImage>();
    public DbSet<AiImageReview> AiImageReviews => Set<AiImageReview>();
    public DbSet<AiTestRun> AiTestRuns => Set<AiTestRun>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Store small list properties as JSON while providing explicit value comparers so
        // EF Core detects in-place list changes correctly.
        var stringListConverter = new ValueConverter<List<string>, string>(
            v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
            v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>());

        var stringListComparer = new ValueComparer<List<string>>(
            (a, b) => ReferenceEquals(a, b) || (a != null && b != null && a.SequenceEqual(b, StringComparer.Ordinal)),
            value => value.Aggregate(0, (hash, item) => HashCode.Combine(hash, item == null ? 0 : StringComparer.Ordinal.GetHashCode(item))),
            value => value.ToList());

        var intListConverter = new ValueConverter<List<int>, string>(
            v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
            v => JsonSerializer.Deserialize<List<int>>(v, (JsonSerializerOptions?)null) ?? new List<int>());

        var intListComparer = new ValueComparer<List<int>>(
            (a, b) => ReferenceEquals(a, b) || (a != null && b != null && a.SequenceEqual(b)),
            value => value.Aggregate(0, HashCode.Combine),
            value => value.ToList());

        builder.Entity<Question>()
            .Property(q => q.Options)
            .HasConversion(stringListConverter, stringListComparer);

        builder.Entity<QuestionAudio>()
            .HasKey(x => x.QuestionId);

        builder.Entity<SystemAudio>()
            .HasKey(x => x.Key);

        builder.Entity<AiGenerationJob>()
            .HasIndex(x => new { x.QuestionId, x.JobType, x.ContentHash })
            .IsUnique();

        builder.Entity<AiGenerationJob>()
            .HasIndex(x => new { x.Status, x.NextAttemptAt, x.Priority, x.CreatedAt });

        builder.Entity<AiGenerationJob>()
            .HasOne<Question>()
            .WithMany()
            .HasForeignKey(x => x.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<QuestionAiImage>()
            .HasKey(x => x.QuestionId);

        builder.Entity<QuestionAiImage>()
            .HasOne<Question>()
            .WithOne()
            .HasForeignKey<QuestionAiImage>(x => x.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<AiImageReview>()
            .HasKey(x => x.QuestionId);

        builder.Entity<AiImageReview>()
            .HasOne<Question>()
            .WithOne()
            .HasForeignKey<AiImageReview>(x => x.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<AiImageReview>()
            .HasIndex(x => new { x.Status, x.CreatedAt });

        builder.Entity<AiTestRun>()
            .HasIndex(x => new { x.Status, x.CreatedAt });

        builder.Entity<AiTestRun>()
            .HasOne<Question>()
            .WithMany()
            .HasForeignKey(x => x.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<QuestionAudio>()
            .HasOne<Question>()
            .WithOne()
            .HasForeignKey<QuestionAudio>(x => x.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ExamModel>()
            .Property(e => e.QuestionIds)
            .HasConversion(intListConverter, intListComparer);

        builder.Entity<ExamAttempt>()
            .Property(e => e.WrongQuestionIds)
            .HasConversion(intListConverter);

        builder.Entity<ExamAttempt>()
            .Property(e => e.QuestionIds)
            .HasConversion(intListConverter);

        builder.Entity<ExamAttempt>()
            .HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(e => e.StudentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ExamAttempt>()
            .HasIndex(e => new { e.StudentId, e.CreatedAt });

        builder.Entity<ExamAttempt>()
            .HasIndex(e => new { e.StudentId, e.Completed, e.ExpiresAt });

        builder.Entity<AiTestRun>()
            .HasIndex(e => e.QuestionId);
    }
}
