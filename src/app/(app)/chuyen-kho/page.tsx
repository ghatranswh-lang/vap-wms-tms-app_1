import Link from "next/link";
import { db } from "@/db";
import { transferOrders, warehouses } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const whFrom = alias(warehouses, "wh_from");
const whTo = alias(warehouses, "wh_to");

export default async function ChuyenKhoPage() {
  const rows = await db
    .select({
      id: transferOrders.id,
      ckNumber: transferOrders.ckNumber,
      createdAt: transferOrders.createdAt,
      status: transferOrders.status,
      soXe: transferOrders.soXe,
      fromName: whFrom.name,
      toName: whTo.name,
    })
    .from(transferOrders)
    .innerJoin(whFrom, eq(whFrom.id, transferOrders.warehouseFromId))
    .innerJoin(whTo, eq(whTo.id, transferOrders.warehouseToId))
    .orderBy(desc(transferOrders.id));

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-900">Chuyển kho</h1>
        <Link
          href="/chuyen-kho/moi"
          className="rounded-md bg-orange-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-orange-700"
        >
          + Tạo phiếu chuyển kho
        </Link>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Số phiếu</th>
              <th className="text-left px-4 py-2">Kho đi → Kho đến</th>
              <th className="text-left px-4 py-2">Số xe</th>
              <th className="text-left px-4 py-2">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono">
                  <Link href={`/chuyen-kho/${r.id}`} className="text-orange-600 hover:underline">
                    {r.ckNumber}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  {r.fromName} → {r.toName}
                </td>
                <td className="px-4 py-2 font-mono">{r.soXe}</td>
                <td className="px-4 py-2">
                  {r.status === "HOAN_TAT" ? (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-semibold">
                      Hoàn tất
                    </span>
                  ) : (
                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-xs font-semibold">
                      Đang chuyển
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Chưa có phiếu chuyển kho nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
