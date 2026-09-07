"use client";

import { useActionState } from "react";
import { createCarrier, type CarrierFormState } from "./actions";

export default function CarrierForm() {
  const initialState: CarrierFormState = {};
  const [state, formAction, pending] = useActionState(
    createCarrier,
    initialState
  );

  return (
    <form
      action={formAction}
      className="rounded-lg border border-slate-200 bg-white p-4 grid grid-cols-2 gap-3 mb-6"
    >
      <div className="col-span-2">
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Tên đơn vị vận tải
        </label>
        <input
          name="name"
          required
          placeholder="VD: Vận tải Thành Công"
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="is3pl" defaultChecked />
        Nhà xe thuê ngoài (3PL)
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="xeNoiBo" />
        Xe nội bộ Việt An Pha
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="khTuLay" />
        Khách hàng tự đến lấy hàng
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="xemCuoc" />
        Được xem báo cáo cước vận chuyển
      </label>
      <div className="col-span-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-orange-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-orange-700 disabled:opacity-60"
        >
          {pending ? "Đang lưu..." : "+ Thêm đơn vị vận tải"}
        </button>
        {state?.error && (
          <span className="text-sm text-red-600">{state.error}</span>
        )}
      </div>
    </form>
  );
}
