using DrivingTestApi.Models;

namespace DrivingTestApi.Services;

public interface ITokenService
{
    string CreateToken(ApplicationUser user, string role);
}
