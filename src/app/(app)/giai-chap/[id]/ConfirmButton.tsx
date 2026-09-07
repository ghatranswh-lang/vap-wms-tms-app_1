"use client";

import { useActionState } from "react";
import { confirmCollateralRelease, type ConfirmGiaiChapState } from "./actions";

export default function ConfirmButton({ id }: { id: number }) {
  const [state, formAction, pending] = useActionState<ConfirmGiaiChapState, FormData>(
    confirmCollateralRelease,
    {}
  );

  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-orange-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-orange-700 disabled:opacity-60"
      >
        {pending ? "Đang xử lý..." : "Hoàn tất giải chấp"}
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
