import { readFile } from "node:fs/promises";
import path from "node:path";
import type ExcelJS from "exceljs";
import type { ExcelTemplate } from "./types";

// 락텍 원본 양식(files/roctec.xlsx)을 불러와 데이터만 채웁니다.
// 양식 파일 구성 (원본에서 실제 데이터만 지운 것):
//   B1     제목 "YY년 MM월 (홍진물류)락텍운송내역"
//   3행    일자 | 출지 | 착지 | 톤수 | 운송사 | 단가 | 횟수 | 운반비 | 비고   (C~K열)
//   4행    데이터 행 서식 견본 (L열은 테두리 밖 기사명)
//   5행    합계 행 서식 견본 ("합계" … 운반비 합계 | "VAT 별도")
// 양식을 바꾸려면 같은 구성으로 files/roctec.xlsx를 교체하면 됩니다.

const TEMPLATE_PATH = path.join(process.cwd(), "app/lib/excel-templates/files/roctec.xlsx");
const DATA_ROW = 4;
const TOTAL_ROW = 5;
const LAST_COL = 13; // M

type RowStyle = { height: number | undefined; styles: Partial<ExcelJS.Style>[] };

function snapshotRow(sheet: ExcelJS.Worksheet, rowNumber: number): RowStyle {
  const row = sheet.getRow(rowNumber);
  return {
    height: row.height,
    styles: Array.from({ length: LAST_COL }, (_, i) =>
      structuredClone(row.getCell(i + 1).style ?? {})
    ),
  };
}

function applyRowStyle(sheet: ExcelJS.Worksheet, rowNumber: number, rowStyle: RowStyle) {
  const row = sheet.getRow(rowNumber);
  if (rowStyle.height) row.height = rowStyle.height;
  rowStyle.styles.forEach((style, i) => {
    const cell = row.getCell(i + 1);
    cell.value = null;
    cell.style = structuredClone(style);
  });
  return row;
}

function toExcelDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export const roctecTemplate: ExcelTemplate = {
  id: "roctec",
  label: "락텍 양식",
  companies: ["락텍"],
  async build(workbook, rows, filters) {
    // exceljs 타입 정의의 Buffer가 최신 @types/node의 Buffer와 맞지 않아 캐스팅합니다.
    await workbook.xlsx.load((await readFile(TEMPLATE_PATH)) as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.worksheets[0];

    const ordered = [...rows].reverse(); // 날짜 오름차순
    const baseDate = filters.dateFrom || ordered[0]?.dispatch_date || filters.dateTo;
    const [year, month] = (baseDate || new Date().toISOString().slice(0, 10)).split("-");

    sheet.name = `${year}.${month}`;
    sheet.getCell("B1").value = `${year.slice(2)}년  ${month}월 (홍진물류)락텍운송내역`;

    const dataStyle = snapshotRow(sheet, DATA_ROW);
    const totalStyle = snapshotRow(sheet, TOTAL_ROW);

    let rowNumber = DATA_ROW;
    let previousDate: string | null = null;
    for (const record of ordered) {
      const row = applyRowStyle(sheet, rowNumber, dataStyle);
      const amount = Number(record.amount);

      row.getCell("C").value =
        record.dispatch_date === previousDate ? null : toExcelDate(record.dispatch_date);
      row.getCell("D").value = record.origin;
      row.getCell("E").value = record.destination;
      row.getCell("F").value = record.tonnage;
      row.getCell("G").value = "홍진물류";
      row.getCell("H").value = amount;
      row.getCell("I").value = 1;
      row.getCell("J").value = { formula: `H${rowNumber}*I${rowNumber}`, result: amount };
      row.getCell("K").value = record.vehicle_number || null;
      row.getCell("L").value = record.driver || null;

      previousDate = record.dispatch_date;
      rowNumber += 1;
    }

    const totalRow = applyRowStyle(sheet, rowNumber, totalStyle);
    const total = rows.reduce((sum, record) => sum + Number(record.amount), 0);
    totalRow.getCell("C").value = "합계";
    totalRow.getCell("J").value =
      rowNumber > DATA_ROW
        ? { formula: `SUM(J${DATA_ROW}:J${rowNumber - 1})`, result: total }
        : 0;
    totalRow.getCell("K").value = "VAT 별도";

    sheet.pageSetup.printArea = `A1:L${rowNumber}`;
  },
};
