import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  dispatchOrders,
  transferOrders,
  goodsIssues,
  warehouses,
  customers,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const whFrom = alias(warehouses, "wh_from");
const whTo = alias(warehouses, "wh_to");

const STATUS_LABEL: Record<string, string> = {
  CHO_DANG_KY: "Chờ đăng ký xe",
  CHO_VAO_KHO: "Chờ vào kho nhận hàng",
  CHO_LAY_GIAO_HANG: "Chờ lấy hàng giao khách",
  HOAN_THANH: "Hoàn thành",
};
const STATUS_COLOR: Record<string, string> = {
  CHO_DANG_KY: "text-amber-700 bg-amber-50",
  CHO_VAO_KHO: "text-blue-700 bg-blue-50",
  CHO_LAY_GIAO_HANG: "text-blue-700 bg-blue-50",
  HOAN_THANH: "text-emerald-700 bg-emerald-50",
};

export default async function TaiXeListPage() {
  const session = await auth();
  const carrierId = (session?.user as unknown as { carrierId?: number | null })?.carrierId;

  if (!carrierId) {
    return (
      <main className="px-4 py-8">
        <p className="text-sm text-amber-700 bg-amber-50 rounded-md px-4 py-3">
          Tài khoản này chưa được gán vào 1 đơn vị vận tải (carrier) cụ thể — liên hệ
          quản trị viên để được gán.
        </p>
      </main>
    );
  }

  const rows = await db
    .select({
      id: dispatchOrders.id,
      vtNumber: dispatchOrders.vtNumber,
      loaiDon: dispatchOrders.loaiDon,
      status: dispatchOrders.status,
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
    .where(eq(dispatchOrders.carrierId, carrierId))
    .orderBy(desc(dispatchOrders.id));

  return (
    <main className="px-4 py-6 flex flex-col gap-3">
      <h1 className="text-lg font-bold text-slate-900">Đơn vận tải của tôi</h1>
      {rows.length === 0 && (
        <p className="text-sm text-slate-400 py-8 text-center">
          Chưa có đơn vận tải nào được giao cho đơn vị của bạn.
        </p>
      )}
      {rows.map((r) => (
        <Link
          key={r.id}
          href={`/tai-xe/${r.id}`}
          className="rounded-lg border border-slate-200 bg-white p-4 flex flex-col gap-1 hover:border-orange-300"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono font-semibold">{r.vtNumber}</span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status]}`}
            >
              {STATUS_LABEL[r.status]}
            </span>
          </div>
          <div className="text-sm text-slate-500">
            {r.loaiDon === "NHAP_HANG" && r.transferFromName && (
              <>Nhận hàng từ {r.transferFromName} → {r.transferToName}</>
            )}
            {r.loaiDon === "LAY_HANG" && r.customerName && (
              <>Lấy hàng giao khách: {r.customerName}</>
            )}
            {r.loaiDon === "KHAC" && "Đơn vận tải khác"}
          </div>
        </Link>
      ))}
    </main>
  );
}
