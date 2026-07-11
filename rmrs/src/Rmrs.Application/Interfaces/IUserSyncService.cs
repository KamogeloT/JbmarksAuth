using Rmrs.Application.Models.Bitrix;
using Rmrs.Domain.Entities;

namespace Rmrs.Application.Interfaces;

/// <summary>
/// Synchronizes Bitrix user profiles to local User records.
/// </summary>
public interface IUserSyncService
{
    /// <summary>
    /// Creates or updates a local user record from a Bitrix user profile.
    /// </summary>
    /// <param name="profile">The Bitrix user profile to sync.</param>
    /// <returns>The created or updated local User entity.</returns>
    Task<User> SyncUserFromBitrixAsync(BitrixUserProfile profile);
}
