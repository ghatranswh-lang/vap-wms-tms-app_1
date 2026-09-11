import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  purchaseOrders,
  purchaseOrderLines,
  companies,
  suppliers,
  warehouses,
  items,
  zones,
  locations,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { canEdit, canDelete } from "@/lib/perm";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import { deletePurchaseOrder } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  noperm: "Bạn không có quyền xoá Mua hàng (PO).",
  received: "Đơn đã có nhập kho — không thể xoá để tránh sai lệch tồn kho.",
};

export default async function PoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ err?: string }>;
}) {
  const { id } = await params;
  const { err } = await searchParams;
  const poId = Number(id);

  const session = await auth();
  const canSeeGia = !!(
    session?.user as unknown as { xemGiaNhap?: boolean }
  )?.xemGiaNhap;
  const canEditPo = canEdit(session, "mua_hang");
  const canDeletePo = canDelete(session, "mua_hang");

  const [po] = await db
    .select({
      id: purchaseOrders.id,
      poNumber: purchaseOrders.poNumber,
      createdDate: purchaseOrders.createdDate,
      currency: purchaseOrders.currency,
      ghiChu: purchaseOrders.ghiChu,
      custom: purchaseOrders.custom,
      companyCode: companies.code,
      companyName: companies.name,
      supplierName: suppliers.name,
      warehouseName: warehouses.name,
    })
    .from(purchaseOrders)
    .innerJoin(companies, eq(companies.id, purchaseOrders.companyId))
    .innerJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
    .leftJoin(warehouses, eq(warehouses.id, purchaseOrders.warehouseId))
    .where(eq(purchaseOrders.id, poId))
    .limit(1);

  if (!po) notFound();

  const lines = await db
    .select({
      id: purchaseOrderLines.id,
      maHang: items.maHang,
      tenHang: items.tenHang,
      donGia: purchaseOrderLines.donGia,
      qty: purchaseOrderLines.qty,
      vatRate: purchaseOrderLines.vatRate,
      tthh: purchaseOrderLines.tthh,
      slChuaNhap: purchaseOrderLines.slChuaNhap,
      custom: purchaseOrderLines.custom,
      zoneName: zones.name,
      locationName: locations.name,
    })
    .from(purchaseOrderLines)
    .innerJoin(items, eq(items.id, purchaseOrderLines.itemId))
    .leftJoin(zones, eq(zones.id, purchaseOrderLines.zoneId))
    .leftJoin(locations, eq(locations.id, purchaseOrderLines.locationId))
    .where(eq(purchaseOrderLines.poId, poId));

  const headerCustom = (po.custom ?? {}) as Record<string, string>;
  const headerCustomEntries = Object.entries(headerCustom).filter(
    ([k]) => k.trim() !== ""
  );

  const hasReceipt = lines.some(
    (l) => Number(l.slChuaNhap) < Number(l.qty) - 1e-6
  );

  const hasZoneCol = lines.some((l) => l.zoneName || l.locationName);
  const customKeys = Array.from(
    new Set(
      lines.flatMap((l) =>
        Object.keys((l.custom ?? {}) as Record<string, string>)
      )
    )
  ).filter((k) => k.trim() !== "");

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      {err && ERROR_MESSAGES[err] && (
        <p className="mb-3 rounded-md bg-red-50 text-red-700 text-sm px-3 py-2">
          {ERROR_MESSAGES[err]}
        </p>
      )}

      <div className="flex items-baseline justify-between mb-1">
        <h1 className="text-xl font-bold text-slate-900">{po.poNumber}</h1>
        <div className="flex items-center gap-3">
          {canEditPo && !hasReceipt && (
            <Link
              href={`/mua-hang/${poId}/sua`}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Sửa
            </Link>
          )}
          {canDeletePo && !hasReceipt && (
            <ConfirmDeleteButton
              action={deletePurchaseOrder.bind(null, poId)}
              confirmText={`Xoá đơn ${po.poNumber}? Không thể hoàn tác.`}
            />
          )}
          <span className="text-sm text-slate-500">{po.createdDate}</span>
        </div>
      </div>
      {(canEditPo || canDeletePo) && hasReceipt && (
        <p className="text-xs text-slate-400 mb-1">
          Đơn đã có nhập kho — không thể sửa/xoá.
        </p>
      )}
      <div className="text-sm text-slate-500 mb-2">
        {po.companyCode} — {po.companyName} · NCC: {po.supplierName}
        {po.warehouseName ? ` · Kho nhập: ${po.warehouseName}` : ""}
        {` · Tiền tệ: ${po.currency}`}
      </div>

      {headerCustomEntries.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {headerCustomEntries.map(([k, v]) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
            >
              <span className="font-semibold text-slate-500">{k}:</span> {v}
            </span>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">Mã hàng</th>
              <th className="text-left px-3 py-2">Tên hàng</th>
              {canSeeGia && (
                <th className="text-right px-3 py-2">Đơn giá</th>
              )}
              <th className="text-right px-3 py-2">SL</th>
              <th className="text-right px-3 py-2">VAT%</th>
              <th className="text-left px-3 py-2">TTHH</th>
              {hasZoneCol && (
                <>
                  <th className="text-left px-3 py-2">Khu vực dự kiến</th>
                  <th className="text-left px-3 py-2">Vị trí dự kiến</th>
                </>
              )}
              {customKeys.map((k) => (
                <th key={k} className="text-left px-3 py-2">
                  {k}
                </th>
              ))}
              <th className="text-right px-3 py-2">Chưa nhập</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const lineCustom = (l.custom ?? {}) as Record<string, string>;
              return (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-mono">{l.maHang}</td>
                  <td className="px-3 py-2">{l.tenHang}</td>
                  {canSeeGia && (
                    <td className="px-3 py-2 text-right">
                      {Number(l.donGia).toLocaleString("vi-VN")}
                    </td>
                  )}
                  <td className="px-3 py-2 text-right">
                    {Number(l.qty).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-2 text-right">{l.vatRate}%</td>
                  <td className="px-3 py-2">{l.tthh}</td>
                  {hasZoneCol && (
                    <>
                      <td className="px-3 py-2">{l.zoneName ?? "—"}</td>
                      <td className="px-3 py-2">{l.locationName ?? "—"}</td>
                    </>
                  )}
                  {customKeys.map((k) => (
                    <td key={k} className="px-3 py-2">
                      {lineCustom[k] ?? ""}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    {Number(l.slChuaNhap) > 0 ? (
                      <span className="text-amber-700 font-semibold">
                        {Number(l.slChuaNhap).toLocaleString("vi-VN")}
                      </span>
                    ) : (
                      <span className="text-emerald-700">0</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!canSeeGia && (
        <p className="mt-2 text-xs text-slate-400">
          Tài khoản của bạn không có quyền xem giá nhập.
        </p>
      )}
      {po.ghiChu && (
        <p className="mt-4 text-sm text-slate-500">Ghi chú: {po.ghiChu}</p>
      )}
    </main>
  );
}
