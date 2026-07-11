using Microsoft.Extensions.Logging;
using Rmrs.Application.Interfaces;
using ZXing;
using ZXing.Common;
using ZXing.Rendering;

namespace Rmrs.Infrastructure.Services;

/// <summary>
/// Generates barcode (Code128) and QR code images using ZXing.Net.
/// Each physical record gets a unique barcode derived from its registry number.
/// </summary>
public class BarcodeGeneratorService : IBarcodeGeneratorService
{
    private readonly ILogger<BarcodeGeneratorService> _logger;

    private const int BarcodeWidth = 300;
    private const int BarcodeHeight = 100;
    private const int QrCodeSize = 250;

    public BarcodeGeneratorService(ILogger<BarcodeGeneratorService> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc />
    public byte[] GenerateBarcode(string registryNumber)
    {
        if (string.IsNullOrWhiteSpace(registryNumber))
            throw new ArgumentException("Registry number cannot be null or empty.", nameof(registryNumber));

        _logger.LogDebug("Generating Code128 barcode for registry number: {RegistryNumber}", registryNumber);

        var writer = new BarcodeWriterPixelData
        {
            Format = BarcodeFormat.CODE_128,
            Options = new EncodingOptions
            {
                Width = BarcodeWidth,
                Height = BarcodeHeight,
                Margin = 10,
                PureBarcode = false
            }
        };

        var pixelData = writer.Write(registryNumber);
        return ConvertPixelDataToPng(pixelData, BarcodeWidth, BarcodeHeight);
    }

    /// <inheritdoc />
    public byte[] GenerateQrCode(string registryNumber)
    {
        if (string.IsNullOrWhiteSpace(registryNumber))
            throw new ArgumentException("Registry number cannot be null or empty.", nameof(registryNumber));

        _logger.LogDebug("Generating QR code for registry number: {RegistryNumber}", registryNumber);

        var writer = new BarcodeWriterPixelData
        {
            Format = BarcodeFormat.QR_CODE,
            Options = new EncodingOptions
            {
                Width = QrCodeSize,
                Height = QrCodeSize,
                Margin = 2
            }
        };

        var pixelData = writer.Write(registryNumber);
        return ConvertPixelDataToPng(pixelData, QrCodeSize, QrCodeSize);
    }

    /// <summary>
    /// Converts raw BGRA pixel data from ZXing to a BMP-format byte array.
    /// Uses a simple BMP format since ZXing.Net produces raw pixel data.
    /// </summary>
    private static byte[] ConvertPixelDataToPng(PixelData pixelData, int width, int height)
    {
        // ZXing.Net PixelData contains raw BGRA pixel data.
        // We'll produce a simple BMP (bitmap) file format which is widely supported.
        var pixels = pixelData.Pixels;

        // BMP file structure
        int rowSize = ((width * 3 + 3) / 4) * 4; // Each row must be a multiple of 4 bytes
        int imageSize = rowSize * height;
        int fileSize = 54 + imageSize; // 14 (file header) + 40 (info header) + image data

        using var ms = new MemoryStream(fileSize);
        using var writer = new BinaryWriter(ms);

        // BMP File Header (14 bytes)
        writer.Write((byte)'B');
        writer.Write((byte)'M');
        writer.Write(fileSize);
        writer.Write((short)0); // Reserved
        writer.Write((short)0); // Reserved
        writer.Write(54); // Offset to pixel data

        // BMP Info Header (40 bytes)
        writer.Write(40); // Header size
        writer.Write(width);
        writer.Write(height);
        writer.Write((short)1); // Color planes
        writer.Write((short)24); // Bits per pixel (BGR)
        writer.Write(0); // Compression (none)
        writer.Write(imageSize);
        writer.Write(2835); // Horizontal resolution (pixels/meter)
        writer.Write(2835); // Vertical resolution (pixels/meter)
        writer.Write(0); // Colors in palette
        writer.Write(0); // Important colors

        // BMP stores rows bottom-to-top
        for (int y = height - 1; y >= 0; y--)
        {
            for (int x = 0; x < width; x++)
            {
                int pixelIndex = (y * width + x) * 4; // BGRA format
                byte b = pixels[pixelIndex];
                byte g = pixels[pixelIndex + 1];
                byte r = pixels[pixelIndex + 2];
                // Write BGR for BMP
                writer.Write(b);
                writer.Write(g);
                writer.Write(r);
            }
            // Pad row to multiple of 4 bytes
            int padding = rowSize - (width * 3);
            for (int p = 0; p < padding; p++)
            {
                writer.Write((byte)0);
            }
        }

        return ms.ToArray();
    }
}
