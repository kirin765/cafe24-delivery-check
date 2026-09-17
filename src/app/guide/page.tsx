import Link from "next/link";

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-800">{children}</code>;
}

const VERDICTS: { verdict: string; meaning: string }[] = [
  { verdict: "설정 확인", meaning: "제공한 자료에서 이 상품/옵션에 적용되는 활성 규칙을 찾았습니다. 실제 발송 검증은 아닙니다." },
  { verdict: "발송 규칙 없음", meaning: "규칙 목록이 완전함을 확인했는데 이 상품/옵션에 적용되는 규칙이 없습니다. 외부 앱에서 확인·설정하세요." },
  { verdict: "설정 비활성", meaning: "규칙은 있지만 비활성 상태입니다. 외부 앱에서 활성화하세요." },
  { verdict: "중복/충돌 가능성", meaning: "활성 규칙이 여러 개이거나 우선순위·옵션 적용을 해석할 수 없습니다. 수동으로 확인하세요." },
  { verdict: "판정 불가", meaning: "목록이 불완전하거나, 자료가 오래됐거나, 수집시각이 없거나, 디지털 여부가 불명입니다." },
  { verdict: "점검 대상 제외", meaning: "운영자가 이 상품을 디지털 전달 대상이 아니라고 확인했습니다." },
];

export default function GuidePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h1 className="text-xl font-semibold text-slate-900">사용 안내</h1>
        <p className="mt-2 text-sm text-slate-600">
          이 도구는 몰의 디지털 상품 목록과 발송 규칙 설정을 대조해, <strong>규칙이 없거나 꺼져 있을 수 있는
          상품</strong>을 찾아줍니다. 발송 엔진이 아니며 파일을 실제로 보내지 않습니다.
        </p>
        <p className="mt-2 text-sm text-amber-700">
          “발송 규칙 없음”은 고객이 못 받았다는 뜻이 아닙니다. 발송 시스템 접수·통신사 전달·고객 수신·파일
          열람은 서로 다른 상태입니다.
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">준비물</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>몰의 <strong>상품 목록</strong> (Cafe24 앱 연동 또는 상품 export 업로드)</li>
          <li>외부 발송 서비스의 <strong>규칙 정보</strong> (규칙 export가 없으면 화면에서 확인해 서식에 기입)</li>
          <li>해당 자료가 <strong>완전한지</strong>, 언제 수집했는지, 출처가 무엇인지</li>
        </ul>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">4단계로 점검하기</h2>

        <ol className="mt-4 space-y-5 text-sm text-slate-700">
          <li>
            <h3 className="font-semibold text-slate-900">1. 상품 목록 가져오기</h3>
            <p className="mt-1 text-slate-600">
              <Link href="/checks/new" className="text-slate-900 underline">
                새 점검
              </Link>{" "}
              화면에서 두 가지 방법 중 하나를 씁니다.
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">
              <li>
                <strong>Cafe24</strong>: 관리자 [앱]에서 이 앱을 실행해 연결한 뒤 <em>Cafe24 상품 불러오기</em>.
              </li>
              <li>
                <strong>그 외 몰</strong>: 상품 export(CSV/XLSX)를 <em>상품 export 가져오기</em>에 올리고 열 매핑을
                확인합니다.
              </li>
            </ul>
          </li>

          <li>
            <h3 className="font-semibold text-slate-900">2. 디지털 상품 확인</h3>
            <p className="mt-1 text-slate-600">
              <Code>digital_confirmed</Code>는 <strong>운영자가 확인한 값</strong>입니다. 상품명으로 자동 분류하지
              않습니다. 전체가 디지털이면 고정값 <Code>yes</Code>, 섞여 있으면 <em>디지털 판정 열</em>에 분류 열과
              값(예: <Code>소분류 = eBook</Code>)을 지정합니다. 나머지는 <Code>no</Code>(점검 대상 제외) 또는{" "}
              <Code>unknown</Code>(판정 불가)으로 둡니다.
            </p>
          </li>

          <li>
            <h3 className="font-semibold text-slate-900">3. 발송 규칙과 근거 입력</h3>
            <p className="mt-1 text-slate-600">
              외부 서비스에 규칙 export가 있으면 그대로 올립니다. 없으면 점검을 한 번 실행한 뒤 결과 화면에서{" "}
              <strong>규칙 서식</strong>을 내려받아 상품별로 확인해 채웁니다.
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">
              <li>
                규칙이 있으면 <Code>rule_id</Code>를 실제 값으로, <Code>active</Code>를{" "}
                <Code>active</Code>/<Code>inactive</Code>로 바꿉니다.
              </li>
              <li>규칙이 없으면 그 행을 삭제합니다.</li>
              <li>
                모든 상품을 확인했으면 <strong>근거 서식</strong>의 <Code>complete</Code>를 <Code>yes</Code>로
                바꾸고 <Code>collected_at</Code>·<Code>source</Code>·<Code>confirmed_by</Code>를 채웁니다.
              </li>
            </ul>
          </li>

          <li>
            <h3 className="font-semibold text-slate-900">4. 점검 실행 → 수정 → 재점검</h3>
            <p className="mt-1 text-slate-600">
              <Code>점검 실행</Code> 후 판정을 읽고, <em>체크리스트 CSV</em>를 내려받아 외부 앱에서 수정합니다. 수정이
              끝나면 새 snapshot을 <em>새 자료로 재점검</em>에 넣어 이전/현재를 비교합니다. “수정했다고 메모함”과 “새
              자료로 설정 확인”은 다르게 표시됩니다.
            </p>
          </li>
        </ol>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">판정 읽기</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="py-2 pr-3">판정</th>
                <th className="py-2">의미</th>
              </tr>
            </thead>
            <tbody>
              {VERDICTS.map((row) => (
                <tr key={row.verdict} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-3 font-medium text-slate-900">{row.verdict}</td>
                  <td className="py-2 text-slate-700">{row.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          목록이 불완전(<Code>complete=no</Code>)하거나 자료가 오래되면(기본 90일 초과) 규칙이 없어도 “발송 규칙
          없음”이 아니라 “판정 불가”로 표시됩니다.
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">자주 막히는 곳</h2>
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="font-medium text-slate-900">상품 번호가 비어 있거나 행이 건너뛰어짐</dt>
            <dd className="text-slate-600">
              상품 번호/코드 열과 상품명 열 매핑을 확인하세요. 자동 추정이 빈 열을 고르면 직접 바꿉니다.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">전부 “점검 대상 제외”로 나옴</dt>
            <dd className="text-slate-600">
              <Code>digital_confirmed</Code>가 <Code>no</Code>로 들어간 경우입니다. 디지털 판정 열/고정값을
              확인하세요. (예: 스마트스토어는 eBook 값이 <Code>세분류</Code>가 아니라 <Code>소분류</Code>에 있을 수
              있습니다.)
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">“판정 불가”만 나옴</dt>
            <dd className="text-slate-600">
              근거 서식의 <Code>complete</Code>가 <Code>no</Code>이거나 <Code>collected_at</Code>이 비었거나 너무
              오래됐습니다.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Cafe24에서 “연결되어 있지 않습니다”</dt>
            <dd className="text-slate-600">
              관리자 [앱]에서 이 앱을 실행해 연결하세요. 주소를 직접 입력해 접속하면 연결되지 않습니다.
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
        <h2 className="text-lg font-semibold text-slate-900">이 도구가 하지 않는 것</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>파일 실제 발송·재발송, 메시지 비용 지출, 발송 성공 보장</li>
          <li>고객 연락처·다운로드 링크 수집, 외부 규칙 자동 변경</li>
          <li>실시간 감시·자동 알림 (점검은 업로드 시점의 snapshot 판정입니다)</li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          CSV 서식 자세한 내용은 저장소의 README를 참고하세요. 업로드한 파일은 브라우저에서만 처리되며 서버로
          보내지 않습니다.
        </p>
      </section>
    </div>
  );
}
