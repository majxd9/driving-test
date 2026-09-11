using System.Text.Json;
using DrivingTestApi.Models;
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

        // تخزين القوائم (Options / QuestionIds) كنص JSON داخل عمود واحد — أبسط حل لمشروع بهالحجم.
        // ملاحظة: EF Core ممكن يطبع تحذيراً بسيطاً بالكونسول بخصوص هالنوع من القوائم، هذا طبيعي ولا يؤثر على عمل النظام.
        var stringListConverter = new ValueConverter<List<string>, string>(
            v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
            v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>());

        var intListConverter = new ValueConverter<List<int>, string>(
            v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
            v => JsonSerializer.Deserialize<List<int>>(v, (JsonSerializerOptions?)null) ?? new List<int>());

        builder.Entity<Question>()
            .Property(q => q.Options)
            .HasConversion(stringListConverter);

        builder.Entity<ExamModel>()
            .Property(e => e.QuestionIds)
            .HasConversion(intListConverter);

        builder.Entity<ExamAttempt>()
            .Property(e => e.WrongQuestionIds)
            .HasConversion(intListConverter);

        builder.Entity<ExamAttempt>()
            .HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(e => e.StudentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ExamAttempt>()
            .HasIndex(e => new { e.StudentId, e.CreatedAt });
    }
}
