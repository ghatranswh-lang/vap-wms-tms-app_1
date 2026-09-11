"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { createPurchaseOrder, type PoFormState } from "./actions";
import { updatePurchaseOrder } from "../[id]/actions";
import SearchSelect from "@/components/SearchSelect";
import CustomFields, { type CustomField } from "@/components/CustomFields";
import ColumnPicker, { useVisibleColumns, type ColumnDef } from "@/components/ColumnPicker";
import { parseExcelFile } from "@/lib/excel";
import type { ClipboardEvent } from "react";

// Thứ tự cột khi dán nhiều dòng copy từ Excel vào ô Mã hàng (Tab phân cách
// cột, xuống dòng phân cách dòng hàng) — khớp đúng thứ tự 5 cột nhập liệu bắt
// buộc hiển thị trên bảng dòng hàng (Mã hàng luôn ở đầu). Khu vực/Vị trí/
// Trường tuỳ chỉnh không nằm trong danh sách dán vì cần chọn theo ID, không
// dán trực tiếp bằng tên được.
const PASTE_COLUMN_ORDER = ["maHang", "donGia", "qty", "vatRate", "tthh"] as const;
const PASTE_COLUMN_LABELS: Record<(typeof PASTE_COLUMN_ORDER)[number], string> = {
  maHang: "Mã hàng",
  donGia: "Đơn giá",
  qty: "Số lượng",
  vatRate: "VAT%",
  tthh: "TTHH",
};

type Option = { id: number; label: string };
type ItemOption = { id: number; maHang: string; tenHang: string };
type ZoneOption = {
  id: number;
  companyId: number;
  warehouseId: number;
  label: string;
};
type WarehouseOption = Option & { wms: boolean };
type LocationOption = { id: number; zoneId: number; label: string };

const CURRENCIES = ["VND", "USD", "CNY"];

type Line = {
  key: number;
  itemId: number | "";
  donGia: string;
  qty: string;
  vatRate: string;
  tthh: "HTC" | "KTC" | "DGC";
  zoneId: number | "";
  locationId: number | "";
  custom: CustomField[];
};

let keySeq = 0;
function emptyLine(): Line {
  return {
    key: ++keySeq,
    itemId: "",
    donGia: "",
    qty: "",
    vatRate: "0",
    tthh: "KTC",
    zoneId: "",
    locationId: "",
    custom: [],
  };
}

export type PoInitialLine = {
  itemId: number | "";
  donGia: string;
  qty: string;
  vatRate: string;
  tthh: "HTC" | "KTC" | "DGC";
  zoneId: number | "";
  locationId: number | "";
  custom: CustomField[];
};

export type PoInitialValues = {
  companyId: number | "";
  supplierId: number | "";
  warehouseId: number | "";
  currency: string;
  ghiChu: string;
  custom: CustomField[];
  lines: PoInitialLine[];
};

export default function PoForm({
  companies,
  suppliers,
  items,
  zones,
  warehouses,
  locations,
  mode = "create",
  poId,
  initial,
}: {
  companies: Option[];
  suppliers: Option[];
  items: ItemOption[];
  zones: ZoneOption[];
  warehouses: WarehouseOption[];
  locations: LocationOption[];
  mode?: "create" | "edit";
  poId?: number;
  initial?: PoInitialValues;
}) {
  const initialState: PoFormState = {};
  const boundUpdate = useMemo(
    () => (poId ? updatePurchaseOrder.bind(null, poId) : null),
    [poId]
  );
  const [state, formAction, pending] = useActionState(
    mode === "edit" && boundUpdate ? boundUpdate : createPurchaseOrder,
    initialState
  );

  const [companyId, setCompanyId] = useState<number | "">(
    initial?.companyId ?? companies[0]?.id ?? ""
  );
  const [supplierId, setSupplierId] = useState<number | "">(
    initial?.supplierId ?? suppliers[0]?.id ?? ""
  );
  const [warehouseId, setWarehouseId] = useState<number | "">(
    initial?.warehouseId ?? ""
  );
  const [currency, setCurrency] = useState(initial?.currency ?? "VND");
  const [ghiChu, setGhiChu] = useState(initial?.ghiChu ?? "");
  const [customHeader, setCustomHeader] = useState<CustomField[]>(
    initial?.custom ?? []
  );
  const [lines, setLines] = useState<Line[]>(() =>
    initial?.lines && initial.lines.length > 0
      ? initial.lines.map((l) => ({ ...l, key: ++keySeq }))
      : [emptyLine()]
  );
  const [importMsg, setImportMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const warehouse = warehouses.find((w) => w.id === warehouseId);
  const warehouseHasWms = warehouse?.wms ?? false;

  const zonesForWarehouse = useMemo(
    () =>
      zones.filter((z) => z.companyId === companyId && z.warehouseId === warehouseId),
    [zones, companyId, warehouseId]
  );

  function locationsForZone(zoneId: number | "") {
    if (zoneId === "") return [];
    return locations.filter((l) => l.zoneId === zoneId);
  }

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

  // Cột tuỳ chọn ẩn/hiện cho bảng dòng hàng — Mã hàng/Đơn giá/SL/VAT/TTHH luôn
  // hiện vì là dữ liệu bắt buộc, chỉ Khu vực/Vị trí (khi kho có WMS) và Trường
  // tuỳ chỉnh là có thể ẩn bớt cho gọn khi không cần, hoặc để khớp với bố cột
  // trong file Excel khi dán nhiều dòng.
  const lineColumns = useMemo<ColumnDef[]>(() => {
    const cols: ColumnDef[] = [];
    if (warehouseHasWms) {
      cols.push({ key: "zone", label: "Khu vực dự kiến" });
      cols.push({ key: "location", label: "Vị trí dự kiến" });
    }
    cols.push({ key: "custom", label: "Trường tuỳ chỉnh" });
    return cols;
  }, [warehouseHasWms]);
  const {
    visible: visibleLineCols,
    toggle: toggleLineCol,
    loaded: lineColsLoaded,
  } = useVisibleColumns("cols:po-create-lines", lineColumns);
  function isLineColOn(key: string) {
    return !lineColsLoaded || visibleLineCols.has(key);
  }

  function handleLinePaste(e: ClipboardEvent<HTMLInputElement>, atKey: number) {
    const text = e.clipboardData.getData("text/plain");
    // Dán 1 giá trị đơn (không có Tab/xuống dòng) thì để hành vi gõ/lọc bình
    // thường của ô tìm kiếm — chỉ can thiệp khi rõ ràng là dán nhiều ô/dòng.
    if (!text.includes("\t") && !text.includes("\n")) return;
    e.preventDefault();

    const rows = text
      .split(/\r\n|\n|\r/)
      .map((r) => r.trim())
      .filter(Boolean);
    const parsed: Line[] = [];
    let skipped = 0;
    for (const row of rows) {
      const cells = row.split("\t");
      const rec: Record<string, string> = {};
      PASTE_COLUMN_ORDER.forEach((key, i) => {
        rec[key] = (cells[i] ?? "").trim();
      });
      const maHang = rec.maHang ?? "";
      const item = items.find(
        (it) => it.maHang.toLowerCase() === maHang.toLowerCase()
      );
      if (!item) {
        skipped++;
        continue;
      }
      const tthhRaw = (rec.tthh || "KTC").toUpperCase();
      parsed.push({
        key: ++keySeq,
        itemId: item.id,
        donGia: rec.donGia ?? "",
        qty: rec.qty ?? "",
        vatRate: rec.vatRate || "0",
        tthh: (["HTC", "KTC", "DGC"].includes(tthhRaw)
          ? tthhRaw
          : "KTC") as Line["tthh"],
        zoneId: "",
        locationId: "",
        custom: [],
      });
    }

    if (parsed.length === 0) {
      setImportMsg(
        "Không đọc được dữ liệu dán — kiểm tra lại mã hàng có khớp danh mục và đúng thứ tự cột không."
      );
      return;
    }

    setLines((prev) => {
      const idx = prev.findIndex((l) => l.key === atKey);
      if (idx === -1) return [...prev, ...parsed];
      const targetIsEmpty = prev[idx].itemId === "";
      if (targetIsEmpty) {
        return [...prev.slice(0, idx), ...parsed, ...prev.slice(idx + 1)];
      }
      return [...prev.slice(0, idx + 1), ...parsed, ...prev.slice(idx + 1)];
    });
    setImportMsg(
      `Đã dán ${parsed.length} dòng từ Excel.` +
        (skipped > 0 ? ` Bỏ qua ${skipped} dòng không khớp mã hàng.` : "")
    );
  }

  function updateLine(key: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  async function handleImportFile(file: File) {
    setImportMsg("Đang đọc file...");
    try {
      const rows = await parseExcelFile(file);
      let added = 0;
      let skipped = 0;
      const newLines: Line[] = [];
      for (const row of rows) {
        const maHang = (row["Mã hàng"] || row["maHang"] || row["Ma hang"] || "")
          .toString()
          .trim();
        const item = items.find(
          (it) => it.maHang.toLowerCase() === maHang.toLowerCase()
        );
        if (!item) {
          skipped++;
          continue;
        }
        const donGia = row["Đơn giá"] || row["donGia"] || "0";
        const qty = row["Số lượng"] || row["SL"] || row["qty"] || "0";
        const vatRate = row["VAT%"] || row["VAT"] || row["vatRate"] || "0";
        const tthhRaw = (row["TTHH"] || row["tthh"] || "KTC").toString().toUpperCase();
        const tthh: Line["tthh"] = ["HTC", "KTC", "DGC"].includes(tthhRaw)
          ? (tthhRaw as Line["tthh"])
          : "KTC";
        newLines.push({
          key: ++keySeq,
          itemId: item.id,
          donGia: String(donGia),
          qty: String(qty),
          vatRate: String(vatRate),
          tthh,
          zoneId: "",
          locationId: "",
          custom: [],
        });
        added++;
      }
      if (added > 0) {
        setLines((prev) => {
          const nonEmpty = prev.filter((l) => l.itemId !== "");
          return [...nonEmpty, ...newLines];
        });
      }
      setImportMsg(
        `Đã thêm ${added} dòng từ file.` +
          (skipped > 0 ? ` Bỏ qua ${skipped} dòng không khớp mã hàng.` : "")
      );
    } catch {
      setImportMsg("Không đọc được file — kiểm tra lại định dạng .xlsx.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function payload() {
    return JSON.stringify({
      companyId,
      supplierId,
      warehouseId: warehouseId || undefined,
      currency,
      ghiChu,
      custom: customHeader,
      lines: lines
        .filter((l) => l.itemId !== "")
        .map((l) => ({
          itemId: l.itemId,
          donGia: l.donGia,
          qty: l.qty,
          vatRate: l.vatRate,
          tthh: l.tthh,
          zoneId: l.zoneId || undefined,
          locationId: l.locationId || undefined,
          custom: l.custom,
        })),
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="payload" value={payload()} />

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-xs font-semibold text-slate-500 uppercase mb-3">
          Thông tin chung
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Công ty
            </label>
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
                setLines((prev) =>
                  prev.map((l) => ({ ...l, zoneId: "", locationId: "" }))
                );
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
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Ghi chú
            </label>
            <input
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100">
          <label className="block text-xs font-medium text-slate-500 mb-2">
            Trường tuỳ chỉnh (tự thêm nếu cần)
          </label>
          <CustomFields value={customHeader} onChange={setCustomHeader} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-slate-500 uppercase">
          Dòng hàng
        </h2>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportFile(f);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            ⭳ Nhập từ Excel
          </button>
          {lineColumns.length > 0 && (
            <ColumnPicker
              columns={lineColumns}
              visible={visibleLineCols}
              onToggle={toggleLineCol}
            />
          )}
        </div>
      </div>
      {importMsg && <p className="text-xs text-slate-500 -mt-4">{importMsg}</p>}
      <p className="text-xs text-slate-400 -mt-4">
        File Excel cần có các cột: Mã hàng, Đơn giá, Số lượng, VAT%, TTHH
        (HTC/KTC/DGC). Hoặc copy trực tiếp nhiều dòng từ Excel (đúng thứ tự
        cột:{" "}
        {PASTE_COLUMN_ORDER.map((k) => PASTE_COLUMN_LABELS[k]).join(", ")}
        ), rồi dán (Ctrl+V) vào ô Mã hàng của 1 dòng bất kỳ — hệ thống sẽ tự
        tách thành nhiều dòng. Dùng nút &quot;Cột hiển thị&quot; để bớt/thêm cột
        Khu vực/Vị trí/Trường tuỳ chỉnh cho gọn bảng.
      </p>

      <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2 w-56">Mã hàng</th>
              <th className="text-right px-3 py-2 w-28">Đơn giá</th>
              <th className="text-right px-3 py-2 w-24">Số lượng (KG)</th>
              <th className="text-right px-3 py-2 w-20">VAT %</th>
              <th className="text-left px-3 py-2 w-24">TTHH</th>
              {warehouseHasWms && isLineColOn("zone") && (
                <th className="text-left px-3 py-2 w-40">Khu vực dự kiến</th>
              )}
              {warehouseHasWms && isLineColOn("location") && (
                <th className="text-left px-3 py-2 w-40">Vị trí dự kiến</th>
              )}
              {isLineColOn("custom") && (
                <th className="text-left px-3 py-2 w-48">Trường tuỳ chỉnh</th>
              )}
              <th className="text-right px-3 py-2 w-32">Thành tiền</th>
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
                <tr key={l.key} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2">
                    <SearchSelect
                      options={itemOptions}
                      value={l.itemId}
                      onChange={(id) => updateLine(l.key, { itemId: id })}
                      placeholder="Gõ để tìm mã hàng, hoặc dán nhiều dòng từ Excel..."
                      onPaste={(e) => handleLinePaste(e, l.key)}
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
                  {warehouseHasWms && isLineColOn("zone") && (
                    <td className="px-3 py-2">
                      <select
                        value={l.zoneId}
                        onChange={(e) =>
                          updateLine(l.key, {
                            zoneId: e.target.value ? Number(e.target.value) : "",
                            locationId: "",
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="">— Chưa chọn —</option>
                        {zonesForWarehouse.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                  {warehouseHasWms && isLineColOn("location") && (
                    <td className="px-3 py-2">
                      <select
                        value={l.locationId}
                        onChange={(e) =>
                          updateLine(l.key, {
                            locationId: e.target.value ? Number(e.target.value) : "",
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="">— Chưa chọn —</option>
                        {locationsForZone(l.zoneId).map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                  {isLineColOn("custom") && (
                    <td className="px-3 py-2">
                      <CustomFields
                        compact
                        value={l.custom}
                        onChange={(next) => updateLine(l.key, { custom: next })}
                      />
                    </td>
                  )}
                  <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
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
            <span>
              {totals.thanhTien.toLocaleString("vi-VN")} {currency}
            </span>
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
          {pending
            ? "Đang lưu..."
            : mode === "edit"
              ? "Cập nhật đơn mua hàng"
              : "Tạo đơn mua hàng"}
        </button>
      </div>
    </form>
  );
}
