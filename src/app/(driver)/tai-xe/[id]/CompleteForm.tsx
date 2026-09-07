"use client";

import { useActionState } from "react";
import { confirmCompleted, type TaiXeFormState } from "./actions";

export default function CompleteForm({ dispatchOrderId }: { dispatchOrderId: number }) {
  const [state, formAction, pending] = useActionState<TaiXeFormState, FormData>(
    confirmCompleted,
    {}
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="dispatchOrderId" value={dispatchOrderId} />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Đang xử lý..." : "Xác nhận hoàn thành"}
      </button>
    </form>
  );
}
