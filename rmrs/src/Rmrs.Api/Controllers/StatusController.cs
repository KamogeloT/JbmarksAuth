using Microsoft.AspNetCore.Mvc;

namespace Rmrs.Api.Controllers;

/// <summary>
/// API status and health endpoint.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class StatusController : ControllerBase
{
    /// <summary>
    /// Returns API status and version information.
    /// </summary>
    [HttpGet]
    public IActionResult GetStatus()
    {
        return Ok(new
        {
            Application = "RMRS",
            Description = "Records Management and Registry System",
            Version = "1.0.0",
            Status = "Running",
            Timestamp = DateTime.UtcNow
        });
    }
}
