"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export default function LoginForm({ next }: { next: string }) {
  const [error, action, pending] = useActionState(loginAction, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-foreground">Tên đăng nhập</span>
        <input
          name="username"
          autoComplete="username"
          autoFocus
          required
          className="rounded-md border border-line px-3 py-2 text-base outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-foreground">Mật khẩu</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-line px-3 py-2 text-base outline-none focus:border-accent"
        />
      </label>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>
    </form>
  );
}
