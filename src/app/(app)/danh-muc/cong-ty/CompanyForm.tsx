"use client";

import { useActionState } from "react";
import { createCompany } from "./actions";

export default function CompanyForm() {
  const [state, formAction, pending] = useActionState(createCompany, {});

  return (
    <form
      action={formAction}
      className="rounded-lg border border-slate-200 bg-white p-4 grid grid-cols-2 gap-3 mb-6"
    >
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Mã
        </label>
        <input
          name="code"
          required
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Tên
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
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="isInternal" defaultChecked />
        Pháp nhân nội bộ Việt An Pha (bỏ tick nếu là khách thuê kho 3PL)
      </label>
      <div className="col-span-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-orange-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-orange-700 disabled:opacity-60"
        >
          {pending ? "Đang lưu..." : "+ Thêm công ty"}
        </button>
        {state?.error && (
          <span className="text-sm text-red-600">{state.error}</span>
        )}
      </div>
    </form>
  );
}
