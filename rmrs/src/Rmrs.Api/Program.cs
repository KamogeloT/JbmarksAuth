using Serilog;
using Rmrs.Api.Extensions;
using Rmrs.Api.Middleware;
using Rmrs.Application;
using Rmrs.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// ──────────────────────────────────────────────
// Serilog Configuration
// ──────────────────────────────────────────────
builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .Enrich.WithMachineName()
        .Enrich.WithEnvironmentName()
        .WriteTo.Console();
});

// ──────────────────────────────────────────────
// Service Registration
// ──────────────────────────────────────────────

// Controllers
builder.Services.AddControllers();

// Swagger / OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "RMRS API",
        Version = "v1",
        Description = "Records Management and Registry System API for JB Marks Local Municipality"
    });
});

// CORS Policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("RmrsCorsPolicy", policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? new[] { "https://records.sdinmotion.co.za" };

        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Authentication & Authorization
builder.Services.AddAuthentication();
builder.Services.AddRmrsAuthorization();

// Session support
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.SameSite = SameSiteMode.Strict;
});

// Memory Cache
builder.Services.AddMemoryCache();

// HttpClient factory for Bitrix API
builder.Services.AddHttpClient("BitrixApi", client =>
{
    client.BaseAddress = new Uri(
        builder.Configuration["Bitrix:BaseUrl"] ?? "https://jbmarks.sdinmotion.co.za");
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});

// Application Layer services
builder.Services.AddApplicationServices();

// Infrastructure Layer services (EF Core, repositories, etc.)
builder.Services.AddInfrastructureServices(builder.Configuration);

// Health checks
builder.Services.AddHealthChecks();

// ──────────────────────────────────────────────
// Build Application
// ──────────────────────────────────────────────
var app = builder.Build();

// ──────────────────────────────────────────────
// Middleware Pipeline
// ──────────────────────────────────────────────

// Global exception handling (first in pipeline)
app.UseMiddleware<GlobalExceptionHandlerMiddleware>();

// Serilog request logging
app.UseSerilogRequestLogging(options =>
{
    options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
    {
        diagnosticContext.Set("RequestHost", httpContext.Request.Host.Value);
        diagnosticContext.Set("UserAgent", httpContext.Request.Headers.UserAgent.ToString());
    };
});

// Swagger (disabled in production via appsettings)
var swaggerEnabled = app.Configuration.GetValue<bool>("Swagger:Enabled", app.Environment.IsDevelopment());
if (swaggerEnabled)
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "RMRS API v1");
        options.RoutePrefix = "swagger";
    });
}

// HTTPS Redirection
app.UseHttpsRedirection();

// CORS
app.UseCors("RmrsCorsPolicy");

// Authentication & Authorization
app.UseAuthentication();
app.UseAuthorization();

// Session
app.UseSession();

// Re-authentication challenge for sensitive operations (Requirement 10.5)
app.UseReAuthentication();

// Static files for Angular SPA hosting
app.UseDefaultFiles();
app.UseStaticFiles();

// Map Controllers
app.MapControllers();

// Health check endpoint
app.MapHealthChecks("/health");

// SPA fallback: serve index.html for all non-API, non-file routes (Angular routing)
app.MapFallbackToFile("index.html");

// ──────────────────────────────────────────────
// Run Application
// ──────────────────────────────────────────────
app.Run();

// Make Program class accessible for integration tests
public partial class Program { }
