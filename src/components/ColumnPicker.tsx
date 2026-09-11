"use client";

import { useEffect, useRef, useState } from "react";

// Cho phép người dùng tự bật/tắt cột hiển thị trên 1 bảng danh sách — lưu lựa
// chọn vào localStorage của trình duyệt (riêng theo từng người dùng/máy), không
// cần cấu hình phía server. storageKey nên duy nhất theo từng màn (vd "cols:po-list").
export type ColumnDef = { key: string; label: string };

export function useVisibleColumns(storageKey: string, columns: ColumnDef[]) {
  const allKeys = columns.map((c) => c.key);
  const [visible, setVisible] = useState<Set<string>>(new Set(allKeys));
  const [loaded, setLoaded] = useState(false);
  // Theo dõi những cột đã "biết" (đã tính vào visible/localStorage) — cần cho
  // trường hợp danh sách cột thay đổi động, vd bảng dòng hàng PO chỉ có cột
  // Khu vực/Vị trí SAU KHI chọn kho có WMS (xem bên dưới).
  const knownKeysRef = useRef<Set<string>>(new Set(allKeys));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const arr: string[] = JSON.parse(raw);
        setVisible(new Set(arr.filter((k) => allKeys.includes(k))));
      }
    } catch {
      // localStorage không khả dụng — dùng mặc định hiện hết cột.
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Khi danh sách cột (columns) thay đổi sau khi đã mount — vd cột Khu vực/Vị
  // trí chỉ xuất hiện sau khi người dùng chọn kho có WMS — mặc định HIỆN cột
  // mới xuất hiện lần đầu, không để nó bị ẩn oan chỉ vì chưa có trong state
  // lúc khởi tạo. Cột đã "biết" từ trước (kể cả đã bị người dùng tắt) thì giữ
  // nguyên lựa chọn, không tự bật lại.
  useEffect(() => {
    const newKeys = allKeys.filter((k) => !knownKeysRef.current.has(k));
    if (newKeys.length > 0) {
      setVisible((prev) => {
        const next = new Set(prev);
        newKeys.forEach((k) => next.add(k));
        return next;
      });
      newKeys.forEach((k) => knownKeysRef.current.add(k));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allKeys.join("|")]);

  function toggle(key: string) {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        // bỏ qua nếu trình duyệt chặn localStorage
      }
      return next;
    });
  }

  return { visible, toggle, loaded };
}

export default function ColumnPicker({
  columns,
  visible,
  onToggle,
}: {
  columns: ColumnDef[];
  visible: Set<string>;
  onToggle: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
      >
        Cột hiển thị ▾
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-56 rounded-md border border-slate-200 bg-white shadow-lg p-2">
          {columns.map((c) => (
            <label
              key={c.key}
              className="flex items-center gap-2 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 rounded"
            >
              <input
                type="checkbox"
                checked={visible.has(c.key)}
                onChange={() => onToggle(c.key)}
              />
              {c.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
