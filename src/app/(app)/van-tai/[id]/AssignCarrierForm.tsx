"use client";

import { useActionState, useState } from "react";
import { assignCarrier, type AssignCarrierState } from "./actions";

type Carrier = { id: number; name: string };

export default function AssignCarrierForm({
  dispatchOrderId,
  carriers,
  currentCarrierId,
  currentCuocVanChuyen,
}: {
  dispatchOrderId: number;
  carriers: Carrier[];
  currentCarrierId: number | null;
  currentCuocVanChuyen: string | null;
}) {
  const [state, formAction, pending] = useActionState<AssignCarrierState, FormData>(
    assignCarrier,
    {}
  );
  const [carrierId, setCarrierId] = useState<number | "">(currentCarrierId ?? "");
  const [cuoc, setCuoc] = useState(currentCuocVanChuyen ?? "");

  return (
    <form action={formAction} className="rounded-lg border border-slate-200 bg-white p-4 flex flex-col gap-3">
      <input type="hidden" name="dispatchOrderId" value={dispatchOrderId} />
      <h2 className="font-semibold text-slate-900 text-sm">Gán đơn vị vận tải</h2>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Đơn vị vận tải</label>
        <select
          name="carrierId"
          value={carrierId}
          onChange={(e) => setCarrierId(e.target.value ? Number(e.target.value) : "")}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">— Chọn đơn vị —</option>
          {carriers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Cước vận chuyển</label>
        <input
          type="number"
          min={0}
          name="cuocVanChuyen"
          value={cuoc}
          onChange={(e) => setCuoc(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending || carrierId === ""}
        className="rounded-md bg-orange-600 text-white px-4 py-1.5 text-sm font-semibold hover:bg-orange-700 disabled:opacity-60"
      >
        {pending ? "Đang lưu..." : "Lưu"}
      </button>
    </form>
  );
}
