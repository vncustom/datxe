/**
 * Dữ liệu mẫu để xem thử luồng M1. Chạy lại được nhiều lần (xoá demo cũ trước).
 *   node_modules/.bin/tsx scripts/seed-demo.mts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DEMO_TAG = "__demo__";
const pad = (n: number) => String(n).padStart(2, "0");

function vnInstant(daysFromToday: number, hour: number, minute = 0): Date {
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  const k = d.toISOString().slice(0, 10);
  return new Date(`${k}T${pad(hour)}:${pad(minute)}:00+07:00`);
}

async function nextCode(now = new Date()): Promise<string> {
  const year = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
  }).format(now);
  const prefix = `HTV-L-${year}-`;
  const last = await prisma.booking.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  const n = last ? Number(last.code.slice(prefix.length)) + 1 : 1;
  return prefix + String(n).padStart(6, "0");
}

async function main() {
  // Xoá demo cũ (kèm bảng con)
  const old = await prisma.booking.findMany({
    where: { createdBy: DEMO_TAG },
    select: { id: true },
  });
  const ids = old.map((o) => o.id);
  if (ids.length) {
    await prisma.bookingApproval.deleteMany({ where: { bookingId: { in: ids } } });
    await prisma.bookingDispatch.deleteMany({ where: { bookingId: { in: ids } } });
    await prisma.tripLog.deleteMany({ where: { bookingId: { in: ids } } });
    await prisma.booking.deleteMany({ where: { id: { in: ids } } });
  }

  const requester = await prisma.user.findFirst({
    where: { dsBan: "TT Tin Tức", role: "nhan_vien" },
  });
  const approver = await prisma.user.findFirst({
    where: { dsBan: "TT Tin Tức", role: { in: ["truong_ban", "pho_ban"] } },
  });
  const driver1 = await prisma.user.findUnique({ where: { username: "laixe1" } });
  const driver2 = await prisma.user.findUnique({ where: { username: "laixe2" } });
  const toTruong = await prisma.user.findUnique({ where: { username: "huynhvantuan" } });
  const vehicles = await prisma.vehicle.findMany({ orderBy: { name: "asc" } });

  if (!requester || !approver || !driver1 || !driver2 || !toTruong || vehicles.length < 2) {
    throw new Error("Thiếu dữ liệu seed gốc — chạy `npm run db:seed` trước.");
  }

  const base = {
    requesterUsername: requester.username,
    donViYeuCau: "TT Tin Tức",
    diemXuatPhat: "HTV",
    createdBy: DEMO_TAG,
    updatedBy: DEMO_TAG,
    originNode: "local",
  };

  // 1. Chờ Ban duyệt
  await prisma.booking.create({
    data: {
      ...base,
      code: await nextCode(),
      startTime: vnInstant(1, 8),
      endTime: vnInstant(1, 10),
      diemDen: "UBND TP",
      noiDung: "Quay tin họp báo",
      bienTap: "Lê Kiều Nga",
      quayPhim: "Nguyễn Tấn Hoàng",
      soNguoi: 3,
      status: "cho_ban_duyet",
    },
  });

  // 2. Ban đã duyệt -> chờ Đội xe
  const b2 = await prisma.booking.create({
    data: {
      ...base,
      code: await nextCode(),
      startTime: vnInstant(1, 14),
      endTime: vnInstant(1, 16),
      diemDen: "Sân bay Tân Sơn Nhất",
      noiDung: "Đón đoàn công tác",
      soNguoi: 4,
      status: "cho_doi_xe",
    },
  });
  await prisma.bookingApproval.create({
    data: {
      bookingId: b2.id,
      approverUsername: approver.username,
      quyetDinh: "duyet",
      updatedBy: approver.username,
      originNode: "local",
    },
  });

  // 3 & 4. Đã điều xe
  for (const [i, [d, veh]] of [
    [driver1, vehicles[0]],
    [driver2, vehicles[3] ?? vehicles[1]],
  ].entries() as IterableIterator<[number, [typeof driver1, (typeof vehicles)[number]]]>) {
    const bk = await prisma.booking.create({
      data: {
        ...base,
        code: await nextCode(),
        startTime: vnInstant(2, 7 + i * 2, 30),
        endTime: i === 0 ? null : vnInstant(2, 12),
        diemDen: i === 0 ? "Quận 7" : "Củ Chi",
        noiDung: i === 0 ? "Quay phóng sự" : "Quay tư liệu ngoại thành",
        soNguoi: 2 + i,
        status: "da_dieu_xe",
      },
    });
    await prisma.bookingApproval.create({
      data: {
        bookingId: bk.id,
        approverUsername: approver.username,
        quyetDinh: "duyet",
        updatedBy: approver.username,
        originNode: "local",
      },
    });
    await prisma.bookingDispatch.create({
      data: {
        bookingId: bk.id,
        vehicleId: veh.id,
        driverUsername: d!.username,
        ghiChuDoiXe: i === 0 ? "Đổ đầy bình trước khi đi" : null,
        dispatchedBy: toTruong.username,
        updatedBy: toTruong.username,
        originNode: "local",
      },
    });
  }

  // 5. Ban từ chối
  const b5 = await prisma.booking.create({
    data: {
      ...base,
      code: await nextCode(),
      startTime: vnInstant(1, 6),
      diemDen: "Vũng Tàu",
      noiDung: "Việc cá nhân",
      status: "ban_tu_choi",
    },
  });
  await prisma.bookingApproval.create({
    data: {
      bookingId: b5.id,
      approverUsername: approver.username,
      quyetDinh: "tu_choi",
      ghiChu: "Không thuộc công tác của đơn vị",
      updatedBy: approver.username,
      originNode: "local",
    },
  });

  // 6. Đơn phát sinh do lái xe tạo -> chờ Đội xe
  await prisma.booking.create({
    data: {
      ...base,
      requesterUsername: driver1.username,
      code: await nextCode(),
      startTime: vnInstant(0, 15),
      diemDen: "Cây xăng Điện Biên Phủ",
      noiDung: "Đổ xăng xe",
      isPhatSinh: true,
      status: "cho_doi_xe",
      createdBy: DEMO_TAG,
    },
  });

  // 7. Chuỗi chuyến đã đóng trên Mitsubishi Triton — tạo khoảng trống công-tơ-mét
  const triton = vehicles[0];
  const closedTrips = [
    { odoStart: 12000, odoEnd: 12085, day: -4, den: "Bình Chánh", nd: "Quay ngoại cảnh" },
    { odoStart: 12140, odoEnd: 12220, day: -2, den: "Hóc Môn", nd: "Quay tư liệu" },
  ];
  for (const c of closedTrips) {
    const bk = await prisma.booking.create({
      data: {
        ...base,
        code: await nextCode(),
        startTime: vnInstant(c.day, 8),
        endTime: vnInstant(c.day, 12),
        diemDen: c.den,
        noiDung: c.nd,
        status: "hoan_thanh",
      },
    });
    await prisma.bookingApproval.create({
      data: {
        bookingId: bk.id,
        approverUsername: approver.username,
        quyetDinh: "duyet",
        updatedBy: approver.username,
        originNode: "local",
      },
    });
    await prisma.bookingDispatch.create({
      data: {
        bookingId: bk.id,
        vehicleId: triton.id,
        driverUsername: driver1.username,
        dispatchedBy: toTruong.username,
        updatedBy: toTruong.username,
        originNode: "local",
      },
    });
    await prisma.tripLog.create({
      data: {
        bookingId: bk.id,
        driverUsername: driver1.username,
        odoStart: c.odoStart,
        odoEnd: c.odoEnd,
        soKm: c.odoEnd - c.odoStart,
        gioXuatBen: vnInstant(c.day, 8),
        gioKetThuc: vnInstant(c.day, 12),
        daDongChuyen: true,
        updatedBy: driver1.username,
        originNode: "local",
      },
    });
    await prisma.odometerEvent.createMany({
      data: [
        { vehicleId: triton.id, bookingId: bk.id, loai: "start", odoValue: c.odoStart, byUsername: driver1.username, originNode: "local" },
        { vehicleId: triton.id, bookingId: bk.id, loai: "end", odoValue: c.odoEnd, byUsername: driver1.username, originNode: "local" },
      ],
    });
  }
  await prisma.vehicle.update({
    where: { id: triton.id },
    data: { currentOdometer: 12220 },
  });

  // 8. Chuyến đang chạy trên Toyota Hiace
  const hiace = vehicles[2];
  await prisma.vehicle.update({
    where: { id: hiace.id },
    data: { currentOdometer: 30500 },
  });
  const running = await prisma.booking.create({
    data: {
      ...base,
      code: await nextCode(),
      startTime: vnInstant(0, 9),
      endTime: vnInstant(0, 13),
      diemDen: "Long An",
      noiDung: "Quay phóng sự dài ngày",
      status: "dang_chay",
    },
  });
  await prisma.bookingApproval.create({
    data: {
      bookingId: running.id,
      approverUsername: approver.username,
      quyetDinh: "duyet",
      updatedBy: approver.username,
      originNode: "local",
    },
  });
  await prisma.bookingDispatch.create({
    data: {
      bookingId: running.id,
      vehicleId: hiace.id,
      driverUsername: driver2.username,
      dispatchedBy: toTruong.username,
      updatedBy: toTruong.username,
      originNode: "local",
    },
  });
  await prisma.tripLog.create({
    data: {
      bookingId: running.id,
      driverUsername: driver2.username,
      odoStart: 30500,
      gioXuatBen: vnInstant(0, 9),
      daDongChuyen: false,
      updatedBy: driver2.username,
      originNode: "local",
    },
  });
  await prisma.odometerEvent.create({
    data: { vehicleId: hiace.id, bookingId: running.id, loai: "start", odoValue: 30500, byUsername: driver2.username, originNode: "local" },
  });

  const total = await prisma.booking.count({ where: { createdBy: DEMO_TAG } });
  console.log(`Đã tạo ${total} đơn demo (createdBy = ${DEMO_TAG}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
