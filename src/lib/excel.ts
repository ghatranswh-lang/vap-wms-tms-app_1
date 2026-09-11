"use client";

// Tiện ích xuất/nhập Excel dùng chung — chạy hoàn toàn ở trình duyệt (không qua
// server), dùng thư viện "xlsx" (SheetJS).
import * as XLSX from "xlsx";

export function exportRowsToExcel(
  rows: Record<string, string | number | null | undefined>[],
  filename: string,
  sheetName = "Sheet1"
) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

export async function parseExcelFile(
  file: File
): Promise<Record<string, string>[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<
    string,
    string | number
  >[];
  // Chuẩn hoá mọi giá trị về string để dễ xử lý ở nơi gọi (form nhập liệu).
  return rows.map((r) => {
    const out: Record<string, string> = {};
    for (const k of Object.keys(r)) out[k.trim()] = String(r[k] ?? "").trim();
    return out;
  });
}
