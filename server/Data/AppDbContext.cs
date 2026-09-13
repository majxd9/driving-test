using System.Text.Json;
using DrivingTestApi.Models;
using DrivingTestApi.Services;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
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

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        var stringListConverter = new ValueConverter<List<string>, string>(
            v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
            v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>());

        var intListConverter = new ValueConverter<List<int>, string>(
            v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
            v => JsonSerializer.Deserialize<List<int>>(v, (JsonSerializerOptions?)null) ?? new List<int>());

        builder.Entity<Question>().Property(q => q.Options).HasConversion(stringListConverter);
        builder.Entity<ExamModel>().Property(e => e.QuestionIds).HasConversion(intListConverter);
        builder.Entity<ExamAttempt>().Property(e => e.WrongQuestionIds).HasConversion(intListConverter);

        builder.Entity<ExamAttempt>()
            .HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(e => e.StudentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ExamAttempt>()
            .HasIndex(e => new { e.StudentId, e.CreatedAt });
    }

    public override int SaveChanges()
    {
        var changes = GetQuestionChanges();
        var result = base.SaveChanges();
        QuestionCountCache.ApplyChanges(changes.added, changes.deleted);
        return result;
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var changes = GetQuestionChanges();
        var result = await base.SaveChangesAsync(cancellationToken);
        QuestionCountCache.ApplyChanges(changes.added, changes.deleted);
        return result;
    }

    private (int added, int deleted) GetQuestionChanges()
    {
        var added = ChangeTracker.Entries<Question>().Count(e => e.State == EntityState.Added);
        var deleted = ChangeTracker.Entries<Question>().Count(e => e.State == EntityState.Deleted);
        return (added, deleted);
    }
}
