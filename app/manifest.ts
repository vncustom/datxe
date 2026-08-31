import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Đặt xe Công tác HTV",
    short_name: "Đặt xe HTV",
    description: "Hệ thống quản lý đặt xe đi công tác",
    start_url: "/lich",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f7f6",
    theme_color: "#1f6f6b",
    lang: "vi",
  };
}
