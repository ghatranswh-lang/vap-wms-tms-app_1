"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import SearchSelect from "@/components/SearchSelect";

type Option = { id: number; label: string };
type ItemOption = { id: number; maHang: string; tenHang: string };

export default function PoListFilters({
  suppliers,
  items,
}: {
  suppliers: Option[];
  items: ItemOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");
  const [supplierId, setSupplierId] = useState<number | "">(
    searchParams.get("supplierId") ? Number(searchParams.get("supplierId")) : ""
  );
  const [itemId, setItemId] = useState<number | "">(
    searchParams.get("itemId") ? Number(searchParams.get("itemId")) : ""
  );
  const [status, setStatus] = useState(searchParams.get("status") ?? "");

  const itemOptions = items.map((it) => ({
    id: it.id,
    label: `${it.maHang} — ${it.tenHang}`,
  }));

  function apply() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (supplierId) params.set("supplierId", String(supplierId));
    if (itemId) params.set("itemId", String(itemId));
    if (status) params.set("status", status);
    router.push(`/mua-hang${params.toString() ? `?${params}` : ""}`);
  }

  function clear() {
    setFrom("");
    setTo("");
    setSupplierId("");
    setItemId("");
    setStatus("");
    router.push("/mua-hang");
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 mb-4 grid grid-cols-5 gap-3 items-end">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Từ ngày</label>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Đến ngày</label>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Nhà cung cấp
        </label>
        <SearchSelect
          options={suppliers}
          value={supplierId}
          onChange={setSupplierId}
          placeholder="Tất cả"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Mã hàng</label>
        <SearchSelect
          options={itemOptions}
          value={itemId}
          onChange={setItemId}
          placeholder="Tất cả"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Trạng thái
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">Tất cả</option>
          <option value="full">Đã nhập đủ</option>
          <option value="partial">Chưa nhập đủ</option>
        </select>
      </div>
      <div className="col-span-5 flex gap-2">
        <button
          type="button"
          onClick={apply}
          className="rounded-md bg-orange-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-orange-700"
        >
          Lọc
        </button>
        <button
          type="button"
          onClick={clear}
          className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          Xoá lọc
        </button>
      </div>
    </div>
  );
}
