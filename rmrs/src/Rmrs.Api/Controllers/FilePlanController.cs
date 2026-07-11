using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rmrs.Application.Exceptions;
using Rmrs.Application.Interfaces;
using Rmrs.Application.Security;

namespace Rmrs.Api.Controllers;

/// <summary>
/// Manages the hierarchical file plan structure and retention rules.
/// Tree read endpoints are accessible to any authenticated user.
/// Mutation endpoints (create, update, deactivate) require CanManageFilePlan policy.
/// </summary>
[Route("api/v1/file-plan")]
public class FilePlanController : RmrsControllerBase
{
    private readonly IFilePlanService _filePlanService;
    private readonly IRetentionRuleService _retentionRuleService;
    private readonly ILogger<FilePlanController> _logger;

    public FilePlanController(
        IUserContext userContext,
        IFilePlanService filePlanService,
        IRetentionRuleService retentionRuleService,
        ILogger<FilePlanController> logger)
        : base(userContext)
    {
        _filePlanService = filePlanService;
        _retentionRuleService = retentionRuleService;
        _logger = logger;
    }

    // ──────────────────────────────────────────────────────────────────
    // READ ENDPOINTS (accessible to broader roles)
    // ──────────────────────────────────────────────────────────────────

    /// <summary>
    /// Returns the full hierarchical file plan tree.
    /// Accessible to any authenticated user.
    /// </summary>
    [HttpGet("tree")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTree()
    {
        var tree = await _filePlanService.GetTreeAsync();

        var result = tree.Select(MapToTreeResponse);
        return OkResponse(result);
    }

    /// <summary>
    /// Returns a single file plan entry by ID.
    /// Accessible to any authenticated user.
    /// </summary>
    [HttpGet("entries/{id:int}")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetEntryById(int id)
    {
        var entry = await _filePlanService.GetEntryByIdAsync(id);

        if (entry == null)
            return NotFoundResponse($"File plan entry with ID '{id}' was not found.");

        var result = new FilePlanEntryResponse
        {
            Id = entry.Id,
            ParentId = entry.ParentId,
            ClassificationCode = entry.ClassificationCode,
            Title = entry.Title,
            Description = entry.Description,
            Level = entry.Level,
            RetentionRuleId = entry.RetentionRuleId,
            RetentionRuleName = entry.RetentionRule?.RuleName,
            DisposalAuthorityRef = entry.DisposalAuthorityRef,
            DefaultClassificationLevel = entry.DefaultClassificationLevel,
            IsActive = entry.IsActive,
            CreatedAt = entry.CreatedAt,
            UpdatedAt = entry.UpdatedAt,
            DeactivatedAt = entry.DeactivatedAt,
            ChildCount = entry.Children?.Count ?? 0
        };

        return OkResponse(result);
    }

    /// <summary>
    /// Returns the direct children of a file plan entry.
    /// Accessible to any authenticated user.
    /// </summary>
    [HttpGet("entries/{id:int}/children")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetChildren(int id)
    {
        try
        {
            var children = await _filePlanService.GetChildrenAsync(id);

            var result = children.Select(e => new FilePlanEntryResponse
            {
                Id = e.Id,
                ParentId = e.ParentId,
                ClassificationCode = e.ClassificationCode,
                Title = e.Title,
                Description = e.Description,
                Level = e.Level,
                RetentionRuleId = e.RetentionRuleId,
                RetentionRuleName = e.RetentionRule?.RuleName,
                DisposalAuthorityRef = e.DisposalAuthorityRef,
                DefaultClassificationLevel = e.DefaultClassificationLevel,
                IsActive = e.IsActive,
                CreatedAt = e.CreatedAt,
                UpdatedAt = e.UpdatedAt,
                DeactivatedAt = e.DeactivatedAt,
                ChildCount = 0 // Children of children not loaded at this level
            });

            return OkResponse(result);
        }
        catch (NotFoundException ex)
        {
            return NotFoundResponse(ex.Message);
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // MUTATION ENDPOINTS (require CanManageFilePlan policy)
    // ──────────────────────────────────────────────────────────────────

    /// <summary>
    /// Creates a new file plan entry.
    /// Requires: unique classification code, title, description, retention rule, disposal authority reference.
    /// </summary>
    [HttpPost("entries")]
    [Authorize(Policy = PolicyNames.CanManageFilePlan)]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateEntry([FromBody] CreateFilePlanEntryRequest request)
    {
        if (request == null)
            return BadRequestResponse("Request body is required.");

        try
        {
            var entry = await _filePlanService.CreateEntryAsync(
                request.ParentId,
                request.ClassificationCode,
                request.Title,
                request.Description,
                request.RetentionRuleId,
                request.DisposalAuthorityRef,
                request.DefaultClassificationLevel);

            var result = new FilePlanEntryResponse
            {
                Id = entry.Id,
                ParentId = entry.ParentId,
                ClassificationCode = entry.ClassificationCode,
                Title = entry.Title,
                Description = entry.Description,
                Level = entry.Level,
                RetentionRuleId = entry.RetentionRuleId,
                DisposalAuthorityRef = entry.DisposalAuthorityRef,
                DefaultClassificationLevel = entry.DefaultClassificationLevel,
                IsActive = entry.IsActive,
                CreatedAt = entry.CreatedAt,
                UpdatedAt = entry.UpdatedAt,
                DeactivatedAt = entry.DeactivatedAt,
                ChildCount = 0
            };

            return CreatedResponse(nameof(GetEntryById), new { id = entry.Id }, result);
        }
        catch (ValidationException ex)
        {
            return BadRequestResponse(ex.Message, ex.Detail);
        }
        catch (ConflictException ex)
        {
            return ConflictResponse(ex.Message, ex.Detail);
        }
        catch (NotFoundException ex)
        {
            return NotFoundResponse(ex.Message);
        }
    }

    /// <summary>
    /// Updates an existing file plan entry.
    /// Note: Classification code cannot be changed after creation.
    /// </summary>
    [HttpPut("entries/{id:int}")]
    [Authorize(Policy = PolicyNames.CanManageFilePlan)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateEntry(int id, [FromBody] UpdateFilePlanEntryRequest request)
    {
        if (request == null)
            return BadRequestResponse("Request body is required.");

        try
        {
            var entry = await _filePlanService.UpdateEntryAsync(
                id,
                request.Title,
                request.Description,
                request.RetentionRuleId,
                request.DisposalAuthorityRef,
                request.DefaultClassificationLevel);

            var result = new FilePlanEntryResponse
            {
                Id = entry.Id,
                ParentId = entry.ParentId,
                ClassificationCode = entry.ClassificationCode,
                Title = entry.Title,
                Description = entry.Description,
                Level = entry.Level,
                RetentionRuleId = entry.RetentionRuleId,
                DisposalAuthorityRef = entry.DisposalAuthorityRef,
                DefaultClassificationLevel = entry.DefaultClassificationLevel,
                IsActive = entry.IsActive,
                CreatedAt = entry.CreatedAt,
                UpdatedAt = entry.UpdatedAt,
                DeactivatedAt = entry.DeactivatedAt,
                ChildCount = 0
            };

            return OkResponse(result);
        }
        catch (NotFoundException ex)
        {
            return NotFoundResponse(ex.Message);
        }
        catch (ValidationException ex)
        {
            return BadRequestResponse(ex.Message, ex.Detail);
        }
    }

    /// <summary>
    /// Deactivates a file plan entry. Entries cannot be deleted if they have active records;
    /// they can only be deactivated. Once deactivated, no new records can be classified under the entry,
    /// but existing records remain accessible.
    /// </summary>
    [HttpPost("entries/{id:int}/deactivate")]
    [Authorize(Policy = PolicyNames.CanManageFilePlan)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeactivateEntry(int id)
    {
        try
        {
            await _filePlanService.DeactivateEntryAsync(id);
            return NoContentResponse();
        }
        catch (NotFoundException ex)
        {
            return NotFoundResponse(ex.Message);
        }
        catch (ValidationException ex)
        {
            return BadRequestResponse(ex.Message, ex.Detail);
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // RETENTION RULES ENDPOINTS
    // ──────────────────────────────────────────────────────────────────

    /// <summary>
    /// Returns all active retention rules.
    /// Accessible to any authenticated user.
    /// </summary>
    [HttpGet("retention-rules")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRetentionRules()
    {
        var rules = await _retentionRuleService.GetAllAsync();

        var result = rules.Select(r => new RetentionRuleResponse
        {
            Id = r.Id,
            RuleName = r.RuleName,
            RetentionYears = r.RetentionYears,
            RetentionMonths = r.RetentionMonths,
            DisposalAction = r.DisposalAction,
            Description = r.Description,
            IsActive = r.IsActive,
            CreatedAt = r.CreatedAt
        });

        return OkResponse(result);
    }

    /// <summary>
    /// Creates a new retention rule.
    /// Requires CanManageFilePlan policy.
    /// </summary>
    [HttpPost("retention-rules")]
    [Authorize(Policy = PolicyNames.CanManageFilePlan)]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateRetentionRule([FromBody] CreateRetentionRuleRequest request)
    {
        if (request == null)
            return BadRequestResponse("Request body is required.");

        try
        {
            var rule = await _retentionRuleService.CreateAsync(
                request.RuleName,
                request.RetentionYears,
                request.RetentionMonths,
                request.DisposalAction,
                request.Description);

            var result = new RetentionRuleResponse
            {
                Id = rule.Id,
                RuleName = rule.RuleName,
                RetentionYears = rule.RetentionYears,
                RetentionMonths = rule.RetentionMonths,
                DisposalAction = rule.DisposalAction,
                Description = rule.Description,
                IsActive = rule.IsActive,
                CreatedAt = rule.CreatedAt
            };

            return CreatedResponse(nameof(GetRetentionRules), null!, result);
        }
        catch (ValidationException ex)
        {
            return BadRequestResponse(ex.Message, ex.Detail);
        }
    }

    /// <summary>
    /// Updates an existing retention rule.
    /// Modified rules apply only to records created after the modification date.
    /// Requires CanManageFilePlan policy.
    /// </summary>
    [HttpPut("retention-rules/{id:int}")]
    [Authorize(Policy = PolicyNames.CanManageFilePlan)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateRetentionRule(int id, [FromBody] UpdateRetentionRuleRequest request)
    {
        if (request == null)
            return BadRequestResponse("Request body is required.");

        try
        {
            var rule = await _retentionRuleService.UpdateAsync(
                id,
                request.RuleName,
                request.RetentionYears,
                request.RetentionMonths,
                request.DisposalAction,
                request.Description);

            var result = new RetentionRuleResponse
            {
                Id = rule.Id,
                RuleName = rule.RuleName,
                RetentionYears = rule.RetentionYears,
                RetentionMonths = rule.RetentionMonths,
                DisposalAction = rule.DisposalAction,
                Description = rule.Description,
                IsActive = rule.IsActive,
                CreatedAt = rule.CreatedAt
            };

            return OkResponse(result);
        }
        catch (NotFoundException ex)
        {
            return NotFoundResponse(ex.Message);
        }
        catch (ValidationException ex)
        {
            return BadRequestResponse(ex.Message, ex.Detail);
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────────────────────────

    private static FilePlanTreeNodeResponse MapToTreeResponse(Domain.Entities.FilePlanEntry entry)
    {
        return new FilePlanTreeNodeResponse
        {
            Id = entry.Id,
            ParentId = entry.ParentId,
            ClassificationCode = entry.ClassificationCode,
            Title = entry.Title,
            Description = entry.Description,
            Level = entry.Level,
            RetentionRuleId = entry.RetentionRuleId,
            RetentionRuleName = entry.RetentionRule?.RuleName,
            DisposalAuthorityRef = entry.DisposalAuthorityRef,
            DefaultClassificationLevel = entry.DefaultClassificationLevel,
            IsActive = entry.IsActive,
            Children = entry.Children?.Select(MapToTreeResponse).ToList() ?? new List<FilePlanTreeNodeResponse>()
        };
    }
}

// ────────────────────────────────────────────────────────────────────────
// Request/Response DTOs
// ────────────────────────────────────────────────────────────────────────

/// <summary>
/// Request model for creating a new file plan entry.
/// </summary>
public class CreateFilePlanEntryRequest
{
    /// <summary>
    /// Optional parent entry ID. Null for root-level entries.
    /// </summary>
    public int? ParentId { get; set; }

    /// <summary>
    /// Unique classification code for the entry.
    /// </summary>
    public string ClassificationCode { get; set; } = string.Empty;

    /// <summary>
    /// Title of the file plan entry.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Description of the file plan entry.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// ID of the retention rule to associate with this entry.
    /// </summary>
    public int RetentionRuleId { get; set; }

    /// <summary>
    /// Disposal authority reference string.
    /// </summary>
    public string DisposalAuthorityRef { get; set; } = string.Empty;

    /// <summary>
    /// Default classification level for records created under this entry.
    /// 0 = Public, 1 = Internal, 2 = Confidential, 3 = Restricted.
    /// </summary>
    public int DefaultClassificationLevel { get; set; }
}

/// <summary>
/// Request model for updating an existing file plan entry.
/// Note: Classification code and parent cannot be changed after creation.
/// </summary>
public class UpdateFilePlanEntryRequest
{
    /// <summary>
    /// Updated title.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Updated description.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Updated retention rule ID.
    /// </summary>
    public int RetentionRuleId { get; set; }

    /// <summary>
    /// Updated disposal authority reference.
    /// </summary>
    public string DisposalAuthorityRef { get; set; } = string.Empty;

    /// <summary>
    /// Updated default classification level.
    /// </summary>
    public int DefaultClassificationLevel { get; set; }
}

/// <summary>
/// Response model for a single file plan entry.
/// </summary>
public class FilePlanEntryResponse
{
    public int Id { get; set; }
    public int? ParentId { get; set; }
    public string ClassificationCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Level { get; set; }
    public int RetentionRuleId { get; set; }
    public string? RetentionRuleName { get; set; }
    public string DisposalAuthorityRef { get; set; } = string.Empty;
    public int DefaultClassificationLevel { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeactivatedAt { get; set; }
    public int ChildCount { get; set; }
}

/// <summary>
/// Response model for a file plan tree node (recursive structure).
/// </summary>
public class FilePlanTreeNodeResponse
{
    public int Id { get; set; }
    public int? ParentId { get; set; }
    public string ClassificationCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Level { get; set; }
    public int RetentionRuleId { get; set; }
    public string? RetentionRuleName { get; set; }
    public string DisposalAuthorityRef { get; set; } = string.Empty;
    public int DefaultClassificationLevel { get; set; }
    public bool IsActive { get; set; }
    public List<FilePlanTreeNodeResponse> Children { get; set; } = new();
}

// ────────────────────────────────────────────────────────────────────────
// Retention Rule DTOs
// ────────────────────────────────────────────────────────────────────────

/// <summary>
/// Request model for creating a new retention rule.
/// </summary>
public class CreateRetentionRuleRequest
{
    /// <summary>Name of the retention rule.</summary>
    public string RuleName { get; set; } = string.Empty;

    /// <summary>Number of years to retain records.</summary>
    public int RetentionYears { get; set; }

    /// <summary>Number of additional months to retain records.</summary>
    public int RetentionMonths { get; set; }

    /// <summary>Disposal action: 'Destroy', 'Archive', or 'Review'.</summary>
    public string DisposalAction { get; set; } = string.Empty;

    /// <summary>Optional description of the rule.</summary>
    public string? Description { get; set; }
}

/// <summary>
/// Request model for updating an existing retention rule.
/// </summary>
public class UpdateRetentionRuleRequest
{
    /// <summary>Updated rule name.</summary>
    public string RuleName { get; set; } = string.Empty;

    /// <summary>Updated retention years.</summary>
    public int RetentionYears { get; set; }

    /// <summary>Updated retention months.</summary>
    public int RetentionMonths { get; set; }

    /// <summary>Updated disposal action.</summary>
    public string DisposalAction { get; set; } = string.Empty;

    /// <summary>Updated description.</summary>
    public string? Description { get; set; }
}

/// <summary>
/// Response model for a retention rule.
/// </summary>
public class RetentionRuleResponse
{
    public int Id { get; set; }
    public string RuleName { get; set; } = string.Empty;
    public int RetentionYears { get; set; }
    public int RetentionMonths { get; set; }
    public string DisposalAction { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
