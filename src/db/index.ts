import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pgPool?: Pool };

const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool;
}

export const db = drizzle(pool, { schema });

// --- Backfill 1 lần: quyền "xem giá nhập" cho user đã có sẵn ---
// Cột users.xem_gia_nhap được thêm sau khi hệ thống đã có dữ liệu thật, mặc
// định false cho MỌI user (kể cả Admin) ngay sau khi drizzle-kit push chạy
// trong buildCommand. Đoạn dưới tự bật quyền này cho Admin/Kế toán/Quản lý
// kho ở LẦN KHỞI ĐỘNG ĐẦU TIÊN sau khi cột được thêm (tức khi chưa có user
// nào có xem_gia_nhap = true) rồi không bao giờ tự chạy lại — tránh ghi đè
// lựa chọn thủ công sau này của Admin ở màn Quản lý người dùng
// (src/app/(app)/danh-muc/nguoi-dung).
async function backfillXemGiaNhapOnce() {
  try {
    const existing = await pool.query(
      "select 1 from users where xem_gia_nhap = true limit 1"
    );
    if (existing.rowCount && existing.rowCount > 0) return;
    const result = await pool.query(
      "update users set xem_gia_nhap = true where role in ('ADMIN','KE_TOAN','QUAN_LY_KHO')"
    );
    if (result.rowCount && result.rowCount > 0) {
      console.log(
        `[migration] Đã bật quyền xem giá nhập mặc định cho ${result.rowCount} user (Admin/Kế toán/Quản lý kho).`
      );
    }
  } catch (err) {
    // Bảng/cột có thể chưa sẵn sàng (vd DB chưa migrate xong) — bỏ qua, lần
    // khởi động sau sẽ tự thử lại vì đây chỉ là log, không chặn app chạy.
    console.error("[migration] Bỏ qua backfill xem_gia_nhap:", err);
  }
}

void backfillXemGiaNhapOnce();
