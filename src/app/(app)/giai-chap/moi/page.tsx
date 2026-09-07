import { db } from "@/db";
import { companies, warehouses, zones, locations, items } from "@/db/schema";
import { eq } from "drizzle-orm";
import GiaiChapForm from "./GiaiChapForm";

export default async function TaoGiaiChapPage() {
  const [companyRows, warehouseRows, zoneRows, locationRows, itemRows] = await Promise.all([
    db.select().from(companies).where(eq(companies.isInternal, true)),
    db.select().from(warehouses).where(eq(warehouses.active, true)),
    db.select().from(zones).where(eq(zones.active, true)),
    db.select().from(locations).where(eq(locations.active, true)),
    db.select().from(items).where(eq(items.active, true)),
  ]);

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Tạo hồ sơ giải chấp (HSGC)</h1>
      <p className="text-sm text-slate-500 mb-6">
        Khi hoàn tất, hệ thống sẽ tự động chuyển tình trạng hàng hoá (TTHH) của số
        lượng này từ HTC (Hàng thế chấp) sang DGC (Đã giải chấp).
      </p>
      <GiaiChapForm
        companies={companyRows.map((c) => ({ id: c.id, label: `${c.code} — ${c.name}` }))}
        warehouses={warehouseRows.map((w) => ({ id: w.id, code: w.code, name: w.name, wms: w.wms }))}
        zones={zoneRows.map((z) => ({ id: z.id, warehouseId: z.warehouseId, companyId: z.companyId, name: z.name }))}
        locations={locationRows.map((l) => ({ id: l.id, zoneId: l.zoneId, name: l.name }))}
        items={itemRows.map((it) => ({ id: it.id, maHang: it.maHang, tenHang: it.tenHang }))}
      />
    </main>
  );
}
