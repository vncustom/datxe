import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "datxe_session";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-only-insecure-secret",
);

export type Session = {
  username: string;
  fullName: string;
  role: string;
  isDriver: boolean;
  dsBan: string | null;
};

export async function signSession(s: Session): Promise<string> {
  return new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      username: String(payload.username),
      fullName: String(payload.fullName),
      role: String(payload.role),
      isDriver: Boolean(payload.isDriver),
      dsBan: (payload.dsBan as string | null) ?? null,
    };
  } catch {
    return null;
  }
}
