import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  signSession,
  verifySession,
  type Session,
} from "@/lib/jwt";

export type { Session };

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
  // Bản local chạy `next start` (NODE_ENV=production) trên IP nội bộ qua HTTP.
  // Cookie có Secure sẽ bị trình duyệt loại trên http://<IP-máy> (không phải
  // secure context như localhost) -> mất session, văng ra /login mỗi lần chuyển
  // trang. Chỉ đặt Secure khi chạy cloud (Vercel = HTTPS); cho phép ép qua
  // COOKIE_SECURE=1/0 nếu về sau local có HTTPS.
  secure: process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === "1"
    : !!process.env.VERCEL,
};

/** Trả về Session nếu đúng mật khẩu, ngược lại null. */
export async function login(
  username: string,
  password: string,
): Promise<Session | null> {
  const user = await prisma.user.findUnique({
    where: { username: username.trim() },
  });
  if (!user || !user.isActive || user.deletedAt) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  const session: Session = {
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    isDriver: user.isDriver,
    dsBan: user.dsBan,
  };
  (await cookies()).set(SESSION_COOKIE, await signSession(session), COOKIE_OPTS);
  return session;
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
