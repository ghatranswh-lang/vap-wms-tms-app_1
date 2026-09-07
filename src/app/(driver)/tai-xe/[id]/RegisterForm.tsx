"use client";

import { useActionState } from "react";
import { registerVehicle, type TaiXeFormState } from "./actions";

export default function RegisterForm({ dispatchOrderId }: { dispatchOrderId: number }) {
  const [state, formAction, pending] = useActionState<TaiXeFormState, FormData>(
    registerVehicle,
    {}
  );

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <input type="hidden" name="dispatchOrderId" value={dispatchOrderId} />
      <h2 className="font-semibold text-slate-900">Đăng ký xe nhận đơn</h2>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Số xe</label>
        <input
          name="soXe"
          required
          className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm font-mono uppercase"
          onInput={(e) => {
            const el = e.currentTarget;
            el.value = el.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
          }}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Tên tài xế</label>
        <input name="tenTaiXe" required className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Số CCCD</label>
        <input name="soCccd" className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          Số lượng chở (KG, tuỳ chọn)
        </label>
        <input
          type="number"
          min={0}
          name="qty"
          className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-orange-600 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-700 disabled:opacity-60"
      >
        {pending ? "Đang lưu..." : "Đăng ký"}
      </button>
    </form>
  );
}
