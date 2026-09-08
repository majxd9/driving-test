namespace DrivingTestApi.DTOs;

// DeviceId: مُعرّف عشوائي (UUID) يولّده الفرونت إند مرة واحدة ويخزّنه محلياً،
// ويرسله مع كل محاولة دخول — هذا هو "الجهاز" من ناحية السيرفر.
public record LoginRequest(string UserName, string Password, string DeviceId);

public record LoginResponse(string FullName, string Role, DateTime? AccessExpiresAt);
