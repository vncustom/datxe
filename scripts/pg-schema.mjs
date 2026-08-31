// Sinh prisma/schema.postgres.prisma từ prisma/schema.prisma (chỉ đổi khối datasource).
// Nguồn sự thật DUY NHẤT là schema.prisma; file postgres là sản phẩm sinh ra, không commit.
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "prisma/schema.prisma";
const OUT = "prisma/schema.postgres.prisma";

const src = readFileSync(SRC, "utf8");

const pgDatasource = `datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}`;

const out =
  "// TỰ SINH từ schema.prisma cho bản CLOUD (PostgreSQL/Supabase). KHÔNG sửa tay.\n\n" +
  src.replace(/datasource db \{[\s\S]*?\n\}/, pgDatasource);

writeFileSync(OUT, out);
console.log(`Đã ghi ${OUT}`);
