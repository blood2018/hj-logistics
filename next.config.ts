import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 엑셀 양식 파일은 런타임에 fs로 읽으므로 배포 번들에 명시적으로 포함합니다.
  outputFileTracingIncludes: {
    "/admin/dispatch/export": ["./app/lib/excel-templates/files/**/*"],
    "/admin/dispatch/statement": ["./app/lib/excel-templates/files/**/*"],
  },
};

export default nextConfig;
