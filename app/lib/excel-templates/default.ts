import { applyPrintLayout } from "./shared";
import { columnLetter, writeSiteTable, type SiteColumnKey } from "./site-table";
import type { ExcelTemplate } from "./types";

// 기본 양식: 사이트 조회 표를 그대로 출력합니다 (같은 칸 이름·순서, 2줄 머리줄, 합적 셀 병합).
const KEYS: SiteColumnKey[] = [
  "dispatch_date",
  "company",
  "origin",
  "destination",
  "tonnage",
  "amount",
  "memo",
  "driver",
  "driver_phone",
  "vehicle_number",
  "driver_pay",
];

export const defaultTemplate: ExcelTemplate = {
  id: "default",
  label: "기본 양식",
  companies: [],
  build(workbook, rows) {
    const sheet = workbook.addWorksheet("운송내역", {
      views: [{ state: "frozen", ySplit: 2 }],
    });
    const { headerRows, lastRow } = writeSiteTable(sheet, rows, KEYS, { groupHeader: true });

    applyPrintLayout(sheet, {
      printArea: `A1:${columnLetter(KEYS.length)}${lastRow}`,
      orientation: "landscape",
      titleRows: `1:${headerRows}`,
    });
  },
};
