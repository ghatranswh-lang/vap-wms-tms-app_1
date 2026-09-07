"use client";

import { useActionState, useMemo, useState } from "react";
import { createTransferOrder, type ChuyenKhoFormState } from "./actions";

type Tthh = "HTC" | "KTC" | "DGC";
type ItemOption = { id: number; maHang: string; tenHang: string };
type Warehouse = { id: number; code: string; name: string; wms: boolean };
type Zone = { id: number; warehouseId: number; name: string };
type Location = {
  id: number;
  zoneId: number;
  name: string;
  maxPallets: number | null;
  currentPallets: number;
};

type Line = {
  key: number;
  itemId: number | "";
  soLuong: string;
  tthh: Tthh;
  zoneFromId: number | "";
  locationFromId: number | "";
  zoneToId: number | "";
  locationToId: number | "";
};

let keySeq = 0;
function emptyLine(): Line {
  return {
    key: ++keySeq,
    itemId: "",
    soLuong: "",
    tthh: "KTC",
    zoneFromId: "",
    locationFromId: "",
    zoneToId: "",
    locationToId: "",
  };
}

export default function ChuyenKhoForm({
  warehouses,
  zones,
  locations,
  items,
}: {
  warehouses: Warehouse[];
  zones: Zone[];
  locations: Location[];
  items: ItemOption[];
}) {
  const [state, formAction, pending] = useActionState<ChuyenKhoFormState, FormData>(
    createTransferOrder,
    {}
  );

  const [warehouseFromId, setWarehouseFromId] = useState<number>(warehouses[0]?.id ?? 0);
  const [warehouseToId, setWarehouseToId] = useState<number>(warehouses[1]?.id ?? 0);
  const [donViVanTai, setDonViVanTai] = useState("");
  const [soXe, setSoXe] = useState("");
  const [tenTaiXe, setTenTaiXe] = useState("");
  const [soCccd, setSoCccd] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  const whFrom = warehouses.find((w) => w.id === warehouseFromId);
  const whTo = warehouses.find((w) => w.id === warehouseToId);

  const zonesFrom = useMemo(
    () => zones.filter((z) => z.warehouseId === warehouseFromId),
    [zones, warehouseFromId]
  );
  const zonesTo = useMemo(
    () => zones.filter((z) => z.warehouseId === warehouseToId),
    [zones, warehouseToId]
  );
  function locsOf(zoneId: number | "") {
    if (zoneId === "") return [];
    return locations.filter((l) => l.zoneId === zoneId);
  }

  function updateLine(key: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function payload() {
    return JSON.stringify({
      warehouseFromId,
      warehouseToId,
      donViVanTai,
      soXe,
      tenTaiXe,
      soCccd,
      lines: lines
        .filter((l) => l.itemId !== "" && Number(l.soLuong) > 0)
        .map((l) => ({
          itemId: l.itemId,
          soLuong: l.soLuong,
          tthh: l.tthh,
          zoneFromId: l.zoneFromId || undefined,
          locationFromId: l.locationFromId || undefined,
          zoneToId: l.zoneToId || undefined,
          locationToId: l.locationToId || undefined,
        })),
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="payload" value={payload()} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Kho đi</label>
          <select
            value={warehouseFromId}
            onChange={(e) => setWarehouseFromId(Number(e.target.value))}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Kho đến</label>
          <select
            value={warehouseToId}
            onChange={(e) => setWarehouseToId(Number(e.target.value))}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Đơn vị vận tải
          </label>
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
            onChange={(e) =>
              setSoXe(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
            }
            required
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Tên tài xế / Số CCCD
          </label>
          <div className="flex gap-2">
            <input
              value={tenTaiXe}
              onChange={(e) => setTenTaiXe(e.target.value)}
              required
              placeholder="Tên tài xế"
              className="w-1/2 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
            <input
              value={soCccd}
              onChange={(e) => setSoCccd(e.target.value)}
              required
              placeholder="Số CCCD"
              className="w-1/2 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">Mã hàng</th>
              <th className="text-right px-3 py-2 w-28">SL (KG)</th>
              <th className="text-left px-3 py-2 w-24">TTHH</th>
              {whFrom?.wms && (
                <>
                  <th className="text-left px-3 py-2 w-44">Khu vực nguồn</th>
                  <th className="text-left px-3 py-2 w-48">Vị trí nguồn</th>
                </>
              )}
              {whTo?.wms && (
                <>
                  <th className="text-left px-3 py-2 w-44">Khu vực đích</th>
                  <th className="text-left px-3 py-2 w-48">Vị trí đích</th>
                </>
              )}
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
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
                        {it.maHang}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    value={l.soLuong}
                    onChange={(e) => updateLine(l.key, { soLuong: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-right"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={l.tthh}
                    onChange={(e) => updateLine(l.key, { tthh: e.target.value as Tthh })}
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  >
                    <option value="HTC">HTC</option>
                    <option value="KTC">KTC</option>
                    <option value="DGC">DGC</option>
                  </select>
                </td>
                {whFrom?.wms && (
                  <>
                    <td className="px-3 py-2">
                      <select
                        value={l.zoneFromId}
                        onChange={(e) =>
                          updateLine(l.key, {
                            zoneFromId: e.target.value ? Number(e.target.value) : "",
                            locationFromId: "",
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="">— Khu vực —</option>
                        {zonesFrom.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        disabled={l.zoneFromId === ""}
                        value={l.locationFromId}
                        onChange={(e) =>
                          updateLine(l.key, {
                            locationFromId: e.target.value ? Number(e.target.value) : "",
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
                      >
                        <option value="">— Vị trí —</option>
                        {locsOf(l.zoneFromId).map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </>
                )}
                {whTo?.wms && (
                  <>
                    <td className="px-3 py-2">
                      <select
                        value={l.zoneToId}
                        onChange={(e) =>
                          updateLine(l.key, {
                            zoneToId: e.target.value ? Number(e.target.value) : "",
                            locationToId: "",
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="">— Khu vực —</option>
                        {zonesTo.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        disabled={l.zoneToId === ""}
                        value={l.locationToId}
                        onChange={(e) =>
                          updateLine(l.key, {
                            locationToId: e.target.value ? Number(e.target.value) : "",
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
                      >
                        <option value="">— Vị trí —</option>
                        {locsOf(l.zoneToId).map((loc) => {
                          const full =
                            loc.maxPallets != null && loc.currentPallets >= loc.maxPallets;
                          return (
                            <option key={loc.id} value={loc.id} disabled={full}>
                              {loc.name}
                              {loc.maxPallets != null
                                ? ` (${loc.currentPallets}/${loc.maxPallets})`
                                : ""}
                              {full ? " — ĐẦY" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </td>
                  </>
                )}
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
            ))}
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

      {whTo?.code === "KHO-DUCHOA" && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-md px-3 py-2">
          Đích là Kho Đức Hòa: tồn kho đích chỉ được cộng khi Kho Đức Hòa xác nhận
          nhận hàng ở màn "Nhập kho Đức Hòa" — vị trí chọn ở đây chỉ là dự kiến.
        </p>
      )}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-orange-600 text-white px-5 py-2 text-sm font-semibold hover:bg-orange-700 disabled:opacity-60"
        >
          {pending ? "Đang lưu..." : "Tạo phiếu chuyển kho"}
        </button>
      </div>
    </form>
  );
}
