"use client";

import { useActionState, useMemo, useState } from "react";
import { confirmDucHoaReceipt, type NhapKhoDucHoaFormState } from "./actions";

type LineData = {
  lineId: number;
  maHang: string;
  tenHang: string;
  soLuong: string;
  tthh: string;
  zoneFromName: string | null;
  locFromName: string | null;
  plannedZoneToId: number | null;
  plannedZoneToName: string | null;
  plannedLocationToId: number | null;
  plannedLocToName: string | null;
};
type Zone = { id: number; name: string };
type Location = {
  id: number;
  zoneId: number;
  name: string;
  maxPallets: number | null;
  currentPallets: number;
};

export default function NhapKhoDucHoaForm({
  transferOrderId,
  lines,
  zones,
  locations,
}: {
  transferOrderId: number;
  lines: LineData[];
  zones: Zone[];
  locations: Location[];
}) {
  const [state, formAction, pending] = useActionState<NhapKhoDucHoaFormState, FormData>(
    confirmDucHoaReceipt,
    {}
  );

  const [choices, setChoices] = useState<Record<number, { zoneId: number | ""; locationId: number | "" }>>(
    () =>
      Object.fromEntries(
        lines.map((l) => [
          l.lineId,
          {
            zoneId: l.plannedZoneToId ?? "",
            locationId: l.plannedLocationToId ?? "",
          },
        ])
      )
  );

  function setZone(lineId: number, zoneId: number | "") {
    setChoices((prev) => ({ ...prev, [lineId]: { zoneId, locationId: "" } }));
  }
  function setLocation(lineId: number, locationId: number | "") {
    setChoices((prev) => ({ ...prev, [lineId]: { ...prev[lineId], locationId } }));
  }
  function locsOf(zoneId: number | "") {
    if (zoneId === "") return [];
    return locations.filter((l) => l.zoneId === zoneId);
  }

  const payload = useMemo(
    () =>
      JSON.stringify({
        transferOrderId,
        lines: lines.map((l) => ({
          lineId: l.lineId,
          zoneToId: choices[l.lineId]?.zoneId || undefined,
          locationToId: choices[l.lineId]?.locationId || undefined,
        })),
      }),
    [transferOrderId, lines, choices]
  );

  const allChosen = lines.every(
    (l) => choices[l.lineId]?.zoneId !== "" && choices[l.lineId]?.locationId !== ""
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="payload" value={payload} />

      <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">Mã hàng</th>
              <th className="text-right px-3 py-2">SL (KG)</th>
              <th className="text-left px-3 py-2">TTHH</th>
              <th className="text-left px-3 py-2">Nguồn</th>
              <th className="text-left px-3 py-2 w-44">Khu vực nhận</th>
              <th className="text-left px-3 py-2 w-52">Vị trí nhận</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const choice = choices[l.lineId] ?? { zoneId: "", locationId: "" };
              const changedFromPlanned =
                l.plannedLocationToId != null && choice.locationId !== l.plannedLocationToId;
              return (
                <tr key={l.lineId} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-mono">{l.maHang}</td>
                  <td className="px-3 py-2 text-right">
                    {Number(l.soLuong).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-2">{l.tthh}</td>
                  <td className="px-3 py-2 text-xs">
                    {l.zoneFromName ? `${l.zoneFromName} · ${l.locFromName}` : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={choice.zoneId}
                      onChange={(e) =>
                        setZone(l.lineId, e.target.value ? Number(e.target.value) : "")
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    >
                      <option value="">— Khu vực —</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      disabled={choice.zoneId === ""}
                      value={choice.locationId}
                      onChange={(e) =>
                        setLocation(l.lineId, e.target.value ? Number(e.target.value) : "")
                      }
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
                    >
                      <option value="">— Vị trí —</option>
                      {locsOf(choice.zoneId).map((loc) => {
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
                    {changedFromPlanned && (
                      <p className="text-xs text-amber-600 mt-1">
                        Khác vị trí dự kiến ({l.plannedZoneToName} · {l.plannedLocToName}) — vị
                        trí dự kiến có thể đã đầy.
                      </p>
                    )}
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
          disabled={pending || !allChosen}
          className="rounded-md bg-orange-600 text-white px-5 py-2 text-sm font-semibold hover:bg-orange-700 disabled:opacity-60"
        >
          {pending ? "Đang lưu..." : "Xác nhận đã nhận hàng"}
        </button>
      </div>
    </form>
  );
}
