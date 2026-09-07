"use client";

import { useActionState, useMemo, useState } from "react";
import { createPurchaseOrder, type PoFormState } from "./actions";
import SearchSelect from "@/components/SearchSelect";

type Option = { id: number; label: string };
type ItemOption = { id: number; maHang: string; tenHang: string };
type ZoneOption = {
  id: number;
  companyId: number;
  warehouseId: number;
  label: string;
};

const CURRENCIES = ["VND", "USD", "CNY"];

type Line = {
  key: number;
  itemId: number | "";
  donGia: string;
  qty: string;
  vatRate: string;
  tthh: "HTC" | "KTC" | "DGC";
};

let keySeq = 0;
function emptyLine(): Line {
  return { key: ++keySeq, itemId: "", donGia: "", qty: "", vatRate: "0", tthh: "KTC" };
}

export default function PoForm({
  companies,
  suppliers,
  items,
  zones,
  warehouses,
}: {
  companies: Option[];
  suppliers: Option[];
  items: ItemOption[];
  zones: ZoneOption[];
  warehouses: Option[];
}) {
  const initialState: PoFormState = {};
  const [state, formAction, pending] = useActionState(
    createPurchaseOrder,
    initialState
  );

  const [companyId, setCompanyId] = useState<number | "">(
    companies[0]?.id ?? ""
  );
  const [supplierId, setSupplierId] = useState<number | "">(
    suppliers[0]?.id ?? ""
  );
  const [warehouseId, setWarehouseId] = useState<number | "">("");
  const [zoneId, setZoneId] = useState<number | "">("");
  const [currency, setCurrency] = useState("VND");
  const [ghiChu, setGhiChu] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  const zonesForSelection = useMemo(
    () =>
      zones.filter(
        (z) =>
          z.companyId === companyId &&
          (warehouseId === "" || z.warehouseId === warehouseId)
      ),
    [zones, companyId, warehouseId]
  );

  const totals = useMemo(() => {
    let tienHang = 0;
    let tienVat = 0;
    for (const l of lines) {
      const qty = Number(l.qty) || 0;
      const donGia = Number(l.donGia) || 0;
      const vat = Number(l.vatRate) || 0;
      const th = qty * donGia;
      tienHang += th;
      tienVat += th * (vat / 100);
    }
    return { tienHang, tienVat, thanhTien: tienHang + tienVat };
  }, [lines]);

  const itemOptions = useMemo(
    () => items.map((it) => ({ id: it.id, label: `${it.maHang} — ${it.tenHang}` })),
    [items]
  );

  function updateLine(key: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function payload() {
    return JSON.stringify({
      companyId,
      supplierId,
      zoneId: zoneId || undefined,
      currency,
      ghiChu,
      lines: lines
        .filter((l) => l.itemId !== "")
        .map((l) => ({
          itemId: l.itemId,
          donGia: l.donGia,
          qty: l.qty,
          vatRate: l.vatRate,
          tthh: l.tthh,
        })),
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="payload" value={payload()} />

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Công ty
          </label>
          <select
            value={companyId}
            onChange={(e) => {
              setCompanyId(Number(e.target.value));
              setZoneId("");
            }}
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
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Nhà cung cấp
          </label>
          <SearchSelect
            options={suppliers}
            value={supplierId}
            onChange={(id) => setSupplierId(id)}
            placeholder="Gõ để tìm nhà cung cấp..."
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Đơn vị tiền tệ
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Kho nhập (tuỳ chọn)
          </label>
          <select
            value={warehouseId}
            onChange={(e) => {
              setWarehouseId(e.target.value ? Number(e.target.value) : "");
              setZoneId("");
            }}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">— Chưa chọn —</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Khu vực đích (tuỳ chọn)
          </label>
          <select
            value={zoneId}
            onChange={(e) =>
              setZoneId(e.target.value ? Number(e.target.value) : "")
            }
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">— Chưa chọn —</option>
            {zonesForSelection.map((z) => (
              <option key={z.id} value={z.id}>
                {z.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Ghi chú
        </label>
        <input
          value={ghiChu}
          onChange={(e) => setGhiChu(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">Mã hàng</th>
              <th className="text-right px-3 py-2 w-32">Đơn giá</th>
              <th className="text-right px-3 py-2 w-28">Số lượng (KG)</th>
              <th className="text-right px-3 py-2 w-24">VAT %</th>
              <th className="text-left px-3 py-2 w-28">TTHH</th>
              <th className="text-right px-3 py-2 w-36">Thành tiền</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const qty = Number(l.qty) || 0;
              const donGia = Number(l.donGia) || 0;
              const vat = Number(l.vatRate) || 0;
              const th = qty * donGia;
              const thanhTien = th + th * (vat / 100);
              return (
                <tr key={l.key} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <SearchSelect
                      options={itemOptions}
                      value={l.itemId}
                      onChange={(id) => updateLine(l.key, { itemId: id })}
                      placeholder="Gõ để tìm mã hàng..."
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
                      value={l.qty}
                      onChange={(e) => updateLine(l.key, { qty: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-right"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={l.vatRate}
                      onChange={(e) => updateLine(l.key, { vatRate: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-right"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={l.tthh}
                      onChange={(e) =>
                        updateLine(l.key, {
                          tthh: e.target.value as Line["tthh"],
                        })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    >
                      <option value="HTC">HTC</option>
                      <option value="KTC">KTC</option>
                      <option value="DGC">DGC</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {thanhTien.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        setLines((prev) => prev.filter((x) => x.key !== l.key))
                      }
                      className="text-slate-400 hover:text-red-600"
                      title="Xoá dòng"
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
          <div className="flex justify-between">
            <span className="text-slate-500">Tiền hàng</span>
            <span>{totals.tienHang.toLocaleString("vi-VN")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Tiền VAT</span>
            <span>{totals.tienVat.toLocaleString("vi-VN")}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-1">
            <span>Thành tiền</span>
            <span>{totals.thanhTien.toLocaleString("vi-VN")}</span>
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
          {pending ? "Đang lưu..." : "Tạo đơn mua hàng"}
        </button>
      </div>
    </form>
  );
}
