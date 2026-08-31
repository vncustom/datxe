import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import VehicleForm from "../../_components/VehicleForm";

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const s = await requireSession();
  if (!isAdmin(s))
    return <p className="text-sm text-muted">Trang này dành cho Quản trị.</p>;

  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle || vehicle.deletedAt) notFound();

  return <VehicleForm mode="edit" vehicle={vehicle} />;
}
