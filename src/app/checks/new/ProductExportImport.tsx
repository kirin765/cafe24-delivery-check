"use client";

import { useMemo, useState } from "react";
import type { TriState } from "@/features/checks/types";
import {
  EXPORT_FIELD_LABELS,
  autoDetectMapping,
  buildCatalogFromExport,
  detectHeaderRow,
  type CatalogFieldKey,
  type ProductExportMapping,
} from "@/features/imports/productExport";
import { readTabularFile } from "@/features/imports/tabular";

const FIELDS: CatalogFieldKey[] = ["productNo", "productName", "variantCode", "saleActive"];
const TRI_OPTIONS: TriState[] = ["yes", "no", "unknown"];

export function ProductExportImport({ onApply }: { onApply: (csv: string) => void }) {
  const [rows, setRows] = useState<string[][]>([]);
  const [headerIndex, setHeaderIndex] = useState(0);
  const [mapping, setMapping] = useState<ProductExportMapping | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [applied, setApplied] = useState<number | null>(null);

  const header = rows[headerIndex] ?? [];
  const result = useMemo(
    () => (mapping && rows.length > 0 ? buildCatalogFromExport(rows, headerIndex, mapping) : null),
    [rows, headerIndex, mapping],
  );

  const loadFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setApplied(null);
    try {
      const parsed = await readTabularFile(file);
      if (parsed.length === 0) {
        setRows([]);
        setMapping(null);
        setError("파일에서 행을 찾지 못했습니다.");
        return;
      }
      const index = detectHeaderRow(parsed);
      setRows(parsed);
      setHeaderIndex(index);
      setMapping(autoDetectMapping(parsed[index] ?? [], parsed.slice(index + 1)));
      setFileName(file.name);
    } catch (cause) {
      setRows([]);
      setMapping(null);
      setError(cause instanceof Error ? cause.message : "파일을 읽지 못했습니다.");
    }
  };

  const changeHeaderRow = (index: number) => {
    setHeaderIndex(index);
    setApplied(null);
    setMapping((previous) => {
      const detected = autoDetectMapping(rows[index] ?? [], rows.slice(index + 1));
      if (!previous) return detected;
      return { ...previous, columns: detected.columns };
    });
  };

  const updateColumn = (field: CatalogFieldKey, value: string) => {
    setApplied(null);
    setMapping((previous) =>
      previous ? { ...previous, columns: { ...previous.columns, [field]: value } } : previous,
    );
  };

  const updateConstant = <K extends keyof ProductExportMapping>(
    key: K,
    value: ProductExportMapping[K],
  ) => {
    setApplied(null);
    setMapping((previous) => (previous ? { ...previous, [key]: value } : previous));
  };

  const apply = () => {
    if (!result || result.entries.length === 0) return;
    onApply(result.csv);
    setApplied(result.entries.length);
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">상품 export 가져오기 (CSV/XLSX)</h2>
      <p className="mt-1 text-xs text-slate-500">
        몰 관리자의 상품 다운로드 파일을 올려 상품 목록 CSV로 변환합니다. 열을 자동으로 추정하니 매핑을
        확인하세요. 파일은 브라우저에서만 처리됩니다.
      </p>
      <input
        type="file"
        data-testid="product-export-file"
        accept=".csv,.xlsx,.xls,.xlsm,text/csv"
        onChange={(event) => loadFile(event.target.files?.[0])}
        className="mt-2 text-xs text-slate-600"
      />
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}

      {mapping && rows.length > 0 && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="font-medium text-slate-900">{fileName}</span>
            <span>{rows.length}행</span>
            <label className="flex items-center gap-1">
              머리글 행
              <select
                data-testid="export-header-row"
                value={headerIndex}
                onChange={(event) => changeHeaderRow(Number(event.target.value))}
                className="rounded border border-slate-300 px-1 py-0.5"
              >
                {rows.slice(0, 10).map((row, index) => (
                  <option key={index} value={index}>
                    {index + 1}행: {row.filter((cell) => cell !== "").slice(0, 3).join(" / ")}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-600">
              mall_id (고정값)
              <input
                data-testid="export-mall-id"
                value={mapping.mallId}
                onChange={(event) => updateConstant("mallId", event.target.value)}
                placeholder="예: onnurimun"
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs text-slate-600">
              shop_no (고정값)
              <input
                data-testid="export-shop-no"
                value={mapping.shopNo}
                onChange={(event) => updateConstant("shopNo", event.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs text-slate-600">
              sale_active 기본값 (상태 열 미선택 시)
              <select
                data-testid="export-sale-default"
                value={mapping.saleActiveDefault}
                onChange={(event) => updateConstant("saleActiveDefault", event.target.value as TriState)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
              >
                {TRI_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-600">
              digital_confirmed 고정값 (판정 열 미선택 시)
              <select
                data-testid="export-digital"
                value={mapping.digitalConfirmed}
                onChange={(event) => updateConstant("digitalConfirmed", event.target.value as TriState)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
              >
                {TRI_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-600">
              디지털 판정 열 (선택)
              <select
                data-testid="export-digital-column"
                value={mapping.digitalColumn}
                onChange={(event) => updateConstant("digitalColumn", event.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
              >
                <option value="">(사용 안 함)</option>
                {header.map((name, index) => (
                  <option key={`${name}-${index}`} value={name}>
                    {name || `(열 ${index + 1})`}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-600">
              판정 값 (쉼표로 여러 개, 예: eBook,전자책)
              <input
                data-testid="export-digital-values"
                value={mapping.digitalValues}
                onChange={(event) => updateConstant("digitalValues", event.target.value)}
                disabled={mapping.digitalColumn === ""}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
              />
            </label>
            <label className="text-xs text-slate-600">
              일치 시 값
              <select
                data-testid="export-digital-match"
                value={mapping.digitalMatchValue}
                onChange={(event) => updateConstant("digitalMatchValue", event.target.value as TriState)}
                disabled={mapping.digitalColumn === ""}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
              >
                {TRI_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-600">
              그 외 값
              <select
                data-testid="export-digital-fallback"
                value={mapping.digitalFallbackValue}
                onChange={(event) => updateConstant("digitalFallbackValue", event.target.value as TriState)}
                disabled={mapping.digitalColumn === ""}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
              >
                {TRI_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <label key={field} className="text-xs text-slate-600">
                {EXPORT_FIELD_LABELS[field]}
                <select
                  data-testid={`export-column-${field}`}
                  value={mapping.columns[field]}
                  onChange={(event) => updateColumn(field, event.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                >
                  <option value="">(사용 안 함)</option>
                  {header.map((name, index) => (
                    <option key={`${name}-${index}`} value={name}>
                      {name || `(열 ${index + 1})`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <p className="text-xs text-amber-700">
            digital_confirmed는 상품명으로 자동 분류하지 않습니다. 고정값으로 주거나, &apos;디지털 판정
            열&apos;에 운영자가 확인한 분류 열과 값(예: 세분류 = eBook)을 직접 지정하세요.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-testid="apply-export"
              onClick={apply}
              disabled={!result || result.entries.length === 0}
              className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              상품 목록에 반영
            </button>
            {result && (
              <span className="text-xs text-slate-600">
                변환 {result.entries.length}건 · 건너뜀 {result.skipped} · 중복 {result.duplicates}
              </span>
            )}
            {applied !== null && (
              <span data-testid="export-applied" className="text-xs text-green-700">
                {applied}건 반영됨 (아래 상품 목록 CSV 확인)
              </span>
            )}
          </div>
          {result && result.issues.length > 0 && (
            <ul className="list-disc space-y-1 pl-4 text-xs text-amber-700">
              {result.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
