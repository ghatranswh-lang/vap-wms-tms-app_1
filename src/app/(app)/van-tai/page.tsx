import Link from "next/link";
import { db } from "@/db";
import {
  dispatchOrders,
  transferOrders,
  goodsIssues,
  warehouses,
  customers,
  carriers,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const whFrom = alias(warehouses, "wh_from");
const whTo = alias(warehouses, "wh_to");

const LOAI_LABEL: Record<string, string> = {
  NHAP_HANG: "Nhận hàng",
  LAY_HANG: "Lấy hàng",
  KHAC: "Khác",
};
const STATUS_LABEL: Record<string, string> = {
  CHO_DANG_KY: "Chờ đăng ký xe",
  CHO_VAO_KHO: "Chờ vào kho",
  CHO_LAY_GIAO_HANG: "Chờ lấy hàng",
  HOAN_THANH: "Hoàn thành",
};
const STATUS_COLOR: Record<string, string> = {
  CHO_DANG_KY: "text-amber-700 bg-amber-50",
  CHO_VAO_KHO: "text-blue-700 bg-blue-50",
  CHO_LAY_GIAO_HANG: "text-blue-700 bg-blue-50",
  HOAN_THANH: "text-emerald-700 bg-emerald-50",
};

export default async function VanTaiPage() {
  const rows = await db
    .select({
      id: dispatchOrders.id,
      vtNumber: dispatchOrders.vtNumber,
      loaiDon: dispatchOrders.loaiDon,
      status: dispatchOrders.status,
      carrierName: carriers.name,
      transferFromName: whFrom.name,
      transferToName: whTo.name,
      customerName: customers.name,
    })
    .from(dispatchOrders)
    .leftJoin(transferOrders, eq(transferOrders.id, dispatchOrders.sourceTransferOrderId))
    .leftJoin(whFrom, eq(whFrom.id, transferOrders.warehouseFromId))
    .leftJoin(whTo, eq(whTo.id, transferOrders.warehouseToId))
    .leftJoin(goodsIssues, eq(goodsIssues.id, dispatchOrders.sourceGoodsIssueId))
    .leftJoin(customers, eq(customers.id, goodsIssues.customerId))
    .leftJoin(carriers, eq(carriers.id, dispatchOrders.carrierId))
    .orderBy(desc(dispatchOrders.id));

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Vận tải</h1>
      <p className="text-sm text-slate-500 mb-6">
        Các đơn vận tải được tự động tạo từ Chuyển kho (nhận hàng) và Xuất kho (lấy hàng).
        Gán đơn vị vận tải để tài xế thấy đơn trên Cổng tài xế.
      </p>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Số VT</th>
              <th className="text-left px-4 py-2">Loại</th>
              <th className="text-left px-4 py-2">Nội dung</th>
              <th className="text-left px-4 py-2">Đơn vị vận tải</th>
              <th className="text-left px-4 py-2">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono">
                  <Link href={`/van-tai/${r.id}`} className="text-orange-600 hover:underline">
                    {r.vtNumber}
                  </Link>
                </td>
                <td className="px-4 py-2">{LOAI_LABEL[r.loaiDon]}</td>
                <td className="px-4 py-2 text-xs">
                  {r.loaiDon === "NHAP_HANG" && r.transferFromName && (
                    <>{r.transferFromName} → {r.transferToName}</>
                  )}
                  {r.loaiDon === "LAY_HANG" && r.customerName && <>Khách: {r.customerName}</>}
                </td>
                <td className="px-4 py-2">
                  {r.carrierName || (
                    <span className="text-amber-600">Chưa gán</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status]}`}
                  >
                    {STATUS_LABEL[r.status]}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Chưa có đơn vận tải nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
