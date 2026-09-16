import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "디지털 상품 발송 설정 점검",
  description: "몰별 디지털 상품 목록과 발송 규칙 snapshot을 대조하는 설정 점검 도구",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3">
            <Link href="/" className="text-sm font-semibold text-slate-900">
              디지털 상품 발송 설정 점검
            </Link>
            <nav className="flex gap-3 text-sm text-slate-600">
              <Link href="/demo" className="hover:text-slate-900">
                데모
              </Link>
              <Link href="/checks/new" className="hover:text-slate-900">
                새 점검
              </Link>
            </nav>
            <span className="ml-auto text-xs text-slate-500">
              업로드 자료는 브라우저에서만 처리됩니다 · 실제 발송 검증 아님
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
