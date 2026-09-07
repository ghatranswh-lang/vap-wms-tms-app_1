import { auth } from "@/auth";
import { db } from "@/db";
import { companies, warehouses, items, users } from "@/db/schema";
import Link from "next/link";

export default async function Home() {
  const session = await auth();
  const [companyCount, warehouseCount, itemCount, userCount] =
    await Promise.all([
      db.$count(companies),
      db.$count(warehouses),
      db.$count(items),
      db.$count(users),
    ]);

  const cards = [
    { label: "Công ty", value: companyCount, href: "/danh-muc/cong-ty" },
    { label: "Kho", value: warehouseCount, href: "/danh-muc/kho" },
    { label: "Mặt hàng", value: itemCount, href: "/danh-muc/mat-hang" },
    { label: "Người dùng", value: userCount, href: "/danh-muc" },
  ];

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="text-xl font-bold text-slate-900">
          Xin chào, {session?.user?.name}
        </div>
        <div className="text-sm text-slate-500 mt-1">
          Vai trò: {(session?.user as unknown as { role?: string })?.role}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-lg border border-slate-200 bg-white p-4 hover:border-orange-400 hover:shadow-sm transition"
          >
            <div className="text-2xl font-bold text-slate-900">{c.value}</div>
            <div className="text-sm text-slate-500 mt-1">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-10 rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
        Đây là bản khởi tạo hệ thống thật (có database) — dữ liệu trên các thẻ
        phía trên được đọc trực tiếp từ database, không phải dữ liệu mẫu.
        Module Danh mục đã hoạt động thật; các module nghiệp vụ (PO, Nhập/Chuyển/
        Xuất kho, SO, Giải chấp, Vận tải) đang được xây tiếp theo.
      </div>
    </main>
  );
}
