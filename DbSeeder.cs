using System.Text.Json;
using DrivingTestApi.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace DrivingTestApi.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<AppDbContext>();
        // نتحقق فعلياً من وجود الجداول (لا نكتفي بالتحقق من وجود قاعدة البيانات نفسها،
        // لأن قاعدة postgres على Supabase موجودة دائماً بشكل افتراضي بغض النظر عن الجداول).
        var tablesExist = true;
        try
        {
            await db.Database.ExecuteSqlRawAsync("SELECT 1 FROM \"AspNetRoles\" LIMIT 1");
        }
        catch
        {
            tablesExist = false;
        }

        if (!tablesExist)
        {
            var createScript = db.Database.GenerateCreateScript();
            await db.Database.ExecuteSqlRawAsync(createScript);
        }

        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        foreach (var role in new[] { "Admin", "Student" })
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        // حساب الأدمن الأول يُنشأ من متغيرات البيئة SeedAdmin__UserName / SeedAdmin__Password
        // فقط عند أول تشغيل — وليس مكتوباً بالكود إطلاقاً.
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        var config = services.GetRequiredService<IConfiguration>();

        var adminUserName = config["SeedAdmin:UserName"];
        var adminPassword = config["SeedAdmin:Password"];

        if (!string.IsNullOrEmpty(adminUserName) && !string.IsNullOrEmpty(adminPassword))
        {
            var existingAdmin = await userManager.FindByNameAsync(adminUserName);
            if (existingAdmin is null)
            {
                var admin = new ApplicationUser
                {
                    UserName = adminUserName,
                    FullName = "Admin",
                    IsActive = true,
                    EmailConfirmed = true
                };

                var result = await userManager.CreateAsync(admin, adminPassword);
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(admin, "Admin");
                }
            }
        }

        await SeedQuestionsAsync(db);
    }

    // يزرع بنك الأسئلة الكامل (٣٣٧ سؤال: سير + إشارات + ميكانيك) من ملف JSON مرفق بالمشروع،
    // مرة واحدة فقط — إذا كان جدول الأسئلة فارغاً. تعديل الأسئلة لاحقاً يكون من قاعدة البيانات مباشرة.
    private static async Task SeedQuestionsAsync(AppDbContext db)
    {
        if (await db.Questions.AnyAsync()) return;

        var path = Path.Combine(AppContext.BaseDirectory, "Data", "SeedData", "questions.json");
        if (!File.Exists(path)) return;

        var json = await File.ReadAllTextAsync(path);
        var items = JsonSerializer.Deserialize<List<SeedQuestion>>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (items is null) return;

        foreach (var item in items)
        {
            if (!Enum.TryParse<QuestionCategory>(item.Category, true, out var category)) continue;

            db.Questions.Add(new Question
            {
                Category = category,
                Text = item.Text,
                Options = item.Options,
                CorrectAnswerIndex = item.CorrectAnswerIndex,
                Explanation = item.Explanation,
                ImageUrl = item.ImageUrl
            });
        }

        await db.SaveChangesAsync();
    }

    private class SeedQuestion
    {
        public string Category { get; set; } = "";
        public string Text { get; set; } = "";
        public List<string> Options { get; set; } = new();
        public int CorrectAnswerIndex { get; set; }
        public string? Explanation { get; set; }
        public string? ImageUrl { get; set; }
    }
}

