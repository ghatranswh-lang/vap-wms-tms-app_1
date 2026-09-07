import { db } from "@/db";
import { warehouses, zones, locations, items } from "@/db/schema";
import { eq } from "drizzle-orm";
import ChuyenKhoForm from "./ChuyenKhoForm";

export default async function TaoChuyenKhoPage() {
  const [warehouseRows, zoneRows, locationRows, itemRows] = await Promise.all([
    db.select().from(warehouses).where(eq(warehouses.active, true)),
    db.select().from(zones).where(eq(zones.active, true)),
    db.select().from(locations).where(eq(locations.active, true)),
    db.select().from(items).where(eq(items.active, true)),
  ]);

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-slate-900 mb-4">Chuyển kho</h1>
      <ChuyenKhoForm
        warehouses={warehouseRows.map((w) => ({
          id: w.id,
          code: w.code,
          name: w.name,
          wms: w.wms,
        }))}
        zones={zoneRows.map((z) => ({ id: z.id, warehouseId: z.warehouseId, name: z.name }))}
        locations={locationRows.map((l) => ({
          id: l.id,
          zoneId: l.zoneId,
          name: l.name,
          maxPallets: l.maxPallets,
          currentPallets: l.currentPallets,
        }))}
        items={itemRows.map((it) => ({ id: it.id, maHang: it.maHang, tenHang: it.tenHang }))}
      />
    </main>
  );
}
