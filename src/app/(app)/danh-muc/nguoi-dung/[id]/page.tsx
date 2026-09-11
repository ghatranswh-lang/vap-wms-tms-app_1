import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { MODULES } from "@/lib/perm";
import { ROLE_LABELS } from "@/lib/roleLabels";
import { updateUserPermissions } from "../actions";

export default async function UserPermissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const role = (session?.user as unknown as { role?: string })?.role;

  if (role !== "ADMIN") {
    return (
      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-slate-900 mb-2">Phân quyền</h1>
        <p className="text-sm text-slate-500">
          Chỉ tài khoản Admin mới có quyền xem trang này.
        </p>
      </main>
    );
  }

  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.id, Number(id)))
    .limit(1);
  if (!u) notFound();

  if (u.role === "ADMIN") {
    return (
      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          Phân quyền: {u.fullName}
        </h1>
        <p className="text-sm text-slate-500">
          Tài khoản Admin luôn có toàn quyền Sửa/Xoá ở mọi chức năng — không
          cần thiết lập riêng.
        </p>
        <Link
          href="/danh-muc/nguoi-dung"
          className="text-sm text-orange-600 hover:underline mt-4 inline-block"
        >
          ← Quay lại danh sách
        </Link>
      </main>
    );
  }

  const perms = u.permissions ?? {};

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-slate-900 mb-1">
        Phân quyền: {u.fullName}
      </h1>
      <p className="text-sm text-slate-500 mb-4">
        Tài khoản <span className="font-mono">{u.username}</span> — vai trò{" "}
        {ROLE_LABELS[u.role] ?? u.role}. Tick &quot;Sửa&quot;/&quot;Xoá&quot;
        cho từng chức năng mà tài khoản này được phép thao tác. Mặc định
        không tick gì nghĩa là chỉ được xem, không được sửa/xoá. Cần đăng
        xuất rồi đăng nhập lại thì quyền mới có hiệu lực.
      </p>

      <form action={updateUserPermissions.bind(null, u.id)}>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2">Chức năng</th>
                <th className="text-center px-4 py-2 w-24">Sửa</th>
                <th className="text-center px-4 py-2 w-24">Xoá</th>
              </tr>
            </thead>
            <tbody>
              {MODULES.map((m) => (
                <tr key={m.key} className="border-t border-slate-100">
                  <td className="px-4 py-2">{m.label}</td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      name={`edit_${m.key}`}
                      defaultChecked={!!perms[m.key]?.edit}
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      name={`delete_${m.key}`}
                      defaultChecked={!!perms[m.key]?.delete}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-orange-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-orange-700"
          >
            Lưu phân quyền
          </button>
          <Link
            href="/danh-muc/nguoi-dung"
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Huỷ
          </Link>
        </div>
      </form>
    </main>
  );
}
