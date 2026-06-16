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
    ["Date", "Start destination", "End destination", "Trip type", "Kilometres", "Vehicle", "Notes"]
  ];
  for (const entry of report.entries) {
    rows.push([
      entry.date,
      entry.startLocation,
      entry.endLocation,
      tripType(entry),
      entry.kilometres,
      entry.vehicle ?? "",
      entry.notes ?? ""
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
        .join(",")
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
  sheet.addRow(["Date", "Start destination", "End destination", "Trip type", "Kilometres", "Vehicle", "Notes"]);
  for (const entry of report.entries) {
    sheet.addRow([
      entry.date,
      entry.startLocation,
      entry.endLocation,
      tripType(entry),
      entry.kilometres,
      entry.vehicle ?? "",
      entry.notes ?? ""
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
  doc.fontSize(10).fillColor("#4b5563").text(`${report.startDate} to ${report.endDate}`);
  doc.moveDown();
  doc.fillColor("#111827").fontSize(10);
  doc.text(`Full name: ${report.user.fullName}`);
  doc.text(`Address: ${report.user.address}`);
  doc.text(`Email: ${report.user.email}`);
  doc.text(`TFN: ${report.user.tfn}`);
  doc.moveDown();
  doc.fillColor("#111827").fontSize(12).text(`Total kilometres: ${report.totalKilometres.toFixed(2)} km`);
  doc.moveDown();

  const widths = [66, 126, 126, 72, 52];
  let y = doc.y;
  const headers = ["Date", "Start", "End", "Trip type", "Km"];
  headers.forEach((header, index) => {
    doc.font("Helvetica-Bold").fontSize(9).text(header, 40 + widths.slice(0, index).reduce((a, b) => a + b, 0), y, {
      width: widths[index]
    });
  });
  y += 22;

  doc.font("Helvetica").fontSize(8);
  for (const entry of report.entries) {
    if (y > 760) {
      doc.addPage();
      y = 40;
    }
    const cells = [entry.date, entry.startLocation, entry.endLocation, tripType(entry), entry.kilometres.toFixed(2)];
    cells.forEach((cell, index) => {
      doc.text(cell, 40 + widths.slice(0, index).reduce((a, b) => a + b, 0), y, {
        width: widths[index],
        lineBreak: false
      });
    });
    y += 20;
  }

  doc.end();
  await new Promise<void>((resolve) => stream.on("end", resolve));
  return Buffer.concat(chunks);
}
