"use client";

import { useActionState, useMemo, useState } from "react";
import { createSalesOrder, type SoFormState } from "./actions";

type Option = { id: number; label: string };
type ItemOption = { id: number; maHang: string; tenHang: string };

type Line = {
  key: number;
  itemId: number | "";
  ngayGiaoDuKien: string;
  donGia: string;
  soLuongDat: string;
  khoXuatDuKienId: number | "";
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

let keySeq = 0;
function emptyLine(): Line {
  return {
    key: ++keySeq,
    itemId: "",
    ngayGiaoDuKien: todayStr(),
    donGia: "",
    soLuongDat: "",
    khoXuatDuKienId: "",
  };
}

export default function SoForm({
  companies,
  customers,
  items,
  warehouses,
}: {
  companies: Option[];
  customers: Option[];
  items: ItemOption[];
  warehouses: Option[];
}) {
  const [state, formAction, pending] = useActionState<SoFormState, FormData>(
    createSalesOrder,
    {}
  );

  const [companyId, setCompanyId] = useState<number | "">(companies[0]?.id ?? "");
  const [customerId, setCustomerId] = useState<number | "">(customers[0]?.id ?? "");
  const [ghiChu, setGhiChu] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  const totalTien = useMemo(
    () =>
      lines.reduce(
        (sum, l) => sum + (Number(l.soLuongDat) || 0) * (Number(l.donGia) || 0),
        0
      ),
    [lines]
  );

  function updateLine(key: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function payload() {
    return JSON.stringify({
      companyId,
      customerId,
      ghiChu,
      lines: lines
        .filter((l) => l.itemId !== "" && Number(l.soLuongDat) > 0)
        .map((l) => ({
          itemId: l.itemId,
          ngayGiaoDuKien: l.ngayGiaoDuKien,
          donGia: l.donGia,
          soLuongDat: l.soLuongDat,
          khoXuatDuKienId: l.khoXuatDuKienId || undefined,
        })),
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="payload" value={payload()} />

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Công ty</label>
          <select
            value={companyId}
            onChange={(e) => setCompanyId(Number(e.target.value))}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Khách hàng</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(Number(e.target.value))}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Ghi chú</label>
          <input
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">Mã hàng</th>
              <th className="text-left px-3 py-2 w-36">Ngày giao dự kiến</th>
              <th className="text-right px-3 py-2 w-32">Đơn giá</th>
              <th className="text-right px-3 py-2 w-28">SL đặt (KG)</th>
              <th className="text-left px-3 py-2 w-40">Kho xuất dự kiến</th>
              <th className="text-right px-3 py-2 w-36">Thành tiền</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const thanhTien = (Number(l.soLuongDat) || 0) * (Number(l.donGia) || 0);
              return (
                <tr key={l.key} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <select
                      value={l.itemId}
                      onChange={(e) =>
                        updateLine(l.key, { itemId: e.target.value ? Number(e.target.value) : "" })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    >
                      <option value="">— Chọn mã hàng —</option>
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.maHang} — {it.tenHang}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={l.ngayGiaoDuKien}
                      onChange={(e) => updateLine(l.key, { ngayGiaoDuKien: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={l.donGia}
                      onChange={(e) => updateLine(l.key, { donGia: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-right"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={l.soLuongDat}
                      onChange={(e) => updateLine(l.key, { soLuongDat: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-right"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={l.khoXuatDuKienId}
                      onChange={(e) =>
                        updateLine(l.key, {
                          khoXuatDuKienId: e.target.value ? Number(e.target.value) : "",
                        })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    >
                      <option value="">— Chưa chọn —</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {thanhTien.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}
                      className="text-slate-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="p-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
            className="text-sm text-orange-600 font-medium hover:text-orange-700"
          >
            + Thêm dòng
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <div className="w-64 text-sm space-y-1">
          <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-1">
            <span>Tổng tiền</span>
            <span>{totalTien.toLocaleString("vi-VN")}</span>
          </div>
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-orange-600 text-white px-5 py-2 text-sm font-semibold hover:bg-orange-700 disabled:opacity-60"
        >
          {pending ? "Đang lưu..." : "Tạo đơn bán hàng"}
        </button>
      </div>
    </form>
  );
}
