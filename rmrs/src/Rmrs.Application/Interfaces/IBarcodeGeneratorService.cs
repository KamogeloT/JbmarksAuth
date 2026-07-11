namespace Rmrs.Application.Interfaces;

/// <summary>
/// Service for generating barcode and QR code images for physical records.
/// Each physical record gets a unique barcode generated from its registry number.
/// </summary>
public interface IBarcodeGeneratorService
{
    /// <summary>
    /// Generates a Code128 barcode image as a PNG byte array for the given registry number.
    /// </summary>
    /// <param name="registryNumber">The unique registry number to encode (e.g., "RMRS/FIN/2024/00042").</param>
    /// <returns>PNG image bytes of the generated barcode.</returns>
    byte[] GenerateBarcode(string registryNumber);

    /// <summary>
    /// Generates a QR code image as a PNG byte array for the given registry number.
    /// </summary>
    /// <param name="registryNumber">The unique registry number to encode (e.g., "RMRS/FIN/2024/00042").</param>
    /// <returns>PNG image bytes of the generated QR code.</returns>
    byte[] GenerateQrCode(string registryNumber);
}
