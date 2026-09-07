// Sinh số chứng từ dạng {PREFIX}{yy}{mm}{dd}{seq:3}, seq là số thứ tự trong
// ngày (đếm số bản ghi hiện có có prefix ngày trùng khớp rồi +1). Cùng một
// quy tắc cho mọi loại phiếu (PO, GRN, CK, NKDH, SO, PXK, HSGC, VT).
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import type { PgColumn } from "drizzle-orm/pg-core";

export function todayYyMmDd(d: Date = new Date()): string {
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

/**
 * Sinh số chứng từ tiếp theo cho 1 cột số chứng từ, dựa trên số lượng bản ghi
 * đã có số bắt đầu bằng "{prefix}{yy}{mm}{dd}" (đếm bằng LIKE — đủ dùng cho
 * tải thấp; nếu tải cao/nhiều người tạo đồng thời cần chuyển sang sequence
 * DB thật hoặc lock bảng khi đếm).
 */
export async function nextDocNumber(
  column: PgColumn,
  prefix: string
): Promise<string> {
  const datePart = todayYyMmDd();
  const pattern = `${prefix}${datePart}%`;
  const condition: SQL = sql`${column} like ${pattern}`;
  const result = await db.execute<{ count: string }>(
    sql`select count(*)::text as count from ${column.table} where ${condition}`
  );
  const countRow = result.rows[0] as unknown as { count: string } | undefined;
  const seq = (countRow ? parseInt(countRow.count, 10) : 0) + 1;
  return `${prefix}${datePart}${String(seq).padStart(3, "0")}`;
}
