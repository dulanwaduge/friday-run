import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { PassThrough } from "node:stream";
import { TravelEntry } from "./db.js";
import { PublicUser } from "./auth.js";

export type ReportPayload = {
  entries: TravelEntry[];
  totalKilometres: number;
  title: string;
  startDate: string;
  endDate: string;
  user: PublicUser;
};

type AuditPayload = ReportPayload & {
  deduction: {
    financialYear: string;
    eligibleKilometres: number;
    centsPerKilometreRate: number;
    estimatedDeduction: number;
    estimatedTaxBenefit: number;
    disclaimer: string;
  };
  exportedAt: string;
};

function tripType(entry: TravelEntry) {
  return entry.roundTrip ? "Return trip" : "One-way";
}

export async function buildCsv(report: ReportPayload) {
  const rows: Array<Array<string | number>> = [
    [report.title],
    [`${report.startDate} to ${report.endDate}`],
    ["Full name", report.user.fullName],
    ["Address", report.user.address],
    ["Email", report.user.email],
    ["TFN", report.user.tfn],
    [],
    [
      "Date",
      "Start destination",
      "End destination",
      "Trip type",
      "Kilometres",
      "Vehicle",
      "Notes",
    ],
  ];
  for (const entry of report.entries) {
    rows.push([
      entry.date,
      entry.startLocation,
      entry.endLocation,
      tripType(entry),
      entry.kilometres,
      entry.vehicle ?? "",
      entry.notes ?? "",
    ]);
  }
  rows.push([], ["", "", "", "Total", report.totalKilometres, "", ""]);
  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value ?? "");
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(","),
    )
    .join("\n");
  return Buffer.from(csv);
}

export async function buildXlsx(report: ReportPayload) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FridayRun";
  const sheet = workbook.addWorksheet("Travel report");
  sheet.addRow([report.title]);
  sheet.addRow([`${report.startDate} to ${report.endDate}`]);
  sheet.addRow(["Full name", report.user.fullName]);
  sheet.addRow(["Address", report.user.address]);
  sheet.addRow(["Email", report.user.email]);
  sheet.addRow(["TFN", report.user.tfn]);
  sheet.addRow([]);
  sheet.addRow([
    "Date",
    "Start destination",
    "End destination",
    "Trip type",
    "Kilometres",
    "Vehicle",
    "Notes",
  ]);
  for (const entry of report.entries) {
    sheet.addRow([
      entry.date,
      entry.startLocation,
      entry.endLocation,
      tripType(entry),
      entry.kilometres,
      entry.vehicle ?? "",
      entry.notes ?? "",
    ]);
  }
  sheet.addRow([]);
  sheet.addRow(["", "", "", "Total", report.totalKilometres]);
  sheet.columns.forEach((column) => {
    column.width = 22;
  });
  sheet.getRow(1).font = { bold: true, size: 16 };
  sheet.getRow(8).font = { bold: true };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function buildPdf(report: ReportPayload) {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  doc.pipe(stream);
  stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));

  doc.fontSize(20).text(report.title);
  doc
    .fontSize(10)
    .fillColor("#4b5563")
    .text(`${report.startDate} to ${report.endDate}`);
  doc.moveDown();
  doc.fillColor("#111827").fontSize(10);
  doc.text(`Full name: ${report.user.fullName}`);
  doc.text(`Address: ${report.user.address}`);
  doc.text(`Email: ${report.user.email}`);
  doc.text(`TFN: ${report.user.tfn}`);
  doc.moveDown();
  doc
    .fillColor("#111827")
    .fontSize(12)
    .text(`Total kilometres: ${report.totalKilometres.toFixed(2)} km`);
  doc.moveDown();

  const widths = [66, 126, 126, 72, 52];
  let y = doc.y;
  const headers = ["Date", "Start", "End", "Trip type", "Km"];
  headers.forEach((header, index) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(header, 40 + widths.slice(0, index).reduce((a, b) => a + b, 0), y, {
        width: widths[index],
      });
  });
  y += 22;

  doc.font("Helvetica").fontSize(8);
  for (const entry of report.entries) {
    if (y > 760) {
      doc.addPage();
      y = 40;
    }
    const cells = [
      entry.date,
      entry.startLocation,
      entry.endLocation,
      tripType(entry),
      entry.kilometres.toFixed(2),
    ];
    cells.forEach((cell, index) => {
      doc.text(
        cell,
        40 + widths.slice(0, index).reduce((a, b) => a + b, 0),
        y,
        {
          width: widths[index],
          lineBreak: false,
        },
      );
    });
    y += 20;
  }

  doc.end();
  await new Promise<void>((resolve) => stream.on("end", resolve));
  return Buffer.concat(chunks);
}

function addAuditHeader(doc: PDFKit.PDFDocument, report: AuditPayload) {
  doc
    .font("Helvetica-Bold")
    .fontSize(19)
    .fillColor("#111827")
    .text(report.title);
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#4b5563")
    .text(
      `Financial year ${report.deduction.financialYear} | Exported ${report.exportedAt}`,
    );
  doc.moveDown();
}

export function uniqueVehicleRegistrations(entries: TravelEntry[]) {
  const registrations = new Map<string, string>();
  for (const entry of entries) {
    const displayValue = entry.vehicle?.trim();
    if (!displayValue) continue;
    const normalized = displayValue.replace(/[^a-z0-9]/gi, "").toUpperCase();
    if (normalized && !registrations.has(normalized)) {
      registrations.set(normalized, displayValue.toUpperCase());
    }
  }
  return [...registrations.values()];
}

export async function buildAuditPdf(report: AuditPayload) {
  const doc = new PDFDocument({ margin: 36, size: "A4", bufferPages: true });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  doc.pipe(stream);
  stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));

  addAuditHeader(doc, report);
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#111827")
    .text("Taxpayer details");
  doc.font("Helvetica").fontSize(9).text(`Full name: ${report.user.fullName}`);
  doc.text(`Address: ${report.user.address}`);
  doc.text(`Email: ${report.user.email}`);
  doc.text(`TFN: ${report.user.tfn}`);
  doc.moveDown();

  const vehicles = uniqueVehicleRegistrations(report.entries);
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("Vehicle and financial year summary");
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(
      `Vehicles: ${vehicles.length ? vehicles.join(", ") : "Not recorded"}`,
    );
  doc.text(`Trips: ${report.entries.length}`);
  doc.text(`Total work kilometres: ${report.totalKilometres.toFixed(2)} km`);
  doc.text(
    `Eligible kilometres after the 5,000 km per-car limit: ${report.deduction.eligibleKilometres.toFixed(2)} km`,
  );
  doc.text(
    `Configured rate: $${report.deduction.centsPerKilometreRate.toFixed(2)} per km`,
  );
  doc.text(
    `Estimated deduction: $${report.deduction.estimatedDeduction.toFixed(2)}`,
  );
  doc.text(
    `Estimated tax benefit: $${report.deduction.estimatedTaxBenefit.toFixed(2)}`,
  );
  doc.moveDown();
  doc
    .font("Helvetica-Oblique")
    .fontSize(8)
    .fillColor("#7c2d12")
    .text(report.deduction.disclaimer);
  doc.text(
    "This package is for record-keeping and should be reviewed by a registered tax professional.",
  );
  doc.moveDown();

  doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827").text("Trip log");
  let y = doc.y + 7;
  const widths = [58, 105, 105, 42, 56, 64, 80];
  const headers = [
    "Date",
    "Start",
    "End",
    "Km",
    "Odo start",
    "Odo end",
    "Category / notes",
  ];
  const drawHeader = () => {
    headers.forEach((header, index) =>
      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .text(
          header,
          36 + widths.slice(0, index).reduce((a, b) => a + b, 0),
          y,
          { width: widths[index], lineBreak: false },
        ),
    );
    y += 16;
  };
  drawHeader();
  for (const entry of report.entries) {
    if (y > 775) {
      doc.addPage();
      y = 36;
      drawHeader();
    }
    const detail = `${entry.tripCategory.replaceAll("_", " ")}${entry.notes ? `: ${entry.notes}` : ""}`;
    const cells = [
      entry.date,
      entry.startLocation,
      entry.endLocation,
      entry.kilometres.toFixed(1),
      entry.odometerStart?.toString() ?? "",
      entry.odometerEnd?.toString() ?? "",
      detail,
    ];
    cells.forEach((cell, index) =>
      doc
        .font("Helvetica")
        .fontSize(6.8)
        .text(cell, 36 + widths.slice(0, index).reduce((a, b) => a + b, 0), y, {
          width: widths[index],
          height: 22,
          ellipsis: true,
        }),
    );
    y += 24;
  }

  const pages = doc.bufferedPageRange();
  for (let index = 0; index < pages.count; index += 1) {
    doc.switchToPage(index);
    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor("#6b7280")
      .text(
        `FridayRun record-keeping package | Page ${index + 1} of ${pages.count}`,
        36,
        806,
        { align: "center", width: 523 },
      );
  }
  doc.end();
  await new Promise<void>((resolve) => stream.on("end", resolve));
  return Buffer.concat(chunks);
}
