using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Rmrs.Application.Exceptions;
using Rmrs.Application.Interfaces;
using Rmrs.Domain.Entities;
using Rmrs.Infrastructure.Persistence;

namespace Rmrs.Infrastructure.Services;

/// <summary>
/// Manages the loan lifecycle for physical records including creation,
/// return processing, and overdue detection.
/// </summary>
public class LoanService : ILoanService
{
    private readonly RmrsDbContext _dbContext;
    private readonly ILogger<LoanService> _logger;

    public LoanService(RmrsDbContext dbContext, ILogger<LoanService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<Loan> CreateLoanAsync(
        int physicalRecordId,
        int borrowerUserId,
        DateTime expectedReturnDate,
        int createdByUserId)
    {
        // Validate physical record exists
        var physicalRecord = await _dbContext.PhysicalRecords
            .FirstOrDefaultAsync(pr => pr.Id == physicalRecordId);

        if (physicalRecord == null)
            throw new NotFoundException("PhysicalRecord", physicalRecordId);

        // Check the record is not already on loan
        var existingActiveLoan = await _dbContext.Loans
            .AnyAsync(l => l.PhysicalRecordId == physicalRecordId
                        && l.Status == "Active"
                        && l.ActualReturnDate == null);

        if (existingActiveLoan)
            throw new ValidationException(
                "This physical record is already on loan. It must be returned before a new loan can be created.");

        // Validate borrower exists
        var borrowerExists = await _dbContext.Users.AnyAsync(u => u.Id == borrowerUserId && u.IsActive);
        if (!borrowerExists)
            throw new NotFoundException("User (Borrower)", borrowerUserId);

        // Validate expected return date is in the future
        if (expectedReturnDate.Date <= DateTime.UtcNow.Date)
            throw new ValidationException("Expected return date must be in the future.");

        // Create the loan
        var loan = new Loan
        {
            PhysicalRecordId = physicalRecordId,
            BorrowerUserId = borrowerUserId,
            LoanDate = DateTime.UtcNow,
            ExpectedReturnDate = expectedReturnDate,
            ActualReturnDate = null,
            Status = "Active",
            CreatedByUserId = createdByUserId,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Loans.Add(loan);

        // Update physical record status to OnLoan
        physicalRecord.Status = "OnLoan";

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Loan created: PhysicalRecord {PhysicalRecordId} loaned to user {BorrowerUserId}, " +
            "expected return {ExpectedReturnDate}",
            physicalRecordId, borrowerUserId, expectedReturnDate);

        return loan;
    }

    /// <inheritdoc />
    public async Task<Loan> ReturnRecordAsync(int physicalRecordId)
    {
        // Find the active loan for this physical record
        var loan = await _dbContext.Loans
            .Include(l => l.PhysicalRecord)
            .FirstOrDefaultAsync(l => l.PhysicalRecordId == physicalRecordId
                                   && l.Status == "Active"
                                   && l.ActualReturnDate == null);

        if (loan == null)
            throw new NotFoundException(
                $"No active loan found for physical record with ID '{physicalRecordId}'.");

        // Record the return
        loan.ActualReturnDate = DateTime.UtcNow;
        loan.Status = "Returned";

        // Update physical record status back to InStorage
        loan.PhysicalRecord.Status = "InStorage";

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Loan returned: PhysicalRecord {PhysicalRecordId}, Loan {LoanId}, " +
            "returned at {ReturnDate}",
            physicalRecordId, loan.Id, loan.ActualReturnDate);

        return loan;
    }

    /// <inheritdoc />
    public async Task<IEnumerable<Loan>> GetOverdueLoansAsync()
    {
        var today = DateTime.UtcNow.Date;

        var overdueLoans = await _dbContext.Loans
            .Include(l => l.PhysicalRecord)
                .ThenInclude(pr => pr.Record)
            .Include(l => l.BorrowerUser)
            .Where(l => l.Status == "Active"
                     && l.ActualReturnDate == null
                     && l.ExpectedReturnDate < today)
            .OrderBy(l => l.ExpectedReturnDate)
            .ToListAsync();

        return overdueLoans;
    }
}
