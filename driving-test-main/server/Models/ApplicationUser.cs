using Microsoft.AspNetCore.Identity;

namespace DrivingTestApi.Models;

// حساب المستخدم — مبني فوق نظام Identity الجاهز في ASP.NET Core
// (كلمة المرور تُخزَّن مُجزّأة Hash تلقائياً، لا يوجد نص صريح أبداً)
public class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;

    // الأدمن بيقدر يعطّل أي حساب لحظياً من غير ما يحذفه
    public bool IsActive { get; set; } = true;

    // الجهاز المرتبط بالحساب. null = الحساب لسا ما استُخدم على أي جهاز.
    // أول تسجيل دخول ناجح بيثبّت هاد الحقل تلقائياً.
    public string? DeviceId { get; set; }

    // تاريخ انتهاء صلاحية الوصول (مثال: 90 يوم من تاريخ الإنشاء). null = بدون انتهاء.
    public DateTime? AccessExpiresAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
