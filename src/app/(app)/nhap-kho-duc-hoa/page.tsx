import Link from "next/link";
import { db } from "@/db";
import { transferOrders, warehouses } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const whFrom = alias(warehouses, "wh_from");
const whTo = alias(warehouses, "wh_to");

export default async function NhapKhoDucHoaPage() {
  const rows = await db
    .select({
      id: transferOrders.id,
      ckNumber: transferOrders.ckNumber,
      createdAt: transferOrders.createdAt,
      status: transferOrders.status,
      soXe: transferOrders.soXe,
      tenTaiXe: transferOrders.tenTaiXe,
      fromName: whFrom.name,
    })
    .from(transferOrders)
    .innerJoin(whFrom, eq(whFrom.id, transferOrders.warehouseFromId))
    .innerJoin(whTo, eq(whTo.id, transferOrders.warehouseToId))
    .where(and(eq(whTo.code, "KHO-DUCHOA"), eq(transferOrders.status, "DANG_CHUYEN")))
    .orderBy(desc(transferOrders.id));

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Nhập kho Đức Hòa</h1>
      <p className="text-sm text-slate-500 mb-6">
        Các phiếu chuyển kho đang trên đường về Kho Đức Hòa, chờ xác nhận nhận hàng.
      </p>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Số phiếu CK</th>
              <th className="text-left px-4 py-2">Từ kho</th>
              <th className="text-left px-4 py-2">Số xe</th>
              <th className="text-left px-4 py-2">Tài xế</th>
              <th className="text-right px-4 py-2">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono">{r.ckNumber}</td>
                <td className="px-4 py-2">{r.fromName}</td>
                <td className="px-4 py-2 font-mono">{r.soXe}</td>
                <td className="px-4 py-2">{r.tenTaiXe}</td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/nhap-kho-duc-hoa/${r.id}`}
                    className="text-orange-600 hover:underline font-medium"
                  >
                    Xác nhận nhận hàng →
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Không có phiếu chuyển kho nào đang chờ nhận tại Đức Hòa.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
