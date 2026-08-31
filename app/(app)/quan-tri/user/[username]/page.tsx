import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import UserForm from "../../_components/UserForm";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const s = await requireSession();
  if (!isAdmin(s))
    return <p className="text-sm text-muted">Trang này dành cho Quản trị.</p>;

  const { username } = await params;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || user.deletedAt) notFound();

  const bans = (
    await prisma.user.findMany({
      where: { deletedAt: null, dsBan: { not: null } },
      select: { dsBan: true },
      distinct: ["dsBan"],
      orderBy: { dsBan: "asc" },
    })
  ).map((r) => r.dsBan as string);

  return <UserForm mode="edit" user={user} bans={bans} />;
}
