using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rmrs.Application.Exceptions;
using Rmrs.Application.Interfaces;
using Rmrs.Application.Security;
using Rmrs.Domain.Entities;
using Rmrs.Infrastructure.Persistence;

namespace Rmrs.Api.Controllers;

/// <summary>
/// Manages physical records including barcode/QR code generation, location tracking,
/// movement history, and bulk scanning operations.
/// </summary>
[Authorize]
public class PhysicalRecordsController : RmrsControllerBase
{
    private readonly ILocationService _locationService;
    private readonly ILoanService _loanService;
    private readonly IBarcodeGeneratorService _barcodeGeneratorService;
    private readonly RmrsDbContext _dbContext;
    private readonly ILogger<PhysicalRecordsController> _logger;

    public PhysicalRecordsController(
        IUserContext userContext,
        ILocationService locationService,
        ILoanService loanService,
        IBarcodeGeneratorService barcodeGeneratorService,
        RmrsDbContext dbContext,
        ILogger<PhysicalRecordsController> logger)
        : base(userContext)
    {
        _locationService = locationService;
        _loanService = loanService;
        _barcodeGeneratorService = barcodeGeneratorService;
        _dbContext = dbContext;
        _logger = logger;
    }

    // ────────────────────────────────────────────────────────────────
    // Physical Record endpoints
    // ────────────────────────────────────────────────────────────────

    /// <summary>
    /// Gets a physical record by ID including current location and record metadata.
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var physicalRecord = await _dbContext.PhysicalRecords
            .Include(pr => pr.Record)
            .Include(pr => pr.CurrentLocation)
            .FirstOrDefaultAsync(pr => pr.Id == id);

        if (physicalRecord == null)
            return NotFoundResponse($"Physical record with ID '{id}' was not found.");

        return OkResponse(new PhysicalRecordResponse
        {
            Id = physicalRecord.Id,
            RecordId = physicalRecord.RecordId,
            RegistryNumber = physicalRecord.Record.RegistryNumber,
            BarcodeValue = physicalRecord.BarcodeValue,
            QrCodeValue = physicalRecord.QrCodeValue,
            Status = physicalRecord.Status,
            CurrentLocation = physicalRecord.CurrentLocation != null
                ? MapLocationResponse(physicalRecord.CurrentLocation)
                : null,
            CreatedAt = physicalRecord.CreatedAt
        });
    }

    /// <summary>
    /// Gets the current storage location of a physical record.
    /// </summary>
    [HttpGet("{id:int}/location")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCurrentLocation(int id)
    {
        try
        {
            var location = await _locationService.GetCurrentLocationAsync(id);

            if (location == null)
                return OkResponse(new { Message = "Physical record has no assigned location." });

            return OkResponse(MapLocationResponse(location));
        }
        catch (NotFoundException ex)
        {
            return NotFoundResponse(ex.Message);
        }
    }

    /// <summary>
    /// Moves a physical record to a new storage location.
    /// Records the previous location, new location, timestamp, and user.
    /// </summary>
    [HttpPost("{id:int}/move")]
    [Authorize(Policy = PolicyNames.RequireRegistryClerk)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Move(int id, [FromBody] MoveRecordRequest request)
    {
        if (request == null)
            return BadRequestResponse("Request body is required.");

        if (request.NewLocationId <= 0)
            return BadRequestResponse("A valid new location ID is required.");

        try
        {
            await _locationService.MoveRecordAsync(id, request.NewLocationId, CurrentUser.UserId);

            return OkResponse(new
            {
                Message = "Physical record moved successfully.",
                PhysicalRecordId = id,
                NewLocationId = request.NewLocationId,
                MovedBy = CurrentUser.FullName,
                MovedAt = DateTime.UtcNow
            });
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
    /// Bulk move multiple physical records to a new location.
    /// Used with batch barcode scan operations.
    /// </summary>
    [HttpPost("bulk-move")]
    [Authorize(Policy = PolicyNames.RequireRegistryClerk)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> BulkMove([FromBody] BulkMoveRequest request)
    {
        if (request == null)
            return BadRequestResponse("Request body is required.");

        if (request.PhysicalRecordIds == null || !request.PhysicalRecordIds.Any())
            return BadRequestResponse("At least one physical record ID is required.");

        if (request.NewLocationId <= 0)
            return BadRequestResponse("A valid new location ID is required.");

        try
        {
            await _locationService.BulkMoveAsync(request.PhysicalRecordIds, request.NewLocationId, CurrentUser.UserId);

            return OkResponse(new
            {
                Message = $"Successfully moved {request.PhysicalRecordIds.Count} physical record(s).",
                RecordCount = request.PhysicalRecordIds.Count,
                NewLocationId = request.NewLocationId,
                MovedBy = CurrentUser.FullName,
                MovedAt = DateTime.UtcNow
            });
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
    /// Gets the movement history for a physical record.
    /// </summary>
    [HttpGet("{id:int}/movements")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMovements(int id)
    {
        try
        {
            var movements = await _locationService.GetMovementHistoryAsync(id);

            var result = movements.Select(m => new MovementResponse
            {
                Id = m.Id,
                PhysicalRecordId = m.PhysicalRecordId,
                FromLocationId = m.FromLocationId,
                FromLocationName = m.FromLocation?.LocationName,
                FromLocationCode = m.FromLocation?.LocationCode,
                ToLocationId = m.ToLocationId,
                ToLocationName = m.ToLocation?.LocationName ?? string.Empty,
                ToLocationCode = m.ToLocation?.LocationCode ?? string.Empty,
                MovedByUserId = m.MovedByUserId,
                MovedByUserName = m.MovedByUser?.FullName ?? string.Empty,
                MovedAt = m.MovedAt
            });

            return OkResponse(result);
        }
        catch (NotFoundException ex)
        {
            return NotFoundResponse(ex.Message);
        }
    }

    /// <summary>
    /// Scans a barcode and retrieves the physical record's current location,
    /// classification, and custody history.
    /// </summary>
    [HttpGet("scan/{barcode}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ScanBarcode(string barcode)
    {
        if (string.IsNullOrWhiteSpace(barcode))
            return BadRequestResponse("Barcode value is required.");

        var physicalRecord = await _dbContext.PhysicalRecords
            .Include(pr => pr.Record)
                .ThenInclude(r => r.FilePlanEntry)
            .Include(pr => pr.CurrentLocation)
            .Include(pr => pr.Movements.OrderByDescending(m => m.MovedAt))
                .ThenInclude(m => m.FromLocation)
            .Include(pr => pr.Movements)
                .ThenInclude(m => m.ToLocation)
            .Include(pr => pr.Movements)
                .ThenInclude(m => m.MovedByUser)
            .Include(pr => pr.Loans.OrderByDescending(l => l.LoanDate))
                .ThenInclude(l => l.BorrowerUser)
            .FirstOrDefaultAsync(pr => pr.BarcodeValue == barcode || pr.QrCodeValue == barcode);

        if (physicalRecord == null)
            return NotFoundResponse($"No physical record found with barcode/QR code '{barcode}'.");

        var response = new ScanResultResponse
        {
            PhysicalRecordId = physicalRecord.Id,
            RecordId = physicalRecord.RecordId,
            RegistryNumber = physicalRecord.Record.RegistryNumber,
            Subject = physicalRecord.Record.Subject,
            BarcodeValue = physicalRecord.BarcodeValue,
            QrCodeValue = physicalRecord.QrCodeValue,
            Status = physicalRecord.Status,
            ClassificationCode = physicalRecord.Record.FilePlanEntry?.ClassificationCode ?? string.Empty,
            ClassificationLevel = physicalRecord.Record.ClassificationLevel,
            CurrentLocation = physicalRecord.CurrentLocation != null
                ? MapLocationResponse(physicalRecord.CurrentLocation)
                : null,
            MovementHistory = physicalRecord.Movements.Select(m => new MovementResponse
            {
                Id = m.Id,
                PhysicalRecordId = m.PhysicalRecordId,
                FromLocationId = m.FromLocationId,
                FromLocationName = m.FromLocation?.LocationName,
                FromLocationCode = m.FromLocation?.LocationCode,
                ToLocationId = m.ToLocationId,
                ToLocationName = m.ToLocation?.LocationName ?? string.Empty,
                ToLocationCode = m.ToLocation?.LocationCode ?? string.Empty,
                MovedByUserId = m.MovedByUserId,
                MovedByUserName = m.MovedByUser?.FullName ?? string.Empty,
                MovedAt = m.MovedAt
            }).ToList(),
            CustodyHistory = physicalRecord.Loans.Select(l => new LoanSummaryResponse
            {
                Id = l.Id,
                BorrowerName = l.BorrowerUser?.FullName ?? string.Empty,
                LoanDate = l.LoanDate,
                ExpectedReturnDate = l.ExpectedReturnDate,
                ActualReturnDate = l.ActualReturnDate,
                Status = l.Status
            }).ToList()
        };

        return OkResponse(response);
    }

    /// <summary>
    /// Generates a barcode/QR code label image for a physical record.
    /// Returns the label as a BMP image file.
    /// </summary>
    [HttpGet("{id:int}/label")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetLabel(int id, [FromQuery] string type = "barcode")
    {
        var physicalRecord = await _dbContext.PhysicalRecords
            .Include(pr => pr.Record)
            .FirstOrDefaultAsync(pr => pr.Id == id);

        if (physicalRecord == null)
            return NotFoundResponse($"Physical record with ID '{id}' was not found.");

        var registryNumber = physicalRecord.Record.RegistryNumber;

        byte[] imageBytes;
        string contentType = "image/bmp";

        if (type.Equals("qr", StringComparison.OrdinalIgnoreCase) ||
            type.Equals("qrcode", StringComparison.OrdinalIgnoreCase))
        {
            imageBytes = _barcodeGeneratorService.GenerateQrCode(registryNumber);
        }
        else
        {
            imageBytes = _barcodeGeneratorService.GenerateBarcode(registryNumber);
        }

        return File(imageBytes, contentType, $"{registryNumber.Replace("/", "-")}-{type}.bmp");
    }

    // ────────────────────────────────────────────────────────────────
    // Loan Management endpoints
    // ────────────────────────────────────────────────────────────────

    /// <summary>
    /// Creates a loan for a physical record, recording borrower, loan date, and expected return date.
    /// The physical record status is updated to "OnLoan".
    /// </summary>
    [HttpPost("{id:int}/loan")]
    [Authorize(Policy = PolicyNames.RequireRegistryClerk)]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateLoan(int id, [FromBody] CreateLoanRequest request)
    {
        if (request == null)
            return BadRequestResponse("Request body is required.");

        if (request.BorrowerUserId <= 0)
            return BadRequestResponse("A valid borrower user ID is required.");

        if (request.ExpectedReturnDate == default)
            return BadRequestResponse("Expected return date is required.");

        try
        {
            var loan = await _loanService.CreateLoanAsync(
                id,
                request.BorrowerUserId,
                request.ExpectedReturnDate,
                CurrentUser.UserId);

            var response = new LoanResponse
            {
                Id = loan.Id,
                PhysicalRecordId = loan.PhysicalRecordId,
                BorrowerUserId = loan.BorrowerUserId,
                LoanDate = loan.LoanDate,
                ExpectedReturnDate = loan.ExpectedReturnDate,
                ActualReturnDate = loan.ActualReturnDate,
                Status = loan.Status,
                CreatedByUserId = loan.CreatedByUserId,
                CreatedAt = loan.CreatedAt
            };

            return CreatedResponse(nameof(GetById), new { id = loan.PhysicalRecordId }, response);
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
    /// Records the return of a loaned physical record.
    /// Sets the actual return date and updates the physical record status to "InStorage".
    /// </summary>
    [HttpPost("{id:int}/return")]
    [Authorize(Policy = PolicyNames.RequireRegistryClerk)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ReturnLoan(int id)
    {
        try
        {
            var loan = await _loanService.ReturnRecordAsync(id);

            var response = new LoanResponse
            {
                Id = loan.Id,
                PhysicalRecordId = loan.PhysicalRecordId,
                BorrowerUserId = loan.BorrowerUserId,
                LoanDate = loan.LoanDate,
                ExpectedReturnDate = loan.ExpectedReturnDate,
                ActualReturnDate = loan.ActualReturnDate,
                Status = loan.Status,
                CreatedByUserId = loan.CreatedByUserId,
                CreatedAt = loan.CreatedAt
            };

            return OkResponse(response);
        }
        catch (NotFoundException ex)
        {
            return NotFoundResponse(ex.Message);
        }
    }

    /// <summary>
    /// Lists all overdue loans — loans where the expected return date has passed
    /// and the record has not yet been returned.
    /// </summary>
    [HttpGet("overdue-loans")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOverdueLoans()
    {
        var overdueLoans = await _loanService.GetOverdueLoansAsync();

        var result = overdueLoans.Select(l => new OverdueLoanResponse
        {
            LoanId = l.Id,
            PhysicalRecordId = l.PhysicalRecordId,
            RegistryNumber = l.PhysicalRecord?.Record?.RegistryNumber ?? string.Empty,
            BorrowerUserId = l.BorrowerUserId,
            BorrowerName = l.BorrowerUser?.FullName ?? string.Empty,
            LoanDate = l.LoanDate,
            ExpectedReturnDate = l.ExpectedReturnDate,
            DaysOverdue = (DateTime.UtcNow.Date - l.ExpectedReturnDate).Days
        });

        return OkResponse(result);
    }

    // ────────────────────────────────────────────────────────────────
    // Storage Location endpoints
    // ────────────────────────────────────────────────────────────────

    /// <summary>
    /// Gets all storage locations as a hierarchical tree.
    /// </summary>
    [HttpGet("/api/v1/storage-locations")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLocationTree()
    {
        var tree = await _locationService.GetLocationTreeAsync();

        var result = tree.Select(MapLocationTreeResponse);
        return OkResponse(result);
    }

    /// <summary>
    /// Creates a new storage location in the hierarchy.
    /// </summary>
    [HttpPost("/api/v1/storage-locations")]
    [Authorize(Policy = PolicyNames.RequireSystemAdmin)]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateLocation([FromBody] CreateLocationRequest request)
    {
        if (request == null)
            return BadRequestResponse("Request body is required.");

        try
        {
            var location = await _locationService.CreateLocationAsync(
                request.ParentId,
                request.LocationType,
                request.LocationName,
                request.LocationCode);

            var result = MapLocationResponse(location);
            return CreatedResponse(nameof(GetLocationById), new { id = location.Id }, result);
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
    /// Updates an existing storage location.
    /// </summary>
    [HttpPut("/api/v1/storage-locations/{id:int}")]
    [Authorize(Policy = PolicyNames.RequireSystemAdmin)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateLocation(int id, [FromBody] UpdateLocationRequest request)
    {
        if (request == null)
            return BadRequestResponse("Request body is required.");

        try
        {
            var location = await _locationService.UpdateLocationAsync(id, request.LocationName, request.IsActive);
            return OkResponse(MapLocationResponse(location));
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
    /// Gets a single storage location by ID.
    /// </summary>
    [HttpGet("/api/v1/storage-locations/{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetLocationById(int id)
    {
        var location = await _locationService.GetLocationByIdAsync(id);

        if (location == null)
            return NotFoundResponse($"Storage location with ID '{id}' was not found.");

        return OkResponse(MapLocationResponse(location));
    }

    // ────────────────────────────────────────────────────────────────
    // Helper methods
    // ────────────────────────────────────────────────────────────────

    private static StorageLocationResponse MapLocationResponse(StorageLocation location)
    {
        return new StorageLocationResponse
        {
            Id = location.Id,
            ParentId = location.ParentId,
            LocationType = location.LocationType,
            LocationName = location.LocationName,
            LocationCode = location.LocationCode,
            IsActive = location.IsActive
        };
    }

    private static StorageLocationTreeResponse MapLocationTreeResponse(StorageLocation location)
    {
        return new StorageLocationTreeResponse
        {
            Id = location.Id,
            ParentId = location.ParentId,
            LocationType = location.LocationType,
            LocationName = location.LocationName,
            LocationCode = location.LocationCode,
            IsActive = location.IsActive,
            Children = location.Children?.Select(MapLocationTreeResponse).ToList() ?? new List<StorageLocationTreeResponse>()
        };
    }
}

// ────────────────────────────────────────────────────────────────────────
// Request/Response DTOs
// ────────────────────────────────────────────────────────────────────────

/// <summary>
/// Request model for moving a physical record to a new location.
/// </summary>
public class MoveRecordRequest
{
    /// <summary>
    /// The destination storage location ID.
    /// </summary>
    public int NewLocationId { get; set; }
}

/// <summary>
/// Request model for bulk moving multiple physical records.
/// </summary>
public class BulkMoveRequest
{
    /// <summary>
    /// List of physical record IDs to move (from barcode scans).
    /// </summary>
    public List<int> PhysicalRecordIds { get; set; } = new();

    /// <summary>
    /// The destination storage location ID for all records.
    /// </summary>
    public int NewLocationId { get; set; }
}

/// <summary>
/// Request model for creating a new storage location.
/// </summary>
public class CreateLocationRequest
{
    /// <summary>
    /// Parent location ID (null for top-level building).
    /// </summary>
    public int? ParentId { get; set; }

    /// <summary>
    /// Type of location: Building, Floor, Room, Shelf, or Position.
    /// </summary>
    public string LocationType { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable name for the location.
    /// </summary>
    public string LocationName { get; set; } = string.Empty;

    /// <summary>
    /// Unique code identifier for the location.
    /// </summary>
    public string LocationCode { get; set; } = string.Empty;
}

/// <summary>
/// Request model for updating a storage location.
/// </summary>
public class UpdateLocationRequest
{
    /// <summary>
    /// Updated location name.
    /// </summary>
    public string LocationName { get; set; } = string.Empty;

    /// <summary>
    /// Whether the location is active.
    /// </summary>
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Response model for a physical record.
/// </summary>
public class PhysicalRecordResponse
{
    public int Id { get; set; }
    public int RecordId { get; set; }
    public string RegistryNumber { get; set; } = string.Empty;
    public string BarcodeValue { get; set; } = string.Empty;
    public string QrCodeValue { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public StorageLocationResponse? CurrentLocation { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Response model for a storage location.
/// </summary>
public class StorageLocationResponse
{
    public int Id { get; set; }
    public int? ParentId { get; set; }
    public string LocationType { get; set; } = string.Empty;
    public string LocationName { get; set; } = string.Empty;
    public string LocationCode { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

/// <summary>
/// Response model for storage location tree with nested children.
/// </summary>
public class StorageLocationTreeResponse
{
    public int Id { get; set; }
    public int? ParentId { get; set; }
    public string LocationType { get; set; } = string.Empty;
    public string LocationName { get; set; } = string.Empty;
    public string LocationCode { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public List<StorageLocationTreeResponse> Children { get; set; } = new();
}

/// <summary>
/// Response model for a movement record.
/// </summary>
public class MovementResponse
{
    public int Id { get; set; }
    public int PhysicalRecordId { get; set; }
    public int? FromLocationId { get; set; }
    public string? FromLocationName { get; set; }
    public string? FromLocationCode { get; set; }
    public int ToLocationId { get; set; }
    public string ToLocationName { get; set; } = string.Empty;
    public string ToLocationCode { get; set; } = string.Empty;
    public int MovedByUserId { get; set; }
    public string MovedByUserName { get; set; } = string.Empty;
    public DateTime MovedAt { get; set; }
}

/// <summary>
/// Response model for barcode scan result including location, classification, and custody.
/// </summary>
public class ScanResultResponse
{
    public int PhysicalRecordId { get; set; }
    public int RecordId { get; set; }
    public string RegistryNumber { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string BarcodeValue { get; set; } = string.Empty;
    public string QrCodeValue { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string ClassificationCode { get; set; } = string.Empty;
    public int ClassificationLevel { get; set; }
    public StorageLocationResponse? CurrentLocation { get; set; }
    public List<MovementResponse> MovementHistory { get; set; } = new();
    public List<LoanSummaryResponse> CustodyHistory { get; set; } = new();
}

/// <summary>
/// Summary response for loan/custody history entries.
/// </summary>
public class LoanSummaryResponse
{
    public int Id { get; set; }
    public string BorrowerName { get; set; } = string.Empty;
    public DateTime LoanDate { get; set; }
    public DateTime ExpectedReturnDate { get; set; }
    public DateTime? ActualReturnDate { get; set; }
    public string Status { get; set; } = string.Empty;
}

/// <summary>
/// Request model for creating a loan.
/// </summary>
public class CreateLoanRequest
{
    /// <summary>
    /// The user ID of the borrower.
    /// </summary>
    public int BorrowerUserId { get; set; }

    /// <summary>
    /// The expected return date for the loan.
    /// </summary>
    public DateTime ExpectedReturnDate { get; set; }
}

/// <summary>
/// Response model for a loan operation.
/// </summary>
public class LoanResponse
{
    public int Id { get; set; }
    public int PhysicalRecordId { get; set; }
    public int BorrowerUserId { get; set; }
    public DateTime LoanDate { get; set; }
    public DateTime ExpectedReturnDate { get; set; }
    public DateTime? ActualReturnDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public int CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Response model for overdue loan entries.
/// </summary>
public class OverdueLoanResponse
{
    public int LoanId { get; set; }
    public int PhysicalRecordId { get; set; }
    public string RegistryNumber { get; set; } = string.Empty;
    public int BorrowerUserId { get; set; }
    public string BorrowerName { get; set; } = string.Empty;
    public DateTime LoanDate { get; set; }
    public DateTime ExpectedReturnDate { get; set; }
    public int DaysOverdue { get; set; }
}
