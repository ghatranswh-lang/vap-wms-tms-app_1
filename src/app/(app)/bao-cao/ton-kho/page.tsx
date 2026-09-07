import { db } from "@/db";
import { stockLedger, companies, warehouses, zones, locations, items } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";

export default async function TonKhoReportPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string; warehouseId?: string }>;
}) {
  const { companyId, warehouseId } = await searchParams;

  const [companyRows, warehouseRows] = await Promise.all([
    db.select().from(companies).where(eq(companies.isInternal, true)),
    db.select().from(warehouses).where(eq(warehouses.active, true)),
  ]);

  const conditions = [];
  if (companyId) conditions.push(eq(stockLedger.companyId, Number(companyId)));
  if (warehouseId) conditions.push(eq(stockLedger.warehouseId, Number(warehouseId)));

  const rows = await db
    .select({
      companyCode: companies.code,
      warehouseCode: warehouses.code,
      warehouseName: warehouses.name,
      zoneName: zones.name,
      locationName: locations.name,
      maHang: items.maHang,
      tenHang: items.tenHang,
      tthh: stockLedger.tthh,
      balance: sql<string>`sum(${stockLedger.deltaQty})`,
    })
    .from(stockLedger)
    .innerJoin(companies, eq(companies.id, stockLedger.companyId))
    .innerJoin(warehouses, eq(warehouses.id, stockLedger.warehouseId))
    .leftJoin(zones, eq(zones.id, stockLedger.zoneId))
    .leftJoin(locations, eq(locations.id, stockLedger.locationId))
    .innerJoin(items, eq(items.id, stockLedger.itemId))
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(
      companies.code,
      warehouses.code,
      warehouses.name,
      zones.name,
      locations.name,
      items.maHang,
      items.tenHang,
      stockLedger.tthh
    )
    .having(sql`sum(${stockLedger.deltaQty}) != 0`)
    .orderBy(companies.code, warehouses.code, items.maHang);

  const totalByTthh = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.tthh] = (acc[r.tthh] ?? 0) + Number(r.balance);
    return acc;
  }, {});

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Báo cáo tồn kho</h1>
      <p className="text-sm text-slate-500 mb-6">
        Tồn kho hiện tại — tính trực tiếp từ sổ cái tồn kho (tổng tất cả bút toán nhập/xuất/chuyển/giải chấp), theo thời gian thực.
      </p>

      <form className="flex gap-3 mb-4" method="get">
        <select
          name="companyId"
          defaultValue={companyId ?? ""}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">— Tất cả công ty —</option>
          {companyRows.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>
        <select
          name="warehouseId"
          defaultValue={warehouseId ?? ""}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">— Tất cả kho —</option>
          {warehouseRows.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-orange-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-orange-700"
        >
          Lọc
        </button>
      </form>

      <div className="flex gap-4 mb-4 text-sm">
        {(["HTC", "KTC", "DGC"] as const).map((t) => (
          <div key={t} className="rounded-lg border border-slate-200 bg-white px-4 py-2">
            <div className="text-xs text-slate-400 uppercase">{t}</div>
            <div className="font-bold text-slate-900">
              {(totalByTthh[t] ?? 0).toLocaleString("vi-VN")} KG
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">Công ty</th>
              <th className="text-left px-3 py-2">Kho</th>
              <th className="text-left px-3 py-2">Khu vực / Vị trí</th>
              <th className="text-left px-3 py-2">Mã hàng</th>
              <th className="text-left px-3 py-2">TTHH</th>
              <th className="text-right px-3 py-2">Tồn (KG)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-3 py-2">{r.companyCode}</td>
                <td className="px-3 py-2">{r.warehouseName}</td>
                <td className="px-3 py-2 text-xs">
                  {r.zoneName ? `${r.zoneName} · ${r.locationName}` : "—"}
                </td>
                <td className="px-3 py-2 font-mono">
                  {r.maHang}
                  <span className="text-slate-400 font-sans"> — {r.tenHang}</span>
                </td>
                <td className="px-3 py-2">{r.tthh}</td>
                <td className="px-3 py-2 text-right font-medium">
                  {Number(r.balance).toLocaleString("vi-VN")}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Không có tồn kho nào khớp bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
