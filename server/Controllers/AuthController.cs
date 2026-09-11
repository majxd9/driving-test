using DrivingTestApi.Data;
using DrivingTestApi.DTOs;
using DrivingTestApi.Models;
using DrivingTestApi.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace DrivingTestApi.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ITokenService _tokenService;
    private readonly AppDbContext _db;

    public AuthController(UserManager<ApplicationUser> userManager, ITokenService tokenService, AppDbContext db)
    {
        _userManager = userManager;
        _tokenService = tokenService;
        _db = db;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var userAgent = Request.Headers.UserAgent.ToString();

        async Task LogAttempt(string? userId, bool success, string reason)
        {
            _db.AuthLogs.Add(new AuthLog
            {
                UserId = userId,
                AttemptedUserName = request.UserName,
                IpAddress = ip,
                UserAgent = userAgent,
                Success = success,
                Reason = reason
            });
            await _db.SaveChangesAsync();
        }

        var user = await _userManager.FindByNameAsync(request.UserName);
        if (user is null)
        {
            await LogAttempt(null, false, "UserNotFound");
            return Unauthorized(new { message = "اسم المستخدم أو كلمة المرور غير صحيحة" });
        }

        if (!user.IsActive)
        {
            await LogAttempt(user.Id, false, "AccountDisabled");
            return Unauthorized(new { message = "هذا الحساب معطّل حالياً." });
        }

        if (user.AccessExpiresAt is not null && user.AccessExpiresAt < DateTime.UtcNow)
        {
            await LogAttempt(user.Id, false, "AccessExpired");
            return Unauthorized(new { message = "انتهت صلاحية الاشتراك" });
        }

        var passwordValid = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!passwordValid)
        {
            await LogAttempt(user.Id, false, "WrongPassword");
            return Unauthorized(new { message = "اسم المستخدم أو كلمة المرور غير صحيحة" });
        }

        // الأدمن غير مقيّد بجهاز. الطالب فقط يثبّت أول جهاز ناجح ثم يُرفض أي جهاز آخر.
        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? "Student";
        if (role == "Student")
        {
            if (string.IsNullOrEmpty(user.DeviceId)) user.DeviceId = request.DeviceId;
            else if (user.DeviceId != request.DeviceId)
            {
                await LogAttempt(user.Id, false, "DeviceMismatch");
                return Unauthorized(new { message = "هذا الحساب مرتبط بجهاز آخر مسبقاً." });
            }
        }

        var jwt = _tokenService.CreateToken(user, role);

        Response.Cookies.Append("auth_token", jwt, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Expires = DateTimeOffset.UtcNow.AddHours(12)
        });

        _db.AuthLogs.Add(new AuthLog
        {
            UserId = user.Id,
            AttemptedUserName = request.UserName,
            IpAddress = ip,
            UserAgent = userAgent,
            Success = true,
            Reason = "Success"
        });
        await _db.SaveChangesAsync();
        return Ok(new LoginResponse(user.FullName, role, user.AccessExpiresAt));
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("auth_token");
        return Ok();
    }
}
