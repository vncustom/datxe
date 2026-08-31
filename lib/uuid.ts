import { createHash } from "node:crypto";

// UUID v5 (SHA-1, dựa trên namespace). Dùng để 2 CSDL (local + cloud) sinh
// CÙNG một id cho các bản ghi "gốc" (user theo username, xe theo biển số),
// nhờ vậy quan hệ và đồng bộ bám theo id mà không cần ánh xạ.
const NAMESPACE = "7b5e6c1a-2d3f-4a8b-9c0d-1e2f3a4b5c6d";

export function uuidv5(name: string, namespace: string = NAMESPACE): string {
  const nsHex = namespace.replace(/-/g, "");
  const bytes = Buffer.concat([
    Buffer.from(nsHex, "hex"),
    Buffer.from(name, "utf8"),
  ]);
  const h = createHash("sha1").update(bytes).digest();
  h[6] = (h[6] & 0x0f) | 0x50; // version 5
  h[8] = (h[8] & 0x3f) | 0x80; // variant RFC 4122
  const hex = h.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export const idFor = {
  user: (username: string) => uuidv5(`user:${username}`),
  vehicle: (plateNo: string) => uuidv5(`vehicle:${plateNo}`),
};
