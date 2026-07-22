using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Rmrs.Application.Interfaces;
using Rmrs.Domain.Entities;

namespace Rmrs.Infrastructure.Services;

/// <summary>
/// Generates transfer manifest PDFs using QuestPDF.
/// The manifest includes: batch number, transfer date, destination archive,
/// list of records with metadata, and total record count.
/// Implements Requirement 8.3.
/// </summary>
public class TransferManifestGenerator : ITransferManifestGenerator
{
    /// <inheritdoc />
    public byte[] GenerateManifest(TransferBatch batch)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        var document = QuestPDF.Fluent.Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(40);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header().Element(header => ComposeHeader(header, batch));
                page.Content().Element(content => ComposeContent(content, batch));
                page.Footer().Element(ComposeFooter);
            });
        });

        return document.GeneratePdf();
    }

    private void ComposeHeader(IContainer container, TransferBatch batch)
    {
        container.Column(column =>
        {
            column.Item().AlignCenter().Text("ARCHIVE TRANSFER MANIFEST")
                .Bold().FontSize(16);

            column.Item().PaddingTop(5).AlignCenter().Text("Records Management and Registry System (RMRS)")
                .FontSize(9).FontColor(Colors.Grey.Darken1);

            column.Item().PaddingTop(5).AlignCenter().Text("JB Marks Local Municipality")
                .FontSize(9).FontColor(Colors.Grey.Darken1);

            column.Item().PaddingTop(15).LineHorizontal(1).LineColor(Colors.Grey.Darken2);

            column.Item().PaddingTop(10).Row(row =>
            {
                row.RelativeItem().Column(left =>
                {
                    left.Item().Text(text =>
                    {
                        text.Span("Batch Number: ").Bold();
                        text.Span(batch.BatchNumber);
                    });
                    left.Item().Text(text =>
                    {
                        text.Span("Destination Archive: ").Bold();
                        text.Span(batch.DestinationArchive);
                    });
                    left.Item().Text(text =>
                    {
                        text.Span("Created By: ").Bold();
                        text.Span(batch.CreatedByUser?.FullName ?? "Unknown");
                    });
                });

                row.RelativeItem().Column(right =>
                {
                    right.Item().Text(text =>
                    {
                        text.Span("Transfer Date: ").Bold();
                        text.Span(batch.FinalizedAt?.ToString("yyyy-MM-dd") ?? DateTime.UtcNow.ToString("yyyy-MM-dd"));
                    });
                    right.Item().Text(text =>
                    {
                        text.Span("Total Records: ").Bold();
                        text.Span(batch.TransferBatchRecords?.Count.ToString() ?? "0");
                    });
                    right.Item().Text(text =>
                    {
                        text.Span("Status: ").Bold();
                        text.Span(batch.Status);
                    });
                });
            });

            if (!string.IsNullOrEmpty(batch.ArchiveReferenceNumber))
            {
                column.Item().PaddingTop(5).Text(text =>
                {
                    text.Span("Archive Reference Number: ").Bold();
                    text.Span(batch.ArchiveReferenceNumber);
                });
            }

            column.Item().PaddingTop(10).LineHorizontal(0.5f).LineColor(Colors.Grey.Medium);
        });
    }

    private void ComposeContent(IContainer container, TransferBatch batch)
    {
        container.PaddingTop(10).Column(column =>
        {
            column.Item().Text("Records in Transfer Batch").Bold().FontSize(12);
            column.Item().PaddingTop(5);

            column.Item().Table(table =>
            {
                // Define columns
                table.ColumnsDefinition(columns =>
                {
                    columns.ConstantColumn(30);   // #
                    columns.RelativeColumn(2);    // Registry Number
                    columns.RelativeColumn(3);    // Subject/Title
                    columns.RelativeColumn(1.5f); // Classification Code
                    columns.RelativeColumn(1);    // Record Type
                    columns.RelativeColumn(1.2f); // Date
                });

                // Table header
                table.Header(header =>
                {
                    header.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("#").Bold().FontSize(8);
                    header.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Registry Number").Bold().FontSize(8);
                    header.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Subject/Title").Bold().FontSize(8);
                    header.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Classification").Bold().FontSize(8);
                    header.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Type").Bold().FontSize(8);
                    header.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Date").Bold().FontSize(8);
                });

                // Table rows
                var records = batch.TransferBatchRecords?
                    .Where(tbr => tbr.ValidationStatus == "Valid" || batch.Status == "Finalized" || batch.Status == "Completed")
                    .OrderBy(tbr => tbr.Record?.RegistryNumber)
                    .ToList() ?? new List<TransferBatchRecord>();

                for (int i = 0; i < records.Count; i++)
                {
                    var tbr = records[i];
                    var record = tbr.Record;
                    var bgColor = i % 2 == 0 ? Colors.White : Colors.Grey.Lighten4;

                    table.Cell().Background(bgColor).Padding(3).Text((i + 1).ToString()).FontSize(8);
                    table.Cell().Background(bgColor).Padding(3).Text(record?.RegistryNumber ?? "-").FontSize(8);
                    table.Cell().Background(bgColor).Padding(3).Text(TruncateText(record?.Subject ?? "-", 60)).FontSize(8);
                    table.Cell().Background(bgColor).Padding(3).Text(record?.FilePlanEntry?.ClassificationCode ?? "-").FontSize(8);
                    table.Cell().Background(bgColor).Padding(3).Text(record?.RecordType ?? "-").FontSize(8);
                    table.Cell().Background(bgColor).Padding(3).Text(record?.DateReceivedOrSent.ToString("yyyy-MM-dd") ?? "-").FontSize(8);
                }
            });

            // Summary
            var totalRecords = batch.TransferBatchRecords?.Count(tbr =>
                tbr.ValidationStatus == "Valid" || batch.Status == "Finalized" || batch.Status == "Completed") ?? 0;

            column.Item().PaddingTop(15).LineHorizontal(0.5f).LineColor(Colors.Grey.Medium);
            column.Item().PaddingTop(10).Text(text =>
            {
                text.Span("Total Records in Transfer: ").Bold();
                text.Span(totalRecords.ToString());
            });

            // Signature block
            column.Item().PaddingTop(30).Row(row =>
            {
                row.RelativeItem().Column(left =>
                {
                    left.Item().Text("Prepared By:").Bold().FontSize(9);
                    left.Item().PaddingTop(20).LineHorizontal(0.5f).LineColor(Colors.Black);
                    left.Item().Text("Name / Signature / Date").FontSize(8).FontColor(Colors.Grey.Darken1);
                });

                row.ConstantItem(40);

                row.RelativeItem().Column(right =>
                {
                    right.Item().Text("Received By (Archive):").Bold().FontSize(9);
                    right.Item().PaddingTop(20).LineHorizontal(0.5f).LineColor(Colors.Black);
                    right.Item().Text("Name / Signature / Date").FontSize(8).FontColor(Colors.Grey.Darken1);
                });
            });
        });
    }

    private void ComposeFooter(IContainer container)
    {
        container.AlignCenter().Text(text =>
        {
            text.Span("Generated by RMRS on ").FontSize(8).FontColor(Colors.Grey.Darken1);
            text.Span(DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss UTC")).FontSize(8).FontColor(Colors.Grey.Darken1);
            text.Span(" | Page ").FontSize(8).FontColor(Colors.Grey.Darken1);
            text.CurrentPageNumber().FontSize(8);
            text.Span(" of ").FontSize(8).FontColor(Colors.Grey.Darken1);
            text.TotalPages().FontSize(8);
        });
    }

    private static string TruncateText(string text, int maxLength)
    {
        if (string.IsNullOrEmpty(text) || text.Length <= maxLength)
            return text;
        return text[..(maxLength - 3)] + "...";
    }
}
