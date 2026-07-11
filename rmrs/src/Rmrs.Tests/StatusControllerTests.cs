using Microsoft.AspNetCore.Mvc;
using Rmrs.Api.Controllers;

namespace Rmrs.Tests;

public class StatusControllerTests
{
    [Fact]
    public void GetStatus_ReturnsOkResult()
    {
        // Arrange
        var controller = new StatusController();

        // Act
        var result = controller.GetStatus();

        // Assert
        Assert.IsType<OkObjectResult>(result);
    }
}
