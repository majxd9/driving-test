using DrivingTestApi.Models;
using DrivingTestApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DrivingTestApi.Controllers;

[ApiController]
[Route("api/admin/ai-generation")]
[Authorize(Roles = "Admin")]
public sealed class AiGenerationAdminController : ControllerBase
{
    private readonly AiGenerationJobService _jobs;

    public AiGenerationAdminController(AiGenerationJobService jobs) => _jobs = jobs;

    [HttpGet("status")]
    public async Task<ActionResult<AiGenerationOverview>> Status(CancellationToken cancellationToken) =>
        Ok(await _jobs.GetOverviewAsync(cancellationToken));

    [HttpPost("audio")]
    public async Task<ActionResult<AiGenerationEnqueueResult>> Audio(
        [FromBody] BulkGenerationRequest? request,
        CancellationToken cancellationToken) =>
        Ok(await _jobs.EnqueueBulkAsync(
            AiGenerationJobType.Audio,
            request?.RetryFailed ?? false,
            request?.RegenerateCompleted ?? false,
            cancellationToken));

    [HttpPost("image")]
    public async Task<ActionResult<AiGenerationEnqueueResult>> Image(
        [FromBody] BulkGenerationRequest? request,
        CancellationToken cancellationToken) =>
        Ok(await _jobs.EnqueueBulkAsync(
            AiGenerationJobType.AiImage,
            request?.RetryFailed ?? false,
            request?.RegenerateCompleted ?? false,
            cancellationToken));

    [HttpPost("all")]
    public async Task<ActionResult<object>> All(
        [FromBody] BulkGenerationRequest? request,
        CancellationToken cancellationToken)
    {
        var audio = await _jobs.EnqueueBulkAsync(
            AiGenerationJobType.Audio,
            request?.RetryFailed ?? false,
            request?.RegenerateCompleted ?? false,
            cancellationToken);

        var image = await _jobs.EnqueueBulkAsync(
            AiGenerationJobType.AiImage,
            request?.RetryFailed ?? false,
            request?.RegenerateCompleted ?? false,
            cancellationToken);

        return Ok(new { audio, image });
    }

    [HttpPost("resume")]
    public async Task<ActionResult<AiGenerationOverview>> Resume(
        CancellationToken cancellationToken)
    {
        await _jobs.ResetStaleProcessingAsync(cancellationToken);
        await _jobs.EnqueueMissingAsync(cancellationToken);
        return Ok(await _jobs.GetOverviewAsync(cancellationToken));
    }

    [HttpPost("jobs/{id:long}/retry")]
    public async Task<IActionResult> Retry(
        long id,
        CancellationToken cancellationToken) =>
        await _jobs.RetryJobAsync(id, cancellationToken)
            ? NoContent()
            : NotFound(new { message = "المهمة غير موجودة." });

    public sealed record BulkGenerationRequest(
        bool RetryFailed = false,
        bool RegenerateCompleted = false);
}