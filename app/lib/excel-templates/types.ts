import type ExcelJS from "exceljs";
import type { DispatchFilters, DispatchRecord } from "@/app/lib/dispatch";

export type ExcelTemplate = {
  /** 내부 식별자 (URL 파라미터로 사용) */
  id: string;
  /** 화면에 표시될 이름 */
  label: string;
  /** 이 양식을 기본으로 사용하는 회사명 목록 (회사구분 값과 정확히 일치해야 합니다) */
  companies: string[];
  /** true면 조회에서 회사를 하나 골랐을 때 companies에 없는 회사여도 그 회사 건을 이 양식으로 출력합니다. */
  anyCompany?: boolean;
  /** 조회 화면의 회사 그룹 이름 (예: "창원공동물류센터"). 그룹으로 조회하면 이 양식이 선택됩니다. */
  group?: string;
  /** 다운로드 파일 이름 앞부분 (없으면 회사명 기준) */
  fileLabel?: (filters: DispatchFilters) => string;
  /** 워크북에 시트를 채웁니다 */
  build: (
    workbook: ExcelJS.Workbook,
    rows: DispatchRecord[],
    filters: DispatchFilters
  ) => void | Promise<void>;
};
