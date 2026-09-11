import { auth } from "@/auth";
import type { UserPermissions } from "@/db/schema";

// Danh sách chức năng (module) có thể cấp quyền Sửa/Xoá riêng theo từng user.
// Thêm module mới ở đây khi màn hình đó được bổ sung nút Sửa/Xoá — màn Quản
// lý người dùng (src/app/(app)/danh-muc/nguoi-dung) sẽ tự hiện thêm dòng.
export const MODULES = [
  { key: "mua_hang", label: "Mua hàng (PO)" },
  { key: "nhap_kho", label: "Nhập kho" },
  { key: "nhap_kho_duc_hoa", label: "Nhập kho Đức Hòa" },
  { key: "chuyen_kho", label: "Chuyển kho" },
  { key: "ban_hang", label: "Bán hàng" },
  { key: "xuat_kho", label: "Xuất kho" },
  { key: "giai_chap", label: "Giải chấp" },
  { key: "van_tai", label: "Vận tải" },
  { key: "danh_muc", label: "Danh mục" },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];
export type PermAction = "edit" | "delete";

// next-auth's Session["user"] chỉ khai báo sẵn name/email/image — role/
// permissions được gắn thêm ở callback session() trong src/auth.ts mà không
// có type augmentation (giống cách xemGiaNhap/xemCuoc đang làm), nên nhận
// session kiểu `unknown`/bất kỳ ở đây rồi tự ép kiểu, thay vì đòi hỏi đúng
// type Session của next-auth (gây lỗi TS ở nơi gọi).
type SessionShape = {
  role?: string;
  permissions?: UserPermissions;
} | null | undefined;

function extractUser(session: unknown): SessionShape {
  const s = session as { user?: unknown } | null | undefined;
  return (s?.user as SessionShape) ?? null;
}

// Admin luôn có toàn quyền, bất kể map permissions — để không bao giờ tự khoá
// tay Admin ra khỏi hệ thống. Các vai trò khác chỉ được Sửa/Xoá 1 module nếu
// Admin đã tick rõ ràng cho user đó ở màn Quản lý người dùng.
export function checkPerm(
  session: unknown,
  moduleKey: ModuleKey,
  action: PermAction
): boolean {
  const user = extractUser(session);
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return !!user.permissions?.[moduleKey]?.[action];
}

export function canEdit(session: unknown, moduleKey: ModuleKey): boolean {
  return checkPerm(session, moduleKey, "edit");
}

export function canDelete(session: unknown, moduleKey: ModuleKey): boolean {
  return checkPerm(session, moduleKey, "delete");
}

// Dùng trong Server Actions/Server Components — tự lấy session hiện tại nên
// không cần truyền session vào. Luôn kiểm tra lại quyền ở action (không chỉ
// ẩn nút ở UI) vì action có thể bị gọi trực tiếp.
export async function hasPerm(
  moduleKey: ModuleKey,
  action: PermAction
): Promise<boolean> {
  const session = await auth();
  return checkPerm(session, moduleKey, action);
}
