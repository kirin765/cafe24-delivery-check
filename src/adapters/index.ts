import { parseImportBundle } from "@/features/imports/parse";
import type { ImportBundle, ImportIssue } from "@/features/imports/types";

export interface CsvInput {
  catalog: string;
  rules: string;
  evidence: string;
}

export interface DataSourceAdapter {
  id: string;
  label: string;
  description: string;
  implemented: boolean;
  importFromCsv?: (input: CsvInput) => ImportBundle;
}

export interface AdapterResult {
  bundle: ImportBundle;
  issues: ImportIssue[];
}

export const manualCsvAdapter: DataSourceAdapter = {
  id: "manual-csv",
  label: "수동 CSV 입력",
  description:
    "운영자가 정리한 상품·규칙·근거 CSV를 브라우저에서만 파싱합니다. 파일을 서버로 보내지 않습니다.",
  implemented: true,
  importFromCsv: parseImportBundle,
};

export const officialExportAdapter: DataSourceAdapter = {
  id: "official-export",
  label: "공식 export",
  description:
    "제공 서비스의 공식 export/API 존재와 접근 권한, 규칙 의미를 확인하기 전에는 구현하지 않습니다.",
  implemented: false,
};

export const cafe24ApiAdapter: DataSourceAdapter = {
  id: "cafe24-api",
  label: "Cafe24 API",
  description:
    "주문·상품 조회만으로 외부 발송 설정을 알 수 없습니다. 최소 scope와 launch/OAuth 검증 후 별도로 추가합니다.",
  implemented: false,
};

export const adapters: DataSourceAdapter[] = [
  manualCsvAdapter,
  officialExportAdapter,
  cafe24ApiAdapter,
];

export function getAdapter(id: string): DataSourceAdapter | undefined {
  return adapters.find((adapter) => adapter.id === id);
}
