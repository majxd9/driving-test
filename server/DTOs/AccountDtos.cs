namespace DrivingTestApi.DTOs;

public record AccountResponse(
    string Id,
    string UserName,
    string FullName,
    string Role,
    bool IsActive,
    bool DeviceBound,
    DateTime? AccessExpiresAt,
    DateTime CreatedAt);

public record CreateAccountRequest(
    string UserName,
    string FullName,
    string Password,
    string Role,
    DateTime? AccessExpiresAt);

public record UpdateAccountRequest(
    string UserName,
    string FullName,
    string Role,
    bool IsActive,
    DateTime? AccessExpiresAt,
    string? Password);
