import { readFile } from "node:fs/promises";
import path from "node:path";
import type ExcelJS from "exceljs";

// 원본 양식 파일(files/*.xlsx)을 불러와 채우는 회사 양식들이 같이 쓰는 도구입니다.

export async function loadTemplateFile(workbook: ExcelJS.Workbook, fileName: string) {
  const filePath = path.join(process.cwd(), "app/lib/excel-templates/files", fileName);
  // exceljs 타입 정의의 Buffer가 최신 @types/node의 Buffer와 맞지 않아 캐스팅합니다.
  await workbook.xlsx.load(
    (await readFile(filePath)) as unknown as Parameters<typeof workbook.xlsx.load>[0]
  );
  return workbook.worksheets[0];
}

export type RowStyle = { height: number | undefined; styles: Partial<ExcelJS.Style>[] };

/** 양식의 견본 행 서식(높이·셀 스타일)을 복사해 둡니다. */
export function snapshotRow(sheet: ExcelJS.Worksheet, rowNumber: number, lastCol: number): RowStyle {
  const row = sheet.getRow(rowNumber);
  return {
    height: row.height,
    styles: Array.from({ length: lastCol }, (_, i) =>
      structuredClone(row.getCell(i + 1).style ?? {})
    ),
  };
}

/** 복사해 둔 서식을 행에 입히고 값은 비웁니다. */
export function applyRowStyle(sheet: ExcelJS.Worksheet, rowNumber: number, rowStyle: RowStyle) {
  const row = sheet.getRow(rowNumber);
  if (rowStyle.height) row.height = rowStyle.height;
  rowStyle.styles.forEach((style, i) => {
    const cell = row.getCell(i + 1);
    cell.value = null;
    cell.style = structuredClone(style);
  });
  return row;
}

export function toExcelDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** 조회 기간(없으면 첫 데이터)의 연·월. 제목과 시트 이름에 씁니다. */
export function reportYearMonth(dateFrom: string, dateTo: string, firstDate?: string) {
  const base = dateFrom || firstDate || dateTo || new Date().toISOString().slice(0, 10);
  const [year, month] = base.split("-");
  return { year, month };
}

/**
 * 받은 파일을 바로 인쇄해도 칸이 잘리지 않도록 인쇄 설정을 맞춥니다.
 * - A4, 가로는 한 장 폭에 맞춤 / 세로는 필요한 만큼 여러 장 (onePage면 한 장에 모두)
 * - titleRows가 있으면 페이지마다 머리줄을 반복 인쇄
 */
export function applyPrintLayout(
  sheet: ExcelJS.Worksheet,
  options: {
    printArea: string;
    orientation?: "portrait" | "landscape";
    titleRows?: string;
    onePage?: boolean;
  }
) {
  sheet.pageSetup.paperSize = 9; // A4
  sheet.pageSetup.orientation = options.orientation ?? "portrait";
  sheet.pageSetup.fitToPage = true;
  sheet.pageSetup.fitToWidth = 1;
  sheet.pageSetup.fitToHeight = options.onePage ? 1 : 0;
  sheet.pageSetup.horizontalCentered = true;
  sheet.pageSetup.printArea = options.printArea;
  if (options.titleRows) sheet.pageSetup.printTitlesRow = options.titleRows;
  sheet.pageSetup.margins = { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 };
}
