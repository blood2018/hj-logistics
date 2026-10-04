import type { DispatchRecord } from "@/app/lib/dispatch";
import { applyPrintLayout, toExcelDate } from "./shared";
import type { ExcelTemplate } from "./types";

// 기사 정산 양식: 조회 결과를 기사별로 묶어 지급금액까지 모두 출력합니다.
//   1행 제목, 3행 머리줄, 4행부터 기사별 블록(배차 순) + 기사별 소계, 맨 아래 총계
//   지급금액은 배차 단위라 합적이면 그 배차의 줄들을 셀 병합해 한 번만 보여주고, 합계에도 한 번만 들어갑니다.

const COLUMNS = [
  { header: "기사", key: "driver", width: 12 },
  { header: "기사 전화번호", key: "driver_phone", width: 15 },
  { header: "차량번호", key: "vehicle_number", width: 14 },
  { header: "날짜", key: "dispatch_date", width: 11 },
  { header: "회사구분", key: "company", width: 14 },
  { header: "상차지", key: "origin", width: 18 },
  { header: "하차지", key: "destination", width: 22 },
  { header: "톤수", key: "tonnage", width: 8 },
  { header: "청구금액", key: "amount", width: 12 },
  { header: "지급금액", key: "driver_pay", width: 12 },
  { header: "비고", key: "memo", width: 24 },
] as const;

const col = (key: (typeof COLUMNS)[number]["key"]) => COLUMNS.findIndex((c) => c.key === key) + 1;
const letter = (key: (typeof COLUMNS)[number]["key"]) => String.fromCharCode(64 + col(key));

const thin = { style: "thin" as const, color: { argb: "FFBFBFBF" } };
const border = { top: thin, left: thin, bottom: thin, right: thin };
const HEADER_ROW = 3;
const NO_DRIVER = "(기사 미입력)";

/** 기사 → 배차 → 줄 순서로 정렬합니다 (기사 이름순, 기사 미입력은 맨 뒤 / 배차는 날짜순). */
function groupByDriver(rows: DispatchRecord[]) {
  const drivers = new Map<string, Map<string, DispatchRecord[]>>();
  const ordered = [...rows].sort(
    (a, b) =>
      a.dispatch_date.localeCompare(b.dispatch_date) ||
      a.trip_created_at.localeCompare(b.trip_created_at) ||
      a.created_at.localeCompare(b.created_at)
  );
  for (const row of ordered) {
    const name = row.driver.trim() || NO_DRIVER;
    if (!drivers.has(name)) drivers.set(name, new Map());
    const trips = drivers.get(name)!;
    if (!trips.has(row.trip_id)) trips.set(row.trip_id, []);
    trips.get(row.trip_id)!.push(row);
  }
  return [...drivers.entries()].sort(([a], [b]) =>
    a === NO_DRIVER ? 1 : b === NO_DRIVER ? -1 : a.localeCompare(b, "ko")
  );
}

export const driverTemplate: ExcelTemplate = {
  id: "driver",
  label: "기사 정산",
  companies: [],
  fileLabel: (filters) => `기사정산_${filters.driver || "전체"}`,
  build(workbook, rows, filters) {
    const sheet = workbook.addWorksheet("기사정산", {
      views: [{ state: "frozen", ySplit: HEADER_ROW }],
    });
    sheet.columns = COLUMNS.map(({ key, width }) => ({ key, width }));

    const period =
      filters.dateFrom || filters.dateTo
        ? `${filters.dateFrom || "처음"} ~ ${filters.dateTo || "현재"}`
        : "전체 기간";
    sheet.mergeCells(1, 1, 1, COLUMNS.length);
    const title = sheet.getCell(1, 1);
    title.value = `기사 정산 (${period})`;
    title.font = { size: 14, bold: true };
    title.alignment = { horizontal: "center" };

    const header = sheet.getRow(HEADER_ROW);
    header.values = COLUMNS.map((c) => c.header);
    header.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EEF7" } };
      cell.border = border;
    });

    // 합적인데 조회 조건 때문에 일부 줄만 포함된 배차 (지급금액은 배차 전체 금액)
    const linesInResult = new Map<string, number>();
    for (const row of rows) linesInResult.set(row.trip_id, (linesInResult.get(row.trip_id) ?? 0) + 1);

    const subtotalRows: number[] = [];
    const grand = { amount: 0, driver_pay: 0 };
    let rowNumber = HEADER_ROW + 1;

    for (const [driverName, trips] of groupByDriver(rows)) {
      const blockStart = rowNumber;
      let tripCount = 0;
      const sums = { amount: 0, driver_pay: 0 };

      for (const lines of trips.values()) {
        tripCount += 1;
        const tripStart = rowNumber;
        const first = lines[0];
        const partial = (linesInResult.get(first.trip_id) ?? 0) < first.trip_size;
        sums.driver_pay += Number(first.driver_pay ?? 0);

        lines.forEach((line, index) => {
          const row = sheet.getRow(rowNumber);
          row.getCell(col("driver")).value = rowNumber === blockStart ? driverName : null;
          row.getCell(col("driver_phone")).value = index === 0 ? line.driver_phone || null : null;
          row.getCell(col("vehicle_number")).value = index === 0 ? line.vehicle_number || null : null;
          row.getCell(col("dispatch_date")).value = toExcelDate(line.dispatch_date);
          row.getCell(col("company")).value = line.company;
          row.getCell(col("origin")).value = line.origin;
          row.getCell(col("destination")).value = line.destination;
          row.getCell(col("tonnage")).value = line.tonnage || null;
          row.getCell(col("amount")).value = Number(line.amount);
          sums.amount += Number(line.amount);
          if (index === 0) {
            row.getCell(col("driver_pay")).value =
              first.driver_pay == null ? null : Number(first.driver_pay);
          }
          const notes = [
            line.memo,
            index === 0 && partial ? `합적 일부만 조회됨(${first.trip_companies})` : "",
          ].filter(Boolean);
          row.getCell(col("memo")).value = notes.join(" / ") || null;
          rowNumber += 1;
        });

        // 합적: 지급금액·전화·차량 칸을 그 배차의 줄 높이만큼 병합
        if (lines.length > 1) {
          for (const key of ["driver_phone", "vehicle_number", "driver_pay"] as const) {
            sheet.mergeCells(tripStart, col(key), rowNumber - 1, col(key));
          }
        }
      }

      // 기사별 소계
      const sub = sheet.getRow(rowNumber);
      sub.getCell(col("driver")).value = `${driverName} 소계`;
      sub.getCell(col("company")).value = `배차 ${tripCount}건`;
      const sumOf = (key: "amount" | "driver_pay") => ({
        formula: `SUM(${letter(key)}${blockStart}:${letter(key)}${rowNumber - 1})`,
        result: sums[key],
      });
      grand.amount += sums.amount;
      grand.driver_pay += sums.driver_pay;
      sub.getCell(col("amount")).value = sumOf("amount");
      sub.getCell(col("driver_pay")).value = sumOf("driver_pay");
      sub.font = { bold: true };
      sub.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
      });
      subtotalRows.push(rowNumber);
      rowNumber += 1;
    }

    // 총계 (소계 줄들의 합)
    const total = sheet.getRow(rowNumber);
    total.getCell(col("driver")).value = "총계";
    const sumSubtotals = (key: "amount" | "driver_pay") =>
      subtotalRows.length
        ? { formula: subtotalRows.map((r) => `${letter(key)}${r}`).join("+"), result: grand[key] }
        : 0;
    total.getCell(col("amount")).value = sumSubtotals("amount");
    total.getCell(col("driver_pay")).value = sumSubtotals("driver_pay");
    total.font = { bold: true };

    // 서식: 테두리, 정렬, 숫자·날짜 형식
    for (let r = HEADER_ROW + 1; r <= rowNumber; r++) {
      const row = sheet.getRow(r);
      for (let c = 1; c <= COLUMNS.length; c++) {
        const cell = row.getCell(c);
        cell.border = border;
        cell.alignment = { vertical: "middle", ...(cell.alignment ?? {}) };
      }
    }
    sheet.getColumn(col("amount")).numFmt = "#,##0";
    sheet.getColumn(col("driver_pay")).numFmt = "#,##0";
    sheet.getColumn(col("dispatch_date")).numFmt = "yyyy-mm-dd";
    for (const key of ["dispatch_date", "tonnage"] as const) {
      sheet.getColumn(col(key)).alignment = { horizontal: "center", vertical: "middle" };
    }

    applyPrintLayout(sheet, {
      printArea: `A1:${letter("memo")}${rowNumber}`,
      orientation: "landscape",
      titleRows: `${HEADER_ROW}:${HEADER_ROW}`,
    });
  },
};
