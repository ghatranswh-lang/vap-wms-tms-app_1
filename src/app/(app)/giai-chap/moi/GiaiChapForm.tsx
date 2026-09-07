"use client";

import { useActionState, useMemo, useState } from "react";
import { createCollateralRelease, type GiaiChapFormState } from "./actions";

type Option = { id: number; label: string };
type Warehouse = { id: number; code: string; name: string; wms: boolean };
type Zone = { id: number; warehouseId: number; companyId: number; name: string };
type Location = { id: number; zoneId: number; name: string };
type ItemOption = { id: number; maHang: string; tenHang: string };

export default function GiaiChapForm({
  companies,
  warehouses,
  zones,
  locations,
  items,
}: {
  companies: Option[];
  warehouses: Warehouse[];
  zones: Zone[];
  locations: Location[];
  items: ItemOption[];
}) {
  const [state, formAction, pending] = useActionState<GiaiChapFormState, FormData>(
    createCollateralRelease,
    {}
  );

  const [companyId, setCompanyId] = useState<number | "">(companies[0]?.id ?? "");
  const [warehouseId, setWarehouseId] = useState<number | "">(warehouses[0]?.id ?? "");
  const [zoneId, setZoneId] = useState<number | "">("");
  const [locationId, setLocationId] = useState<number | "">("");
  const [itemId, setItemId] = useState<number | "">("");
  const [soLuongTan, setSoLuongTan] = useState("");
  const [boCt, setBoCt] = useState("");
  const [ghiChu, setGhiChu] = useState("");

  const wh = warehouses.find((w) => w.id === warehouseId);

  const zonesFiltered = useMemo(
    () => zones.filter((z) => z.warehouseId === warehouseId && z.companyId === companyId),
    [zones, warehouseId, companyId]
  );
  const locationsFiltered = useMemo(
    () => locations.filter((l) => l.zoneId === zoneId),
    [locations, zoneId]
  );

  function payload() {
    return JSON.stringify({
      companyId,
      warehouseId,
      zoneId: zoneId || undefined,
      locationId: locationId || undefined,
      itemId,
      soLuongTan,
      boCt,
      ghiChu,
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="payload" value={payload()} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Công ty</label>
          <select
            value={companyId}
            onChange={(e) => {
              setCompanyId(Number(e.target.value));
              setZoneId("");
              setLocationId("");
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
          <label className="block text-xs font-medium text-slate-500 mb-1">Kho</label>
          <select
            value={warehouseId}
            onChange={(e) => {
              setWarehouseId(Number(e.target.value));
              setZoneId("");
              setLocationId("");
            }}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        {wh?.wms && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Khu vực</label>
              <select
                value={zoneId}
                onChange={(e) => {
                  setZoneId(e.target.value ? Number(e.target.value) : "");
                  setLocationId("");
                }}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="">— Khu vực —</option>
                {zonesFiltered.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Vị trí</label>
              <select
                disabled={zoneId === ""}
                value={locationId}
                onChange={(e) => setLocationId(e.target.value ? Number(e.target.value) : "")}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
              >
                <option value="">— Vị trí —</option>
                {locationsFiltered.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Mặt hàng</label>
          <select
            value={itemId}
            onChange={(e) => setItemId(e.target.value ? Number(e.target.value) : "")}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">— Chọn mã hàng —</option>
            {items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.maHang} — {it.tenHang}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Số lượng (Tấn)
          </label>
          <input
            type="number"
            min={0}
            step="0.001"
            value={soLuongTan}
            onChange={(e) => setSoLuongTan(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Bộ chứng từ</label>
          <input
            value={boCt}
            onChange={(e) => setBoCt(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-500 mb-1">Ghi chú</label>
          <input
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-orange-600 text-white px-5 py-2 text-sm font-semibold hover:bg-orange-700 disabled:opacity-60"
        >
          {pending ? "Đang lưu..." : "Tạo hồ sơ giải chấp"}
        </button>
      </div>
    </form>
  );
}
