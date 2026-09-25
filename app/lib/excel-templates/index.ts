import { changwonTemplate } from "./changwon";
import { defaultTemplate } from "./default";
import { roctecTemplate } from "./roctec";
import type { ExcelTemplate } from "./types";

// 회사별 양식이 추가되면 여기에 등록합니다.
// 예) import { abcTemplate } from "./abc";  →  [abcTemplate, defaultTemplate]
export const EXCEL_TEMPLATES: ExcelTemplate[] = [roctecTemplate, changwonTemplate, defaultTemplate];

export function findTemplate(id: string | null | undefined) {
  return EXCEL_TEMPLATES.find((t) => t.id === id);
}

/** 회사명(또는 회사 그룹명)에 등록된 양식을 찾고, 없으면 기본 양식을 사용합니다. */
export function resolveTemplateForCompany(company: string | null | undefined) {
  return (
    (company &&
      EXCEL_TEMPLATES.find((t) => t.group === company || t.companies.includes(company))) ||
    defaultTemplate
  );
}

export type { ExcelTemplate };
