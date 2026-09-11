import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { desc } from "drizzle-orm";
import UserForm from "./UserForm";
import { toggleXemGiaNhap, toggleXemCuoc, toggleUserActive } from "./actions";
import { ROLE_LABELS } from "@/lib/roleLabels";

function ToggleBadge({
  on,
  action,
}: {
  on: boolean;
  action: () => Promise<void>;
}) {
  return (
    <form action={action}>
      <button
        type="submit"
        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
          on
            ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
            : "text-slate-500 bg-slate-100 hover:bg-slate-200"
        }`}
        title="Bấm để đổi"
      >
        {on ? "Có" : "Không"}
      </button>
    </form>
  );
}

export default async function NguoiDungPage() {
  const session = await auth();
  const role = (session?.user as unknown as { role?: string })?.role;

  if (role !== "ADMIN") {
    return (
      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          Quản lý người dùng
        </h1>
        <p className="text-sm text-slate-500">
          Chỉ tài khoản Admin mới có quyền xem trang này.
        </p>
      </main>
    );
  }

  const rows = await db.select().from(users).orderBy(desc(users.id));

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-slate-900 mb-1">
        Quản lý người dùng
      </h1>
      <p className="text-sm text-slate-500 mb-4">
        Cấp quyền xem giá nhập (đơn giá mua hàng trên PO) và xem cước vận
        chuyển theo từng tài khoản. Người dùng cần đăng xuất rồi đăng nhập
        lại để quyền mới có hiệu lực.
      </p>
      <UserForm />

      <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Tên đăng nhập</th>
              <th className="text-left px-4 py-2">Họ tên</th>
              <th className="text-left px-4 py-2">Vai trò</th>
              <th className="text-left px-4 py-2">Xem giá nhập</th>
              <th className="text-left px-4 py-2">Xem cước</th>
              <th className="text-left px-4 py-2">Hoạt động</th>
              <th className="text-left px-4 py-2">Quyền Sửa/Xoá</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono">{u.username}</td>
                <td className="px-4 py-2">{u.fullName}</td>
                <td className="px-4 py-2">{ROLE_LABELS[u.role] ?? u.role}</td>
                <td className="px-4 py-2">
                  <ToggleBadge
                    on={u.xemGiaNhap}
                    action={toggleXemGiaNhap.bind(null, u.id, !u.xemGiaNhap)}
                  />
                </td>
                <td className="px-4 py-2">
                  <ToggleBadge
                    on={u.xemCuoc}
                    action={toggleXemCuoc.bind(null, u.id, !u.xemCuoc)}
                  />
                </td>
                <td className="px-4 py-2">
                  <ToggleBadge
                    on={u.active}
                    action={toggleUserActive.bind(null, u.id, !u.active)}
                  />
                </td>
                <td className="px-4 py-2">
                  {u.role === "ADMIN" ? (
                    <span className="text-xs text-slate-400">Toàn quyền</span>
                  ) : (
                    <Link
                      href={`/danh-muc/nguoi-dung/${u.id}`}
                      className="text-orange-600 hover:underline text-sm"
                    >
                      Phân quyền
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Chưa có người dùng nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
