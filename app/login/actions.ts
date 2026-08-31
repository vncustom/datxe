"use server";

import { redirect } from "next/navigation";
import { login } from "@/lib/auth";

export async function loginAction(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/lich");

  if (!username || !password) return "Nhập tên đăng nhập và mật khẩu.";

  const session = await login(username, password);
  if (!session) return "Sai tên đăng nhập hoặc mật khẩu.";

  redirect(next.startsWith("/") ? next : "/lich");
}
