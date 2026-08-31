import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const raw = sp.next;
  const next = typeof raw === "string" && raw.startsWith("/") ? raw : "/lich";

  return (
    <div className="grid min-h-full place-items-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            Đài Truyền hình
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">
            Đặt xe Công tác
          </h1>
        </div>
        <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
          <LoginForm next={next} />
        </div>
        <p className="mt-4 text-center text-xs text-muted">
          Chưa có tài khoản? Liên hệ quản trị. Mật khẩu mặc định: 123456
        </p>
      </div>
    </div>
  );
}
