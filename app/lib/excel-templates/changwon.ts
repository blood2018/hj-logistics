import { COMPANY_GROUPS } from "@/app/lib/dispatch-options";
import {
  applyRowStyle,
  loadTemplateFile,
  reportYearMonth,
  snapshotRow,
  toExcelDate,
} from "./shared";
import type { ExcelTemplate } from "./types";

// 창원공동물류센터 원본 양식(files/changwon.xlsx)을 불러와 데이터와 아래쪽 요약을 채웁니다.
// 양식 파일 구성 (원본에서 실제 데이터만 지운 것):
//   B1     제목 "YY년 MM월 (홍진물류) 차량 배차 일지"
//   3행    일자 | 화주 | 출지 | 착지 | 톤수 | 운송사 | 운반비 | 비고   (B~I열)
//   4행    데이터 행 서식 견본
//   5~8행  원본 아래쪽 요약 영역(350~364행)의 서식 견본: 회사별 합계 / 공급가액 / 부가세 / 총합계
// 요약 영역은 원본과 같은 모양입니다 (라벨 글자 없음):
//   회사 줄들    B 회사명, C 회사별 합계            (마지막 회사 줄의 E = 공급가액)
//   다음 줄      E 부가세(공급가액의 10%)
//   총합계 줄    C 회사별 합계의 합, E 공급가액+부가세, H 운반비 합계

const GROUP = "창원공동물류센터";
const MEMBERS = COMPANY_GROUPS[GROUP];
// 원본 요약 영역의 회사 순서
const SUMMARY_ORDER = [
  "유민",
  "성진정밀",
  "경일화학",
  "SKF",
  "한국총판",
  "SSOT",
  "DPC",
  "롯데케미칼",
  "사토리",
  "MMC",
  "위딘",
  "유니테크",
  "에이큐",
];
const SUMMARY_COMPANIES = [
  ...SUMMARY_ORDER.filter((company) => MEMBERS.includes(company)),
  ...MEMBERS.filter((company) => !SUMMARY_ORDER.includes(company)),
];

const DATA_ROW = 4;
const COMPANY_STYLE_ROW = 5;
const SUPPLY_STYLE_ROW = 6;
const VAT_STYLE_ROW = 7;
const TOTAL_STYLE_ROW = 8;
const LAST_COL = 12; // L
const VAT_RATE = 0.1;

/** "2.5톤"처럼 숫자+톤이면 원본 양식처럼 숫자만 넣고, 그 밖의 표기("1톤왕복" 등)는 그대로 둡니다. */
function tonnageCellValue(tonnage: string) {
  const match = tonnage.match(/^(\d+(?:\.\d+)?)톤$/);
  return match ? Number(match[1]) : tonnage;
}

export const changwonTemplate: ExcelTemplate = {
  id: "changwon",
  label: "창원공동물류센터 양식",
  group: GROUP,
  companies: MEMBERS,
  async build(workbook, rows, filters) {
    const sheet = await loadTemplateFile(workbook, "changwon.xlsx");

    const ordered = [...rows].reverse(); // 날짜 오름차순
    const { year, month } = reportYearMonth(filters.dateFrom, filters.dateTo, ordered[0]?.dispatch_date);

    sheet.name = `${year}.${month}`;
    sheet.getCell("B1").value = `${year.slice(2)}년  ${month}월 (홍진물류) 차량 배차 일지`;

    // 견본 행 서식을 먼저 복사해 둡니다 (데이터가 견본 행 위로 덮어써지므로).
    const dataStyle = snapshotRow(sheet, DATA_ROW, LAST_COL);
    const companyStyle = snapshotRow(sheet, COMPANY_STYLE_ROW, LAST_COL);
    const supplyStyle = snapshotRow(sheet, SUPPLY_STYLE_ROW, LAST_COL);
    const vatStyle = snapshotRow(sheet, VAT_STYLE_ROW, LAST_COL);
    const totalStyle = snapshotRow(sheet, TOTAL_STYLE_ROW, LAST_COL);
    for (let n = COMPANY_STYLE_ROW; n <= TOTAL_STYLE_ROW; n++) {
      sheet.getRow(n).eachCell({ includeEmpty: true }, (cell) => {
        cell.value = null;
        cell.style = {};
      });
    }

    let rowNumber = DATA_ROW;
    let previousDate: string | null = null;
    for (const record of ordered) {
      const row = applyRowStyle(sheet, rowNumber, dataStyle);
      row.getCell("B").value =
        record.dispatch_date === previousDate ? null : toExcelDate(record.dispatch_date);
      row.getCell("C").value = record.company;
      row.getCell("D").value = record.origin;
      row.getCell("E").value = record.destination;
      row.getCell("F").value = tonnageCellValue(record.tonnage);
      row.getCell("G").value = "홍진물류";
      row.getCell("H").value = Number(record.amount);

      previousDate = record.dispatch_date;
      rowNumber += 1;
    }

    const lastDataRow = rowNumber - 1;
    const hasData = lastDataRow >= DATA_ROW;
    const dataRange = (col: string) => `${col}${DATA_ROW}:${col}${lastDataRow}`;
    const total = rows.reduce((sum, record) => sum + Number(record.amount), 0);
    const vat = Math.round(total * VAT_RATE);

    // 한 줄 띄우고 요약 영역
    rowNumber += 1;
    const summaryStart = rowNumber;
    SUMMARY_COMPANIES.forEach((company, index) => {
      const isLast = index === SUMMARY_COMPANIES.length - 1;
      const row = applyRowStyle(sheet, rowNumber, isLast ? supplyStyle : companyStyle);
      const subtotal = rows
        .filter((record) => record.company === company)
        .reduce((sum, record) => sum + Number(record.amount), 0);
      row.getCell("B").value = company;
      row.getCell("C").value = hasData
        ? { formula: `SUMIF(${dataRange("C")},B${rowNumber},${dataRange("H")})`, result: subtotal }
        : 0;
      if (isLast) {
        row.getCell("E").value = hasData ? { formula: `SUM(${dataRange("H")})`, result: total } : 0;
      }
      rowNumber += 1;
    });
    const supplyRow = rowNumber - 1;

    const vatRow = applyRowStyle(sheet, rowNumber, vatStyle);
    vatRow.getCell("E").value = {
      formula: `ROUND(E${supplyRow}*${VAT_RATE},0)`,
      result: vat,
    };
    rowNumber += 1;

    const totalRow = applyRowStyle(sheet, rowNumber, totalStyle);
    totalRow.getCell("C").value = { formula: `SUM(C${summaryStart}:C${rowNumber - 1})`, result: total };
    totalRow.getCell("E").value = { formula: `SUM(E${supplyRow}:E${rowNumber - 1})`, result: total + vat };
    totalRow.getCell("H").value = hasData ? { formula: `SUM(${dataRange("H")})`, result: total } : 0;

    sheet.pageSetup.printArea = `A1:I${rowNumber}`;
  },
};
