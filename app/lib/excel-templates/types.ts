import type ExcelJS from "exceljs";
import type { DispatchFilters, DispatchRecord } from "@/app/lib/dispatch";

export type ExcelTemplate = {
  /** 내부 식별자 (URL 파라미터로 사용) */
  id: string;
  /** 화면에 표시될 이름 */
  label: string;
  /** 이 양식을 기본으로 사용하는 회사명 목록 (회사구분 값과 정확히 일치해야 합니다) */
  companies: string[];
  /** 조회 화면의 회사 그룹 이름 (예: "창원공동물류센터"). 그룹으로 조회하면 이 양식이 선택됩니다. */
  group?: string;
  /** 워크북에 시트를 채웁니다 */
  build: (
    workbook: ExcelJS.Workbook,
    rows: DispatchRecord[],
    filters: DispatchFilters
  ) => void | Promise<void>;
};
