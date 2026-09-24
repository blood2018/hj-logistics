import { defaultTemplate } from "./default";
import type { ExcelTemplate } from "./types";

// 회사별 양식이 추가되면 여기에 등록합니다.
// 예) import { abcTemplate } from "./abc";  →  [abcTemplate, defaultTemplate]
export const EXCEL_TEMPLATES: ExcelTemplate[] = [defaultTemplate];

export function findTemplate(id: string | null | undefined) {
  return EXCEL_TEMPLATES.find((t) => t.id === id);
}

/** 회사명에 등록된 양식을 찾고, 없으면 기본 양식을 사용합니다. */
export function resolveTemplateForCompany(company: string | null | undefined) {
  return (
    (company && EXCEL_TEMPLATES.find((t) => t.companies.includes(company))) ||
    defaultTemplate
  );
}

export type { ExcelTemplate };
