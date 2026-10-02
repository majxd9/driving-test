using DrivingTestApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DrivingTestApi.Controllers;

public sealed record GeminiGenerateRequest(
    string Prompt,
    string? SystemInstruction = null,
    string? PreviousInteractionId = null);

public sealed record GeminiStatusResponse(
    bool Configured,
    string Model,
    string Endpoint);

[ApiController]
[Route("api/admin/gemini")]
[Authorize(Roles = "Admin")]
public sealed class GeminiAdminController : ControllerBase
{
    private const string Endpoint =
        "https://generativelanguage.googleapis.com/v1beta/interactions";

    private readonly IGeminiService _gemini;

    public GeminiAdminController(IGeminiService gemini)
    {
        _gemini = gemini;
    }

    [HttpGet("status")]
    public ActionResult<GeminiStatusResponse> Status()
    {
        return Ok(new GeminiStatusResponse(
            _gemini.IsConfigured,
            _gemini.Model,
            Endpoint));
    }

    [HttpPost("generate")]
    public async Task<ActionResult<GeminiGenerateResult>> Generate(
        [FromBody] GeminiGenerateRequest request,
        CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Prompt))
            return BadRequest(new { message = "Prompt مطلوب." });

        try
        {
            var result = await _gemini.GenerateAsync(
                request.Prompt,
                request.SystemInstruction,
                request.PreviousInteractionId,
                cancellationToken);

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new
            {
                message = ex.Message
            });
        }
    }
}
