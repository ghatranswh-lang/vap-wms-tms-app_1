"use server";

import { db } from "@/db";
import { users, type UserPermissions } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { MODULES } from "@/lib/perm";

const ROLES = [
  "ADMIN",
  "QUAN_LY_KHO",
  "NHAN_VIEN_KHO",
  "DOI_TAC_3PL",
  "KE_TOAN",
  "SALE",
  "TAI_XE",
] as const;

const schema = z.object({
  username: z
    .string()
    .min(3, "Tên đăng nhập cần ít nhất 3 ký tự.")
    .regex(/^[a-zA-Z0-9._-]+$/, "Tên đăng nhập chỉ gồm chữ, số, dấu . _ -"),
  password: z.string().min(6, "Mật khẩu cần ít nhất 6 ký tự."),
  fullName: z.string().min(1, "Cần nhập họ tên."),
  role: z.enum(ROLES),
  xemGiaNhap: z.boolean(),
  xemCuoc: z.boolean(),
});

export type UserFormState = { error?: string };

// Chỉ Admin được vào các action ở đây — chặn cả trường hợp gọi thẳng action
// (không qua UI) từ 1 tài khoản không phải Admin.
async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as unknown as { role?: string })?.role;
  if (role !== "ADMIN") {
    throw new Error("Chỉ Admin mới có quyền quản lý người dùng.");
  }
}

export async function createUser(
  _prevState: UserFormState | undefined,
  formData: FormData
): Promise<UserFormState> {
  await requireAdmin();

  const parsed = schema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    role: formData.get("role"),
    xemGiaNhap: formData.get("xemGiaNhap") === "on",
    xemCuoc: formData.get("xemCuoc") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." };
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, parsed.data.username))
    .limit(1);
  if (existing.length > 0) {
    return { error: "Tên đăng nhập đã tồn tại." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await db.insert(users).values({
    username: parsed.data.username,
    passwordHash,
    fullName: parsed.data.fullName,
    role: parsed.data.role,
    xemGiaNhap: parsed.data.xemGiaNhap,
    xemCuoc: parsed.data.xemCuoc,
  });

  revalidatePath("/danh-muc/nguoi-dung");
  return {};
}

export async function toggleXemGiaNhap(id: number, value: boolean) {
  await requireAdmin();
  await db.update(users).set({ xemGiaNhap: value }).where(eq(users.id, id));
  revalidatePath("/danh-muc/nguoi-dung");
}

export async function toggleXemCuoc(id: number, value: boolean) {
  await requireAdmin();
  await db.update(users).set({ xemCuoc: value }).where(eq(users.id, id));
  revalidatePath("/danh-muc/nguoi-dung");
}

export async function toggleUserActive(id: number, value: boolean) {
  await requireAdmin();
  await db.update(users).set({ active: value }).where(eq(users.id, id));
  revalidatePath("/danh-muc/nguoi-dung");
}

// Lưu toàn bộ ma trận quyền Sửa/Xoá cho 1 user từ form ở trang chi tiết phân
// quyền (checkbox tên "edit_<module>" / "delete_<module>" cho mỗi module).
export async function updateUserPermissions(id: number, formData: FormData) {
  await requireAdmin();

  const permissions: UserPermissions = {};
  for (const m of MODULES) {
    const edit = formData.get(`edit_${m.key}`) === "on";
    const del = formData.get(`delete_${m.key}`) === "on";
    if (edit || del) {
      permissions[m.key] = { edit, delete: del };
    }
  }

  await db.update(users).set({ permissions }).where(eq(users.id, id));
  revalidatePath("/danh-muc/nguoi-dung");
  revalidatePath(`/danh-muc/nguoi-dung/${id}`);
  redirect("/danh-muc/nguoi-dung");
}
