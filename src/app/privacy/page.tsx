export default function PrivacyPage() {
  return (
    <div className="space-y-4 text-sm text-slate-700">
      <h1 className="text-xl font-semibold text-slate-900">개인정보처리방침</h1>
      <p className="text-slate-500">최종 갱신: 2026-09-17</p>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900">1. 처리하는 정보</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>업로드한 파일</strong>: 상품 목록·규칙·근거 CSV/XLSX. 브라우저에서만 파싱하며 서버로
            전송하거나 저장하지 않습니다.
          </li>
          <li>
            <strong>점검 결과</strong>: 브라우저 localStorage에만 저장됩니다. 서버에 저장하지 않습니다.
          </li>
          <li>
            <strong>Cafe24 연동 시</strong>: 상품 목록은 앱을 실행한 몰의 관리자 권한으로 조회하며(최소 권한{" "}
            <code>mall.read_product</code>), 발급된 액세스·갱신 토큰은 암호화된 httpOnly 쿠키로만 보관합니다.
            서버 데이터베이스에 저장하지 않습니다.
          </li>
        </ul>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900">2. 수집하지 않는 정보</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>고객 이름·연락처·이메일·주소 등 개인 식별 정보</li>
          <li>고객 다운로드 링크, 외부 발송 서비스의 비밀키·세션 쿠키</li>
          <li>결제 정보, 메시지 발송 내용</li>
        </ul>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900">3. 보관과 파기</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Cafe24 토큰 쿠키는 앱을 실행한 브라우저에만 존재하며, 로그아웃하거나 쿠키를 삭제하면 사라집니다.</li>
          <li>업로드 파일과 점검 결과는 사용자의 브라우저를 벗어나지 않으므로 서버에 남지 않습니다.</li>
        </ul>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900">4. 제3자 제공</h2>
        <p className="mt-2">
          수집한 정보를 제3자에게 제공하지 않습니다. 앱은 상품 목록을 읽어 설정 누락을 표시할 뿐, 파일을 실제로
          발송하거나 외부 설정을 변경하지 않습니다.
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900">5. 문의</h2>
        <p className="mt-2">
          개인정보 관련 문의: <a className="underline" href="mailto:kwan765@naver.com">kwan765@naver.com</a>
        </p>
      </section>
    </div>
  );
}
