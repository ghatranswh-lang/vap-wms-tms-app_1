"use client";

import { useEffect, useMemo, useRef, useState, type ClipboardEvent } from "react";

export type SearchSelectOption = { id: number; label: string };

// Ô chọn có tìm kiếm — dùng thay cho <select> khi danh sách dài (NCC, mã hàng,
// khách hàng...). Gõ để lọc theo nội dung (không phân biệt hoa/thường, có dấu
// hay không dấu đều lọc được), bấm chọn 1 dòng trong danh sách xổ xuống.
function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function SearchSelect({
  options,
  value,
  onChange,
  placeholder = "— Chọn —",
  emptyText = "Không tìm thấy kết quả",
  onPaste,
}: {
  options: SearchSelectOption[];
  value: number | "";
  onChange: (id: number | "") => void;
  placeholder?: string;
  emptyText?: string;
  // Cho phép nơi dùng SearchSelect (vd bảng dòng hàng PO) bắt sự kiện dán —
  // dùng để hỗ trợ dán nhiều dòng copy từ Excel. Nếu handler gọi
  // preventDefault(), giá trị dán sẽ KHÔNG được đưa vào ô tìm kiếm.
  onPaste?: (e: ClipboardEvent<HTMLInputElement>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => options.find((o) => o.id === value) ?? null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return options.slice(0, 50);
    return options.filter((o) => normalize(o.label).includes(q)).slice(0, 50);
  }, [options, query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        value={open ? query : selected?.label ?? ""}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onPaste={onPaste}
        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {selected && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
                setQuery("");
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-50 border-b border-slate-100"
            >
              — Bỏ chọn —
            </button>
          )}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-400">{emptyText}</div>
          )}
          {filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                onChange(o.id);
                setOpen(false);
                setQuery("");
              }}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-orange-50 ${
                o.id === value ? "bg-orange-50 text-orange-700 font-medium" : "text-slate-700"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
