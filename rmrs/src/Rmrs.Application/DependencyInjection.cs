using Microsoft.Extensions.DependencyInjection;

namespace Rmrs.Application;

/// <summary>
/// Extension methods for registering Application layer services.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // Register application services, MediatR handlers, validators, etc.
        // Services will be registered here as modules are implemented.

        return services;
    }
}
