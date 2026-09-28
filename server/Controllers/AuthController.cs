using DrivingTestApi.Data;
using DrivingTestApi.DTOs;
using DrivingTestApi.Models;
using DrivingTestApi.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace DrivingTestApi.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ITokenService _tokenService;
    private readonly AppDbContext _db;
    private readonly IAuthLogQueue _authLogQueue;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        ITokenService tokenService,
        AppDbContext db,
        IAuthLogQueue authLogQueue)
    {
        _userManager = userManager;
        _tokenService = tokenService;
        _db = db;
        _authLogQueue = authLogQueue;
    }

    [HttpPost("login")]
    [EnableRateLimiting("login")]
    [Consumes("application/json")]
    public Task<ActionResult<LoginResponse>> LoginJson([FromBody] LoginRequest request)
        => LoginCore(request);

    [HttpPost("login")]
    [EnableRateLimiting("login")]
    [Consumes("application/x-www-form-urlencoded")]
    public Task<ActionResult<LoginResponse>> LoginForm([FromForm] LoginFormRequest request)
        => LoginCore(new LoginRequest(request.UserName, request.Password, request.DeviceId));

    private async Task<ActionResult<LoginResponse>> LoginCore(LoginRequest request)
    {
        var username = request.UserName?.Trim() ?? string.Empty;
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var userAgent = Request.Headers.UserAgent.ToString();

        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrEmpty(request.Password))
            return Unauthorized(new { message = "اسم المستخدم أو كلمة المرور غير صحيحة" });

        var user = await _userManager.FindByNameAsync(username);
        if (user is null)
        {
            _db.AuthLogs.Add(new AuthLog { AttemptedUserName = username, IpAddress = ip, UserAgent = userAgent, Success = false, Reason = "UserNotFound" });
            await _db.SaveChangesAsync();
            return Unauthorized(new { message = "اسم المستخدم أو كلمة المرور غير صحيحة" });
        }
        if (!user.IsActive)
        {
            _db.AuthLogs.Add(new AuthLog { UserId = user.Id, AttemptedUserName = username, IpAddress = ip, UserAgent = userAgent, Success = false, Reason = "AccountDisabled" });
            await _db.SaveChangesAsync();
            return Unauthorized(new { message = "هذا الحساب معطّل حالياً." });
        }
        if (user.AccessExpiresAt is not null && user.AccessExpiresAt < DateTime.UtcNow)
        {
            _db.AuthLogs.Add(new AuthLog { UserId = user.Id, AttemptedUserName = username, IpAddress = ip, UserAgent = userAgent, Success = false, Reason = "AccessExpired" });
            await _db.SaveChangesAsync();
            return Unauthorized(new { message = "انتهت صلاحية الاشتراك" });
        }
        if (await _userManager.IsLockedOutAsync(user))
        {
            _db.AuthLogs.Add(new AuthLog { UserId = user.Id, AttemptedUserName = username, IpAddress = ip, UserAgent = userAgent, Success = false, Reason = "LockedOut" });
            await _db.SaveChangesAsync();
            return Unauthorized(new { message = "تم إيقاف محاولات الدخول لهذا الحساب مؤقتاً بسبب محاولات فاشلة متكررة. حاول لاحقاً." });
        }

        if (!await _userManager.CheckPasswordAsync(user, request.Password))
        {
            await _userManager.AccessFailedAsync(user);
            _db.AuthLogs.Add(new AuthLog { UserId = user.Id, AttemptedUserName = username, IpAddress = ip, UserAgent = userAgent, Success = false, Reason = "WrongPassword" });
            await _db.SaveChangesAsync();

            if (await _userManager.IsLockedOutAsync(user))
                return Unauthorized(new { message = "تم إيقاف محاولات الدخول لهذا الحساب مؤقتاً بسبب محاولات فاشلة متكررة. حاول لاحقاً." });

            return Unauthorized(new { message = "اسم المستخدم أو كلمة المرور غير صحيحة" });
        }

        var role = (await _userManager.GetRolesAsync(user)).FirstOrDefault() ?? "Student";
        if (role != "Admin" && !string.IsNullOrEmpty(user.DeviceId) && !string.Equals(user.DeviceId, request.DeviceId, StringComparison.Ordinal))
        {
            _db.AuthLogs.Add(new AuthLog { UserId = user.Id, AttemptedUserName = username, IpAddress = ip, UserAgent = userAgent, Success = false, Reason = "DeviceMismatch" });
            await _db.SaveChangesAsync();
            return Unauthorized(new { message = "هذا الحساب مرتبط بجهاز آخر مسبقاً." });
        }

        var deviceWasAssigned = role != "Admin" && string.IsNullOrEmpty(user.DeviceId);
        var accessFailedResetNeeded = user.AccessFailedCount > 0;
        if (deviceWasAssigned)
            user.DeviceId = request.DeviceId;

        if (accessFailedResetNeeded)
            user.AccessFailedCount = 0;

        var jwt = _tokenService.CreateToken(user, role);
        Response.Cookies.Append("auth_token", jwt, new CookieOptions { HttpOnly = true, Secure = true, SameSite = SameSiteMode.None, Expires = DateTimeOffset.UtcNow.AddHours(12) });

        // حفظ تغييرات الحساب فقط عند الحاجة، مع تصفير عداد المحاولات الفاشلة بعد نجاح الدخول.
        if (deviceWasAssigned || accessFailedResetNeeded)
            await _db.SaveChangesAsync();

        // نحافظ على سجل الدخول الناجح بدون إضافة كتابة PostgreSQL إلى زمن استجابة الطلب.
        _authLogQueue.TryEnqueue(new AuthLog
        {
            UserId = user.Id,
            AttemptedUserName = username,
            IpAddress = ip,
            UserAgent = userAgent,
            Success = true,
            Reason = "Success"
        });

        return Ok(new LoginResponse(user.FullName, role, user.AccessExpiresAt, QuestionCountCache.Total));
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("auth_token");
        return Ok();
    }
}
