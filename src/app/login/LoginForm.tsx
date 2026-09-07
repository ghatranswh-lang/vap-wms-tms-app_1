"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export default function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState(loginAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4 w-full max-w-sm">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Tên đăng nhập
        </label>
        <input
          name="username"
          type="text"
          required
          autoFocus
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Mật khẩu
        </label>
        <input
          name="password"
          type="password"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-orange-600 text-white py-2 text-sm font-semibold hover:bg-orange-700 disabled:opacity-60"
      >
        {pending ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
    </form>
  );
}
