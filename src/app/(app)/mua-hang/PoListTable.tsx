"use client";

import Link from "next/link";
import ColumnPicker, { useVisibleColumns, type ColumnDef } from "@/components/ColumnPicker";
import { exportRowsToExcel } from "@/lib/excel";

export type PoRow = {
  id: number;
  poNumber: string;
  createdDate: string;
  companyCode: string;
  supplierName: string;
  warehouseName: string | null;
  currency: string;
  totalQty: string;
  totalRemain: string;
  totalTien: string;
};

const COLUMNS: ColumnDef[] = [
  { key: "poNumber", label: "Số PO" },
  { key: "createdDate", label: "Ngày tạo" },
  { key: "companyCode", label: "Công ty" },
  { key: "supplierName", label: "Nhà cung cấp" },
  { key: "warehouseName", label: "Kho nhập" },
  { key: "totalQty", label: "Tổng SL" },
  { key: "totalRemain", label: "Chưa nhập" },
  { key: "totalTien", label: "Tổng tiền hàng" },
  { key: "status", label: "Trạng thái" },
];

export default function PoListTable({
  rows,
  canSeeGia,
}: {
  rows: PoRow[];
  canSeeGia: boolean;
}) {
  const columns = canSeeGia
    ? COLUMNS
    : COLUMNS.filter((c) => c.key !== "totalTien");
  const { visible, toggle, loaded } = useVisibleColumns("cols:po-list", columns);

  function isOn(key: string) {
    return !loaded || visible.has(key);
  }

  function handleExport() {
    exportRowsToExcel(
      rows.map((r) => {
        const remain = Number(r.totalRemain);
        const out: Record<string, string | number> = {};
        if (isOn("poNumber")) out["Số PO"] = r.poNumber;
        if (isOn("createdDate")) out["Ngày tạo"] = r.createdDate;
        if (isOn("companyCode")) out["Công ty"] = r.companyCode;
        if (isOn("supplierName")) out["Nhà cung cấp"] = r.supplierName;
        if (isOn("warehouseName")) out["Kho nhập"] = r.warehouseName ?? "";
        if (isOn("totalQty")) out["Tổng SL"] = Number(r.totalQty);
        if (isOn("totalRemain")) out["Chưa nhập"] = Number(r.totalRemain);
        if (canSeeGia && isOn("totalTien"))
          out["Tổng tiền hàng"] = `${Number(r.totalTien).toLocaleString("vi-VN")} ${r.currency}`;
        if (isOn("status")) out["Trạng thái"] = remain === 0 ? "Đã nhập đủ" : "Chưa nhập đủ";
        return out;
      }),
      "danh-sach-po"
    );
  }

  return (
    <>
      <div className="flex justify-end gap-2 mb-2">
        <button
          type="button"
          onClick={handleExport}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          ⭱ Xuất Excel
        </button>
        <ColumnPicker columns={columns} visible={visible} onToggle={toggle} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              {isOn("poNumber") && <th className="text-left px-4 py-2">Số PO</th>}
              {isOn("createdDate") && <th className="text-left px-4 py-2">Ngày tạo</th>}
              {isOn("companyCode") && <th className="text-left px-4 py-2">Công ty</th>}
              {isOn("supplierName") && (
                <th className="text-left px-4 py-2">Nhà cung cấp</th>
              )}
              {isOn("warehouseName") && <th className="text-left px-4 py-2">Kho nhập</th>}
              {isOn("totalQty") && <th className="text-right px-4 py-2">Tổng SL</th>}
              {isOn("totalRemain") && <th className="text-right px-4 py-2">Chưa nhập</th>}
              {canSeeGia && isOn("totalTien") && (
                <th className="text-right px-4 py-2">Tổng tiền hàng</th>
              )}
              {isOn("status") && <th className="text-left px-4 py-2">Trạng thái</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const remain = Number(r.totalRemain);
              return (
                <tr key={r.id} className="border-t border-slate-100">
                  {isOn("poNumber") && (
                    <td className="px-4 py-2 font-mono">
                      <Link
                        href={`/mua-hang/${r.id}`}
                        className="text-orange-600 hover:underline"
                      >
                        {r.poNumber}
                      </Link>
                    </td>
                  )}
                  {isOn("createdDate") && <td className="px-4 py-2">{r.createdDate}</td>}
                  {isOn("companyCode") && <td className="px-4 py-2">{r.companyCode}</td>}
                  {isOn("supplierName") && (
                    <td className="px-4 py-2">{r.supplierName}</td>
                  )}
                  {isOn("warehouseName") && (
                    <td className="px-4 py-2">{r.warehouseName ?? "—"}</td>
                  )}
                  {isOn("totalQty") && (
                    <td className="px-4 py-2 text-right">
                      {Number(r.totalQty).toLocaleString("vi-VN")}
                    </td>
                  )}
                  {isOn("totalRemain") && (
                    <td className="px-4 py-2 text-right">
                      {remain.toLocaleString("vi-VN")}
                    </td>
                  )}
                  {canSeeGia && isOn("totalTien") && (
                    <td className="px-4 py-2 text-right">
                      {Number(r.totalTien).toLocaleString("vi-VN")} {r.currency}
                    </td>
                  )}
                  {isOn("status") && (
                    <td className="px-4 py-2">
                      {remain === 0 ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-semibold">
                          Đã nhập đủ
                        </span>
                      ) : (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-xs font-semibold">
                          Chưa nhập đủ
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400">
                  Không có đơn mua hàng nào khớp điều kiện lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
