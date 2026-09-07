"use client";

import { useActionState } from "react";
import { createSupplier, type SupplierFormState } from "./actions";

export default function SupplierForm() {
  const initialState: SupplierFormState = {};
  const [state, formAction, pending] = useActionState(
    createSupplier,
    initialState
  );

  return (
    <form
      action={formAction}
      className="rounded-lg border border-slate-200 bg-white p-4 grid grid-cols-2 gap-3 mb-6"
    >
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Mã NCC
        </label>
        <input
          name="maNcc"
          required
          placeholder="VD: NCC003"
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Tên nhà cung cấp
        </label>
        <input
          name="name"
          required
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          MST
        </label>
        <input
          name="mst"
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Địa chỉ
        </label>
        <input
          name="diaChi"
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div className="col-span-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-orange-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-orange-700 disabled:opacity-60"
        >
          {pending ? "Đang lưu..." : "+ Thêm nhà cung cấp"}
        </button>
        {state?.error && (
          <span className="text-sm text-red-600">{state.error}</span>
        )}
      </div>
    </form>
  );
}
