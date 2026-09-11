"use client";

// Danh sách trường tuỳ chỉnh dạng "Tên trường / Giá trị" — cho phép người dùng tự
// thêm thông tin bổ sung ngay trên chứng từ mà không cần sửa code (lưu vào cột
// jsonb "custom" ở DB). Dùng ở cả phần thông tin chung (header) lẫn từng dòng hàng.
export type CustomField = { key: string; value: string };

export default function CustomFields({
  value,
  onChange,
  compact = false,
}: {
  value: CustomField[];
  onChange: (next: CustomField[]) => void;
  compact?: boolean;
}) {
  function update(i: number, patch: Partial<CustomField>) {
    onChange(value.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...value, { key: "", value: "" }]);
  }

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      {value.map((f, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            placeholder="Tên trường"
            value={f.key}
            onChange={(e) => update(i, { key: e.target.value })}
            className="w-32 rounded-md border border-slate-300 px-2 py-1 text-xs"
          />
          <input
            placeholder="Giá trị"
            value={f.value}
            onChange={(e) => update(i, { value: e.target.value })}
            className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-slate-400 hover:text-red-600 text-xs"
            title="Xoá trường"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-xs text-orange-600 font-medium hover:text-orange-700"
      >
        + Thêm trường tuỳ chỉnh
      </button>
    </div>
  );
}
