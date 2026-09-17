# 앱 심사 요청 메일 초안

첫 제출용. 본문 원본은 `review-submit-email.template.txt`이고, 테스트 계정 값은 **커밋하지 않고**
env에서 채운다. `form-fill.md`(개발자센터 입력값)·`store-listing-copy.md`(판매 정보)와 함께 쓴다.

- 받는 사람: `eco_bizops@cafe24corp.com`
- 참조: (담당자 있으면 추가)
- 보내는 사람: `kwan765@naver.com`

## 테스트 계정 값 채우기

템플릿의 `{{TEST_ADMIN_ID}}` / `{{TEST_ADMIN_PW}}` / `{{TEST_MALL}}`는 아래 순서로 채운다.

1. `.env`(커밋 금지, `.gitignore`에 포함)에 `TEST_ADMIN_ID`, `TEST_ADMIN_PW`, `TEST_MALL`을 넣는다.
2. 렌더링:

```bash
node --env-file=.env scripts/render-review-email.mjs            # 표준 출력
node --env-file=.env scripts/render-review-email.mjs /tmp/review-email.txt   # 파일로
```

env가 없으면 `~/.config/cafe24/credentials.json`(`username`/`password`)을 대신 읽는다.
비밀번호는 저장소·메일에 하드코딩하지 않는다.

**제목**

```
[앱 심사] 디지털 발송 점검 — 앱 심사 요청 및 테스트 안내 (Client ID: ICIi7fVaDyEARcfvSbom4B)
```

**본문**

```
카페24 앱스토어 심사 담당자님께,

카페24 앱스토어 앱 심사를 요청드립니다. 테스트에 필요한 정보를 안내드립니다.

■ 앱 소개
몰의 디지털 상품 목록과 발송 규칙 설정을 대조해, 규칙이 없거나 비활성일 수 있는 상품을
찾아주는 설정 점검 도구입니다. 디지털 상품은 외부 발송 서비스의 규칙으로 파일이 나가는데,
상품은 판매 중인데 규칙이 없거나 꺼져 있으면 파일이 나가지 않습니다. 상품이 많으면 눈으로
하나씩 확인하기 어려워, 이 앱이 확인이 필요한 상품을 표시하고 수정 체크리스트를 만들어 줍니다.

■ 하지 않는 것
- 파일 실제 발송·재발송, 발송 성공 보장, 메시지 비용 지출
- 고객 연락처·다운로드 링크 수집, 외부 발송 설정 자동 변경
- 실시간 감시·자동 알림

■ 앱 정보
- 앱명: 디지털 발송 점검
- Client ID: ICIi7fVaDyEARcfvSbom4B
- 앱 URL: https://cafe24-delivery-check.vercel.app/api/cafe24/launch
- Redirect URI: https://cafe24-delivery-check.vercel.app/api/cafe24/oauth/callback
- 요청 권한: mall.read_product (상품 읽기) — 상품 목록 조회에만 사용
- 요금: 무료
- 개인정보처리방침: https://cafe24-delivery-check.vercel.app/privacy

■ 테스트 몰 / 계정
- 테스트 몰: {{TEST_MALL}}.cafe24.com
- 테스트 관리자 계정: {{TEST_ADMIN_ID}} / {{TEST_ADMIN_PW}}

■ 테스트 방법 (약 3분)
1. 테스트 몰 관리자 로그인 → [앱] 메뉴 → 디지털 발송 점검 → 관리하기
2. OAuth 동의 화면에서 동의 → 새 점검 화면으로 이동합니다.
3. [Cafe24 상품 불러오기]를 누르면 몰 상품 목록이 채워집니다.
4. [점검 실행]을 누르면 상품별 판정이 표시됩니다.
5. 결과 화면에서 [체크리스트 CSV 내려받기], [규칙 서식 내려받기]를 확인할 수 있습니다.
   업로드한 파일은 브라우저에서만 처리되며 서버로 전송되지 않습니다.
6. 예시는 [사용 안내]와 /demo(합성 자료)에서 확인할 수 있습니다.

■ 심사 체크리스트 구현 사항
- ① Redirect URI 일치: 개발자센터 등록값과 동일
- ② 인증코드 → 액세스토큰 교환: 콜백에서 교환 후 AES-GCM 암호화 httpOnly 쿠키로 보관
     (서버 데이터베이스에 저장하지 않습니다)
- ③ 갱신토큰 재발급: 만료 전 refresh 처리
- ④ 최소 권한만 요청: mall.read_product (상품 읽기)

문의 사항이 있으면 이 메일로 회신 부탁드립니다. 감사합니다.
```

## 발송 전 체크리스트

- [ ] **테스트몰에서 실제로 앱 실행 → OAuth 동의 → 상품 불러오기까지 확인** (미확인이면 심사 반려 위험)
- [ ] Client Secret 재발급 후 Vercel `CAFE24_CLIENT_SECRET` 교체·재배포
- [ ] 개발자센터 판매 정보 입력(`form-fill.md`)과 업로드 파일 등록
- [ ] `.env`에 `TEST_ADMIN_ID` / `TEST_ADMIN_PW` / `TEST_MALL` 설정 후 `pnpm run review-email`로 본문 생성
- [ ] 가능하면 심사 전용 임시 관리자 계정을 따로 만들어 그 값을 사용(메일에 비밀번호가 남으므로)
- [ ] 받는 사람 주소(`eco_bizops@cafe24corp.com`) 확인
- [ ] 카테고리 확정 (상품관리 계열 권장)
- [ ] 제출 후 개발자센터에서 심사 상태 확인

## 발송 이력

- 2026-09-17 `eco_bizops@cafe24corp.com`으로 발송. 본문은 템플릿에서 렌더링했고 비밀번호는 저장소에 남기지 않았다.
- 발송 전 OAuth 실사용 확인은 완료하지 않았다(테스트몰 실행 확인 필요).
