import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h1 className="text-lg font-semibold text-slate-900">디지털 상품 발송 설정 점검</h1>
        <p className="mt-2 text-sm text-slate-600">
          몰별 디지털 상품 목록과 운영자가 제공한 발송 규칙 snapshot을 대조해, 확인이 필요한 누락·
          비활성·충돌 가능성을 찾아냅니다. 업로드 자료는 서버로 보내지 않습니다.
        </p>
        <p className="mt-2 text-sm text-amber-700">
          이 도구는 설정 자료 대조만 합니다. 메시지 도착·읽음·파일 열람을 보장하지 않으며, ‘누락 의심’을
          ‘배송 실패’로 표시하지 않습니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link
            href="/demo"
            className="rounded bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
          >
            합성 자료 데모 보기
          </Link>
          <Link
            href="/checks/new"
            className="rounded border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-100"
          >
            새 점검 시작
          </Link>
          <Link
            href="/guide"
            className="rounded border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-100"
          >
            사용 안내
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
          <h2 className="font-semibold text-slate-900">포함</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>몰·상품/옵션별 규칙 연결 여부</li>
            <li>규칙 활성 여부와 명시된 적용 범위</li>
            <li>자료 완전성·수집시각·출처 기록</li>
            <li>수정 체크리스트와 snapshot 재점검 비교</li>
          </ul>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
          <h2 className="font-semibold text-slate-900">제외</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>파일 실제 발송·재발송, 메시지 비용</li>
            <li>고객 연락처·다운로드 링크 수집</li>
            <li>외부 규칙 자동 변경</li>
            <li>실시간 감시·자동 알림</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
