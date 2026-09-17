import * as XLSX from "xlsx";
import { parseCsv } from "./csv";

const ZIP_MAGIC = [0x50, 0x4b];
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0];

function startsWith(bytes: ArrayBuffer, magic: number[]): boolean {
  if (bytes.byteLength < magic.length) return false;
  const head = new Uint8Array(bytes, 0, magic.length);
  return magic.every((byte, index) => head[index] === byte);
}

export function looksLikeSpreadsheet(name: string, bytes: ArrayBuffer): boolean {
  const lower = name.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".xlsm")) return true;
  return startsWith(bytes, ZIP_MAGIC) || startsWith(bytes, OLE_MAGIC);
}

function toTable(rows: unknown[][]): string[][] {
  return rows.map((row) =>
    row.map((cell) => (cell === null || cell === undefined ? "" : String(cell).trim())),
  );
}

export function readTabularRows(name: string, bytes: ArrayBuffer): string[][] {
  if (looksLikeSpreadsheet(name, bytes)) {
    const workbook = XLSX.read(bytes, { type: "array", dense: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    });
    return toTable(rows as unknown[][]);
  }
  const text = new TextDecoder("utf-8").decode(bytes);
  return parseCsv(text).filter((row) => row.some((cell) => cell.trim() !== ""));
}

export async function readTabularFile(file: File): Promise<string[][]> {
  return readTabularRows(file.name, await file.arrayBuffer());
}
