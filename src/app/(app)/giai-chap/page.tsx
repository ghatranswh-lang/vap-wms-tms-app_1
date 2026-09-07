import Link from "next/link";
import { db } from "@/db";
import { collateralReleases, companies, warehouses, items } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export default async function GiaiChapPage() {
  const rows = await db
    .select({
      id: collateralReleases.id,
      hsgc: collateralReleases.hsgc,
      ngay: collateralReleases.ngay,
      companyCode: companies.code,
      warehouseName: warehouses.name,
      maHang: items.maHang,
      soLuongTan: collateralReleases.soLuongTan,
      trangThai: collateralReleases.trangThai,
    })
    .from(collateralReleases)
    .innerJoin(companies, eq(companies.id, collateralReleases.companyId))
    .innerJoin(warehouses, eq(warehouses.id, collateralReleases.warehouseId))
    .innerJoin(items, eq(items.id, collateralReleases.itemId))
    .orderBy(desc(collateralReleases.id));

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-900">Giải chấp (HSGC)</h1>
        <Link
          href="/giai-chap/moi"
          className="rounded-md bg-orange-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-orange-700"
        >
          + Tạo hồ sơ giải chấp
        </Link>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Số HSGC</th>
              <th className="text-left px-4 py-2">Ngày</th>
              <th className="text-left px-4 py-2">Công ty</th>
              <th className="text-left px-4 py-2">Kho</th>
              <th className="text-left px-4 py-2">Mã hàng</th>
              <th className="text-right px-4 py-2">SL (Tấn)</th>
              <th className="text-left px-4 py-2">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono">
                  <Link href={`/giai-chap/${r.id}`} className="text-orange-600 hover:underline">
                    {r.hsgc}
                  </Link>
                </td>
                <td className="px-4 py-2">{r.ngay}</td>
                <td className="px-4 py-2">{r.companyCode}</td>
                <td className="px-4 py-2">{r.warehouseName}</td>
                <td className="px-4 py-2 font-mono">{r.maHang}</td>
                <td className="px-4 py-2 text-right">
                  {Number(r.soLuongTan).toLocaleString("vi-VN")}
                </td>
                <td className="px-4 py-2">
                  {r.trangThai === "HOAN_TAT" ? (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-semibold">
                      Hoàn tất
                    </span>
                  ) : (
                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-xs font-semibold">
                      Nháp
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Chưa có hồ sơ giải chấp nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
