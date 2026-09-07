import { db } from "@/db";
import { carriers } from "@/db/schema";
import { desc } from "drizzle-orm";
import CarrierForm from "./CarrierForm";

export default async function DonViVanTaiPage() {
  const rows = await db.select().from(carriers).orderBy(desc(carriers.id));

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-slate-900 mb-1">
        Danh mục Đơn vị vận tải
      </h1>
      <p className="text-sm text-slate-500 mb-4">
        Thiết lập đơn vị vận tải (nhà xe/carrier) tại đây trước khi gán cho đơn
        vận tải. Biển số xe, tên tài xế, CCCD được nhập tay ở bước đăng ký xe
        (Cổng tài xế), không phải danh mục cố định.
      </p>
      <CarrierForm />

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Tên đơn vị</th>
              <th className="text-left px-4 py-2">Loại</th>
              <th className="text-left px-4 py-2">KH tự lấy</th>
              <th className="text-left px-4 py-2">Xem cước</th>
              <th className="text-left px-4 py-2">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium">{c.name}</td>
                <td className="px-4 py-2">
                  {c.xeNoiBo ? (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-semibold">
                      Xe nội bộ
                    </span>
                  ) : (
                    <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-xs font-semibold">
                      Thuê ngoài (3PL)
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">{c.khTuLay ? "Có" : "Không"}</td>
                <td className="px-4 py-2">{c.xemCuoc ? "Có" : "Không"}</td>
                <td className="px-4 py-2">
                  {c.active ? "Hoạt động" : "Ngừng hoạt động"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Chưa có đơn vị vận tải nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
