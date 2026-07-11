using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Rmrs.Domain.Entities;

namespace Rmrs.Infrastructure.Services;

/// <summary>
/// Generates disposal certificate PDFs using QuestPDF.
/// Certificate contains: list of disposed records, Disposal_Authority reference, approver name, and disposal date.
/// Implements Requirement 7.4.
/// </summary>
public class DisposalCertificateGenerator
{
    /// <summary>
    /// Generates a PDF disposal certificate for the specified batch.
    /// </summary>
    /// <param name="batch">The disposal batch with loaded navigation properties (records, approver, initiator).</param>
    /// <returns>The PDF data as a byte array.</returns>
    public byte[] GenerateCertificate(DisposalBatch batch)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header().Element(header => ComposeHeader(header, batch));
                page.Content().Element(content => ComposeContent(content, batch));
                page.Footer().Element(ComposeFooter);
            });
        });

        return document.GeneratePdf();
    }

    private void ComposeHeader(IContainer container, DisposalBatch batch)
    {
        container.Column(column =>
        {
            column.Item().AlignCenter().Text("DISPOSAL CERTIFICATE")
                .FontSize(18).Bold();

            column.Item().Height(10);

            column.Item().AlignCenter().Text("Records Management and Registry System (RMRS)")
                .FontSize(12);

            column.Item().AlignCenter().Text("JB Marks Local Municipality")
                .FontSize(11).Italic();

            column.Item().Height(20);

            column.Item().BorderBottom(1).BorderColor(Colors.Grey.Medium)
                .PaddingBottom(5);
        });
    }

    private void ComposeContent(IContainer container, DisposalBatch batch)
    {
        container.PaddingVertical(10).Column(column =>
        {
            // Certificate details section
            column.Item().Text("Certificate Details").FontSize(14).Bold();
            column.Item().Height(10);

            column.Item().Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.ConstantColumn(180);
                    columns.RelativeColumn();
                });

                table.Cell().Text("Certificate Number:").Bold();
                table.Cell().Text($"CERT-{batch.BatchNumber}");

                table.Cell().Text("Batch Number:").Bold();
                table.Cell().Text(batch.BatchNumber);

                table.Cell().Text("Disposal Authority:").Bold();
                table.Cell().Text(batch.DisposalAuthorityRef);

                table.Cell().Text("Initiated By:").Bold();
                table.Cell().Text(batch.InitiatedByUser?.FullName ?? "N/A");

                table.Cell().Text("Initiated Date:").Bold();
                table.Cell().Text(batch.InitiatedAt.ToString("yyyy-MM-dd HH:mm UTC"));

                table.Cell().Text("Approved By:").Bold();
                table.Cell().Text(batch.ApprovedByUser?.FullName ?? "N/A");

                table.Cell().Text("Approval Date:").Bold();
                table.Cell().Text(batch.ApprovedAt?.ToString("yyyy-MM-dd HH:mm UTC") ?? "N/A");

                table.Cell().Text("Disposal Date:").Bold();
                table.Cell().Text(batch.ExecutedAt?.ToString("yyyy-MM-dd HH:mm UTC") ?? "N/A");

                table.Cell().Text("Total Records:").Bold();
                table.Cell().Text(batch.DisposalBatchRecords?.Count.ToString() ?? "0");
            });

            column.Item().Height(20);

            // Records list section
            column.Item().Text("Disposed Records").FontSize(14).Bold();
            column.Item().Height(10);

            if (batch.DisposalBatchRecords != null && batch.DisposalBatchRecords.Any())
            {
                column.Item().Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.ConstantColumn(30);   // #
                        columns.RelativeColumn(2);    // Registry Number
                        columns.RelativeColumn(3);    // Subject
                        columns.RelativeColumn(1.5f); // Department
                        columns.RelativeColumn(1);    // Status
                    });

                    // Header row
                    table.Header(header =>
                    {
                        header.Cell().Background(Colors.Grey.Lighten3).Padding(5)
                            .Text("#").Bold();
                        header.Cell().Background(Colors.Grey.Lighten3).Padding(5)
                            .Text("Registry Number").Bold();
                        header.Cell().Background(Colors.Grey.Lighten3).Padding(5)
                            .Text("Subject").Bold();
                        header.Cell().Background(Colors.Grey.Lighten3).Padding(5)
                            .Text("Department").Bold();
                        header.Cell().Background(Colors.Grey.Lighten3).Padding(5)
                            .Text("Status").Bold();
                    });

                    // Data rows
                    var index = 1;
                    foreach (var batchRecord in batch.DisposalBatchRecords)
                    {
                        var record = batchRecord.Record;

                        table.Cell().Padding(4).Text(index.ToString());
                        table.Cell().Padding(4).Text(record?.RegistryNumber ?? "N/A");
                        table.Cell().Padding(4).Text(TruncateText(record?.Subject ?? "N/A", 50));
                        table.Cell().Padding(4).Text(record?.Department?.DepartmentName ?? "N/A");
                        table.Cell().Padding(4).Text(batchRecord.DisposalStatus);

                        index++;
                    }
                });
            }
            else
            {
                column.Item().Text("No records in this batch.").Italic();
            }

            column.Item().Height(30);

            // Legal declaration section
            column.Item().BorderTop(1).BorderColor(Colors.Grey.Medium).PaddingTop(10);
            column.Item().Text("Declaration").FontSize(12).Bold();
            column.Item().Height(5);
            column.Item().Text(
                "This certificate confirms that the above-listed records have been disposed of " +
                "in accordance with the referenced Disposal Authority and in compliance with " +
                "NARSSA regulations and SANS ISO 16175-2:2014 standards. " +
                "All electronic files have been permanently deleted from the Bitrix storage platform. " +
                "Record metadata has been retained for audit purposes.");

            column.Item().Height(20);

            // Signatures section
            column.Item().Row(row =>
            {
                row.RelativeItem().Column(col =>
                {
                    col.Item().Text("Authorized By:").Bold();
                    col.Item().Height(30);
                    col.Item().BorderBottom(1).BorderColor(Colors.Grey.Medium);
                    col.Item().Text(batch.ApprovedByUser?.FullName ?? "________________")
                        .FontSize(9);
                    col.Item().Text("Compliance Officer").FontSize(8).Italic();
                });

                row.ConstantItem(40);

                row.RelativeItem().Column(col =>
                {
                    col.Item().Text("Date:").Bold();
                    col.Item().Height(30);
                    col.Item().BorderBottom(1).BorderColor(Colors.Grey.Medium);
                    col.Item().Text(batch.ExecutedAt?.ToString("yyyy-MM-dd") ?? "________________")
                        .FontSize(9);
                });
            });
        });
    }

    private void ComposeFooter(IContainer container)
    {
        container.AlignCenter().Text(text =>
        {
            text.Span("Page ");
            text.CurrentPageNumber();
            text.Span(" of ");
            text.TotalPages();
        });
    }

    private static string TruncateText(string text, int maxLength)
    {
        if (string.IsNullOrEmpty(text) || text.Length <= maxLength)
            return text;

        return text.Substring(0, maxLength - 3) + "...";
    }
}
