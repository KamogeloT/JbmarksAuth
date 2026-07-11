using Rmrs.Domain.Entities;

namespace Rmrs.Application.Interfaces;

/// <summary>
/// Service for managing physical record loans, returns, and overdue detection.
/// Handles the loan lifecycle from creation through return.
/// </summary>
public interface ILoanService
{
    /// <summary>
    /// Creates a new loan for a physical record, recording the borrower, loan date,
    /// and expected return date.
    /// </summary>
    /// <param name="physicalRecordId">The physical record being loaned.</param>
    /// <param name="borrowerUserId">The user borrowing the record.</param>
    /// <param name="expectedReturnDate">The date the record is expected to be returned.</param>
    /// <param name="createdByUserId">The user creating the loan record.</param>
    /// <returns>The created loan entity.</returns>
    Task<Loan> CreateLoanAsync(int physicalRecordId, int borrowerUserId, DateTime expectedReturnDate, int createdByUserId);

    /// <summary>
    /// Records the return of a loaned physical record by setting the actual return date.
    /// </summary>
    /// <param name="physicalRecordId">The physical record being returned.</param>
    /// <returns>The updated loan entity.</returns>
    Task<Loan> ReturnRecordAsync(int physicalRecordId);

    /// <summary>
    /// Gets all loans that are overdue (expected return date has passed and actual return date is null).
    /// </summary>
    /// <returns>List of overdue loan entities.</returns>
    Task<IEnumerable<Loan>> GetOverdueLoansAsync();
}
