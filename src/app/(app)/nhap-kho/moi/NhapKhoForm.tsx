"use client";

import { useActionState, useMemo, useState } from "react";
import { createGoodsReceipt, type NhapKhoFormState } from "./actions";

type Tthh = "HTC" | "KTC" | "DGC";

type PoLine = {
  poLineId: number;
  itemId: number;
  maHang: string;
  tenHang: string;
  tthh: Tthh;
  slChuaNhap: number;
};

type Po = {
  poId: number;
  poNumber: string;
  companyId: number;
  companyCode: string;
  supplierName: string;
  lines: PoLine[];
};

type Warehouse = { id: number; code: string; name: string; wms: boolean };
type Zone = { id: number; warehouseId: number; companyId: number; name: string };
type Location = {
  id: number;
  zoneId: number;
  name: string;
  maxPallets: number | null;
  currentPallets: number;
};

type LineInput = {
  soLuong: string;
  tthh: Tthh;
  zoneId: number | "";
  locationId: number | "";
};

export default function NhapKhoForm({
  pos,
  warehouses,
  zones,
  locations,
}: {
  pos: Po[];
  warehouses: Warehouse[];
  zones: Zone[];
  locations: Location[];
}) {
  const [state, formAction, pending] = useActionState<NhapKhoFormState, FormData>(
    createGoodsReceipt,
    {}
  );

  const [poId, setPoId] = useState<number>(pos[0]?.poId ?? 0);
  const po = useMemo(() => pos.find((p) => p.poId === poId), [pos, poId]);

  const eligibleWarehouses = warehouses; // Đức Hòa đã bị loại ở server
  const [warehouseId, setWarehouseId] = useState<number>(
    eligibleWarehouses[0]?.id ?? 0
  );
  const warehouse = eligibleWarehouses.find((w) => w.id === warehouseId);

  const [lineInputs, setLineInputs] = useState<Record<number, LineInput>>({});

  function getLineInput(l: PoLine): LineInput {
    return (
      lineInputs[l.poLineId] ?? {
        soLuong: String(l.slChuaNhap),
        tthh: l.tthh,
        zoneId: "",
        locationId: "",
      }
    );
  }

  function updateLine(l: PoLine, patch: Partial<LineInput>) {
    setLineInputs((prev) => ({
      ...prev,
      [l.poLineId]: { ...getLineInput(l), ...patch },
    }));
  }

  const zonesForWarehouseCompany = useMemo(() => {
    if (!po) return [];
    return zones.filter(
      (z) => z.warehouseId === warehouseId && z.companyId === po.companyId
    );
  }, [zones, warehouseId, po]);

  function locationsForZone(zoneId: number | "") {
    if (zoneId === "") return [];
    return locations.filter((l) => l.zoneId === zoneId);
  }

  function payload() {
    if (!po) return "{}";
    const lines = po.lines
      .map((l) => {
        const input = getLineInput(l);
        const soLuong = Number(input.soLuong) || 0;
        if (soLuong <= 0) return null;
        return {
          poLineId: l.poLineId,
          itemId: l.itemId,
          tthh: input.tthh,
          soLuong,
          zoneId: input.zoneId || undefined,
          locationId: input.locationId || undefined,
        };
      })
      .filter(Boolean);
    return JSON.stringify({ poId: po.poId, warehouseId, lines });
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="payload" value={payload()} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Chọn PO
          </label>
          <select
            value={poId}
            onChange={(e) => setPoId(Number(e.target.value))}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {pos.map((p) => (
              <option key={p.poId} value={p.poId}>
                {p.poNumber} — {p.companyCode} — {p.supplierName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Kho nhận
          </label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(Number(e.target.value))}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {eligibleWarehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {po && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">Mã hàng</th>
                <th className="text-right px-3 py-2 w-28">Còn thiếu</th>
                <th className="text-right px-3 py-2 w-28">SL nhận</th>
                <th className="text-left px-3 py-2 w-24">TTHH</th>
                {warehouse?.wms && (
                  <>
                    <th className="text-left px-3 py-2 w-48">Khu vực</th>
                    <th className="text-left px-3 py-2 w-52">Vị trí</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {po.lines.map((l) => {
                const input = getLineInput(l);
                const locs = locationsForZone(input.zoneId);
                return (
                  <tr key={l.poLineId} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <div className="font-mono">{l.maHang}</div>
                      <div className="text-xs text-slate-500">{l.tenHang}</div>
                    </td>
                    <td className="px-3 py-2 text-right text-amber-700 font-medium">
                      {l.slChuaNhap.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        max={l.slChuaNhap}
                        value={input.soLuong}
                        onChange={(e) =>
                          updateLine(l, { soLuong: e.target.value })
                        }
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-right"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={input.tthh}
                        onChange={(e) =>
                          updateLine(l, { tthh: e.target.value as Tthh })
                        }
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="HTC">HTC</option>
                        <option value="KTC">KTC</option>
                        <option value="DGC">DGC</option>
                      </select>
                    </td>
                    {warehouse?.wms && (
                      <>
                        <td className="px-3 py-2">
                          <select
                            value={input.zoneId}
                            onChange={(e) =>
                              updateLine(l, {
                                zoneId: e.target.value ? Number(e.target.value) : "",
                                locationId: "",
                              })
                            }
                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                          >
                            <option value="">— Chọn khu vực —</option>
                            {zonesForWarehouseCompany.map((z) => (
                              <option key={z.id} value={z.id}>
                                {z.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            disabled={input.zoneId === ""}
                            value={input.locationId}
                            onChange={(e) =>
                              updateLine(l, {
                                locationId: e.target.value
                                  ? Number(e.target.value)
                                  : "",
                              })
                            }
                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
                          >
                            <option value="">— Chọn vị trí —</option>
                            {locs.map((loc) => {
                              const full =
                                loc.maxPallets != null &&
                                loc.currentPallets >= loc.maxPallets;
                              return (
                                <option key={loc.id} value={loc.id} disabled={full}>
                                  {loc.name}
                                  {loc.maxPallets != null
                                    ? ` (${loc.currentPallets}/${loc.maxPallets} pallet)`
                                    : ""}
                                  {full ? " — ĐẦY" : ""}
                                </option>
                              );
                            })}
                          </select>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div>
        <button
          type="submit"
          disabled={pending || !po}
          className="rounded-md bg-orange-600 text-white px-5 py-2 text-sm font-semibold hover:bg-orange-700 disabled:opacity-60"
        >
          {pending ? "Đang lưu..." : "Tạo phiếu nhập kho"}
        </button>
      </div>
    </form>
  );
}
