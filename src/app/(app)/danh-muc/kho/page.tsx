import { db } from "@/db";
import { warehouses, zones, locations } from "@/db/schema";
import { eq, count } from "drizzle-orm";

export default async function KhoPage() {
  const rows = await db
    .select({
      id: warehouses.id,
      code: warehouses.code,
      name: warehouses.name,
      wms: warehouses.wms,
      baoVe: warehouses.baoVe,
      active: warehouses.active,
      zoneCount: count(zones.id),
    })
    .from(warehouses)
    .leftJoin(zones, eq(zones.warehouseId, warehouses.id))
    .groupBy(warehouses.id)
    .orderBy(warehouses.id);

  const locationTotal = await db.$count(locations);

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Danh mục Kho</h1>
      <p className="text-sm text-slate-500 mb-4">
        Tổng {locationTotal} vị trí đã tạo trên toàn hệ thống.
      </p>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Mã kho</th>
              <th className="text-left px-4 py-2">Tên kho</th>
              <th className="text-left px-4 py-2">Quản lý Khu vực/Vị trí</th>
              <th className="text-left px-4 py-2">Bảo vệ/Cổng gác</th>
              <th className="text-left px-4 py-2">Số khu vực</th>
              <th className="text-left px-4 py-2">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono">{w.code}</td>
                <td className="px-4 py-2">{w.name}</td>
                <td className="px-4 py-2">
                  {w.wms ? (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-semibold">
                      Có (WMS)
                    </span>
                  ) : (
                    <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full text-xs font-semibold">
                      Không
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">{w.baoVe ? "Có" : "Không"}</td>
                <td className="px-4 py-2">{w.zoneCount}</td>
                <td className="px-4 py-2">
                  {w.active ? "Hoạt động" : "Ngừng hoạt động"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
