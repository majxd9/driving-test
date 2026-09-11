namespace DrivingTestApi.DTOs;

public record CreateStudentRequest(string UserName, string FullName, string Password, int? AccessDays);

public record StudentResponse(
    string Id,
    string UserName,
    string FullName,
    bool IsActive,
    bool DeviceBound,
    DateTime? AccessExpiresAt,
    DateTime CreatedAt);

public record UpdateStudentStatusRequest(bool IsActive);
