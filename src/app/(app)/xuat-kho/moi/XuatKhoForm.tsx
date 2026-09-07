"use client";

import { useActionState, useMemo, useState } from "react";
import { createGoodsIssue, type XuatKhoFormState } from "./actions";

type Tthh = "HTC" | "KTC" | "DGC";
type SoLine = {
  soLineId: number;
  itemId: number;
  maHang: string;
  tenHang: string;
  conLai: number;
  khoXuatDuKienId: number | null;
};
type Warehouse = { id: number; code: string; name: string; wms: boolean };
type Zone = { id: number; warehouseId: number; name: string };
type Location = {
  id: number;
  zoneId: number;
  name: string;
  maxPallets: number | null;
  currentPallets: number;
};

type LineState = {
  soLuong: string;
  tthh: Tthh;
  warehouseId: number | "";
  zoneId: number | "";
  locationId: number | "";
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function XuatKhoForm({
  soId,
  customerId,
  lines,
  warehouses,
  zones,
  locations,
}: {
  soId: number;
  customerId: number;
  lines: SoLine[];
  warehouses: Warehouse[];
  zones: Zone[];
  locations: Location[];
}) {
  const [state, formAction, pending] = useActionState<XuatKhoFormState, FormData>(
    createGoodsIssue,
    {}
  );

  const [ngayXuat, setNgayXuat] = useState(todayStr());
  const [donViVanTai, setDonViVanTai] = useState("");
  const [soXe, setSoXe] = useState("");
  const [tenTaiXe, setTenTaiXe] = useState("");

  const [lineStates, setLineStates] = useState<Record<number, LineState>>(() =>
    Object.fromEntries(
      lines.map((l) => [
        l.soLineId,
        {
          soLuong: String(l.conLai),
          tthh: "KTC" as Tthh,
          warehouseId: l.khoXuatDuKienId ?? "",
          zoneId: "" as number | "",
          locationId: "" as number | "",
        },
      ])
    )
  );

  function update(soLineId: number, patch: Partial<LineState>) {
    setLineStates((prev) => ({ ...prev, [soLineId]: { ...prev[soLineId], ...patch } }));
  }

  function zonesOf(warehouseId: number | "") {
    if (warehouseId === "") return [];
    return zones.filter((z) => z.warehouseId === warehouseId);
  }
  function locsOf(zoneId: number | "") {
    if (zoneId === "") return [];
    return locations.filter((l) => l.zoneId === zoneId);
  }
  function whOf(id: number | "") {
    return warehouses.find((w) => w.id === id);
  }

  const payload = useMemo(
    () =>
      JSON.stringify({
        soId,
        customerId,
        ngayXuat,
        donViVanTai,
        soXe,
        tenTaiXe,
        lines: lines
          .filter((l) => Number(lineStates[l.soLineId]?.soLuong) > 0)
          .map((l) => {
            const s = lineStates[l.soLineId];
            return {
              soLineId: l.soLineId,
              itemId: l.itemId,
              soLuong: s.soLuong,
              tthh: s.tthh,
              warehouseId: s.warehouseId || undefined,
              zoneId: s.zoneId || undefined,
              locationId: s.locationId || undefined,
            };
          }),
      }),
    [soId, customerId, ngayXuat, donViVanTai, soXe, tenTaiXe, lines, lineStates]
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="payload" value={payload} />

      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Ngày xuất</label>
          <input
            type="date"
            value={ngayXuat}
            onChange={(e) => setNgayXuat(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Đơn vị vận tải</label>
          <input
            value={donViVanTai}
            onChange={(e) => setDonViVanTai(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Số xe</label>
          <input
            value={soXe}
            onChange={(e) => setSoXe(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Tên tài xế</label>
          <input
            value={tenTaiXe}
            onChange={(e) => setTenTaiXe(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">Mã hàng</th>
              <th className="text-right px-3 py-2 w-24">Còn lại</th>
              <th className="text-right px-3 py-2 w-28">SL xuất (KG)</th>
              <th className="text-left px-3 py-2 w-24">TTHH</th>
              <th className="text-left px-3 py-2 w-40">Kho xuất</th>
              <th className="text-left px-3 py-2 w-40">Khu vực</th>
              <th className="text-left px-3 py-2 w-48">Vị trí</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const s = lineStates[l.soLineId];
              const wh = whOf(s.warehouseId);
              return (
                <tr key={l.soLineId} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <div className="font-mono">{l.maHang}</div>
                    <div className="text-xs text-slate-400">{l.tenHang}</div>
                  </td>
                  <td className="px-3 py-2 text-right">{l.conLai.toLocaleString("vi-VN")}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      max={l.conLai}
                      value={s.soLuong}
                      onChange={(e) => update(l.soLineId, { soLuong: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-right"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={s.tthh}
                      onChange={(e) => update(l.soLineId, { tthh: e.target.value as Tthh })}
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    >
                      <option value="HTC">HTC</option>
                      <option value="KTC">KTC</option>
                      <option value="DGC">DGC</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={s.warehouseId}
                      onChange={(e) =>
                        update(l.soLineId, {
                          warehouseId: e.target.value ? Number(e.target.value) : "",
                          zoneId: "",
                          locationId: "",
                        })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    >
                      <option value="">— Kho —</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      disabled={!wh?.wms}
                      value={s.zoneId}
                      onChange={(e) =>
                        update(l.soLineId, {
                          zoneId: e.target.value ? Number(e.target.value) : "",
                          locationId: "",
                        })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
                    >
                      <option value="">— Khu vực —</option>
                      {zonesOf(s.warehouseId).map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      disabled={s.zoneId === ""}
                      value={s.locationId}
                      onChange={(e) =>
                        update(l.soLineId, {
                          locationId: e.target.value ? Number(e.target.value) : "",
                        })
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
                    >
                      <option value="">— Vị trí —</option>
                      {locsOf(s.zoneId).map((loc) => {
                        const full = loc.maxPallets != null && loc.currentPallets >= loc.maxPallets;
                        return (
                          <option key={loc.id} value={loc.id} disabled={full}>
                            {loc.name}
                            {loc.maxPallets != null ? ` (${loc.currentPallets}/${loc.maxPallets})` : ""}
                            {full ? " — ĐẦY" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-orange-600 text-white px-5 py-2 text-sm font-semibold hover:bg-orange-700 disabled:opacity-60"
        >
          {pending ? "Đang lưu..." : "Tạo phiếu xuất kho"}
        </button>
      </div>
    </form>
  );
}
