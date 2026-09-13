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
        request.UserName = request.UserName?.Trim() ?? string.Empty;
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var userAgent = Request.Headers.UserAgent.ToString();

        var user = await _userManager.FindByNameAsync(request.UserName);
        if (user is null)
        {
            _db.AuthLogs.Add(new AuthLog { AttemptedUserName = request.UserName, IpAddress = ip, UserAgent = userAgent, Success = false, Reason = "UserNotFound" });
            await _db.SaveChangesAsync();
            return Unauthorized(new { message = "اسم المستخدم أو كلمة المرور غير صحيحة" });
        }
        if (!user.IsActive)
        {
            _db.AuthLogs.Add(new AuthLog { UserId = user.Id, AttemptedUserName = request.UserName, IpAddress = ip, UserAgent = userAgent, Success = false, Reason = "AccountDisabled" });
            await _db.SaveChangesAsync();
            return Unauthorized(new { message = "هذا الحساب معطّل حالياً." });
        }
        if (user.AccessExpiresAt is not null && user.AccessExpiresAt < DateTime.UtcNow)
        {
            _db.AuthLogs.Add(new AuthLog { UserId = user.Id, AttemptedUserName = request.UserName, IpAddress = ip, UserAgent = userAgent, Success = false, Reason = "AccessExpired" });
            await _db.SaveChangesAsync();
            return Unauthorized(new { message = "انتهت صلاحية الاشتراك" });
        }
        if (!await _userManager.CheckPasswordAsync(user, request.Password))
        {
            _db.AuthLogs.Add(new AuthLog { UserId = user.Id, AttemptedUserName = request.UserName, IpAddress = ip, UserAgent = userAgent, Success = false, Reason = "WrongPassword" });
            await _db.SaveChangesAsync();
            return Unauthorized(new { message = "اسم المستخدم أو كلمة المرور غير صحيحة" });
        }

        var role = (await _userManager.GetRolesAsync(user)).FirstOrDefault() ?? "Student";
        if (role != "Admin" && !string.IsNullOrEmpty(user.DeviceId) && !string.Equals(user.DeviceId, request.DeviceId, StringComparison.Ordinal))
        {
            _db.AuthLogs.Add(new AuthLog { UserId = user.Id, AttemptedUserName = request.UserName, IpAddress = ip, UserAgent = userAgent, Success = false, Reason = "DeviceMismatch" });
            await _db.SaveChangesAsync();
            return Unauthorized(new { message = "هذا الحساب مرتبط بجهاز آخر مسبقاً." });
        }

        if (role != "Admin" && string.IsNullOrEmpty(user.DeviceId))
            user.DeviceId = request.DeviceId;

        var jwt = _tokenService.CreateToken(user, role);
        Response.Cookies.Append("auth_token", jwt, new CookieOptions { HttpOnly = true, Secure = true, SameSite = SameSiteMode.None, Expires = DateTimeOffset.UtcNow.AddHours(12) });
        _db.AuthLogs.Add(new AuthLog { UserId = user.Id, AttemptedUserName = request.UserName, IpAddress = ip, UserAgent = userAgent, Success = true, Reason = "Success" });
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
