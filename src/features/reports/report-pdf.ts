"use client";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ReportPeriod } from "@/features/reports/report-math";
import { formatMoney } from "@/lib/finance/money";

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 48;

export async function downloadReportPdf(
  name: string,
  periodLabel: string,
  report: ReportPeriod,
) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const text = (
    value: string,
    options: {
      color?: ReturnType<typeof rgb>;
      font?: typeof regular;
      size?: number;
    } = {},
  ) => {
    const size = options.size ?? 10;
    page.drawText(value, {
      color: options.color ?? rgb(0.12, 0.17, 0.24),
      font: options.font ?? regular,
      size,
      x: margin,
      y,
    });
    y -= size + 7;
  };
  const divider = () => {
    page.drawLine({
      color: rgb(0.86, 0.88, 0.91),
      end: { x: pageWidth - margin, y },
      start: { x: margin, y },
      thickness: 1,
    });
    y -= 17;
  };

  page.drawRectangle({
    color: rgb(0.82, 0.25, 0.06),
    height: 32,
    width: 32,
    x: margin,
    y: y - 24,
  });
  page.drawText("rinde.", {
    color: rgb(0.12, 0.17, 0.24),
    font: bold,
    size: 21,
    x: margin + 44,
    y: y - 19,
  });
  y -= 55;
  text("Reporte de actividad", { font: bold, size: 20 });
  text(periodLabel, { color: rgb(0.38, 0.43, 0.5), size: 10 });
  text(`Preparado para ${name}`, { color: rgb(0.38, 0.43, 0.5), size: 10 });
  y -= 4;
  divider();

  text("Resumen", { font: bold, size: 13 });
  const summary: Array<[string, number]> = [
    ["Ingresos", report.metrics.grossCents],
    ["Resultado operativo", report.metrics.resultCents],
    ["Gastos personales", report.metrics.personalCents],
    ["Restante tras gastos", report.metrics.remainingCents],
  ];
  for (const [label, cents] of summary) {
    page.drawText(label, { font: regular, size: 10, x: margin, y });
    const amount = formatMoney(cents);
    page.drawText(amount, {
      font: bold,
      size: 10,
      x: pageWidth - margin - bold.widthOfTextAtSize(amount, 10),
      y,
    });
    y -= 21;
  }
  divider();

  text("Ingresos por plataforma", { font: bold, size: 13 });
  drawBreakdown(
    page,
    report.platformBreakdown,
    regular,
    bold,
    () => y,
    (next) => {
      y = next;
    },
  );
  divider();
  text("Gastos registrados", { font: bold, size: 13 });
  drawBreakdown(
    page,
    report.categoryBreakdown,
    regular,
    bold,
    () => y,
    (next) => {
      y = next;
    },
  );
  divider();
  text("Movimiento por día", { font: bold, size: 13 });
  for (const day of report.daily) {
    if (y < 66) break;
    const expenses = day.operationalCents + day.personalCents + day.fuelCents;
    const value = `${formatDate(day.date)}  -  ${formatMoney(day.grossCents)} ingresos  -  ${formatMoney(expenses)} gastos`;
    text(value, { color: rgb(0.27, 0.32, 0.39), size: 9 });
  }

  page.drawText("Rinde", {
    color: rgb(0.45, 0.49, 0.55),
    font: regular,
    size: 8,
    x: margin,
    y: 28,
  });
  page.drawText("Los montos reflejan únicamente tus registros.", {
    color: rgb(0.45, 0.49, 0.55),
    font: regular,
    size: 8,
    x:
      pageWidth -
      margin -
      regular.widthOfTextAtSize(
        "Los montos reflejan únicamente tus registros.",
        8,
      ),
    y: 28,
  });

  const bytes = await pdf.save();
  const blobBytes = new Uint8Array(bytes.byteLength);
  blobBytes.set(bytes);
  const blob = new Blob([blobBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `reporte-rinde-${report.startDate}-${report.endDate}.pdf`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function drawBreakdown(
  page: ReturnType<PDFDocument["addPage"]>,
  entries: ReportPeriod["categoryBreakdown"],
  regular: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  getY: () => number,
  setY: (value: number) => void,
) {
  let y = getY();
  if (!entries.length) {
    page.drawText("Sin registros en este periodo.", {
      color: rgb(0.45, 0.49, 0.55),
      font: regular,
      size: 10,
      x: margin,
      y,
    });
    setY(y - 19);
    return;
  }
  for (const entry of entries.slice(0, 5)) {
    const amount = formatMoney(entry.cents);
    page.drawText(entry.label, { font: regular, size: 10, x: margin, y });
    page.drawText(amount, {
      font: bold,
      size: 10,
      x: pageWidth - margin - bold.widthOfTextAtSize(amount, 10),
      y,
    });
    y -= 20;
  }
  setY(y);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
