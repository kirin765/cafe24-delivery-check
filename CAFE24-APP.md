# Cafe24 앱 등록 입력 시트 (등록 보류)

- 상태: **등록 보류** — `plan.md` §6(연동 전 확인)과 §2(중단 조건)에 따라, 1차 수동 CSV 감사의 가치를
  먼저 검증한다. 현재 배포본에는 `launch`/`oauth/callback` 엔드포인트가 없어 지금 등록하면 Redirect
  URI가 404가 된다.
- Client ID: `ICIi7fVaDyEARcfvSbom4B` (2026-09-16 생성, 공개 식별자)
- Client Secret: 이 문서에 저장하지 않음. 채팅에 노출됐으므로 개발자센터에서 **재발급 필요**.
- 참고 관례: `../cafe24-return-photo/store-assets/form-fill.md`

## 등록 시 입력값

| 필드 | 입력값 |
|---|---|
| App URL | `https://cafe24-delivery-check.vercel.app/checks/new` (launch 구현 시 `/api/cafe24/launch`) |
| 표시 방식 | 새 창 열기(기본값) |
| Redirect URI(s) | `https://cafe24-delivery-check.vercel.app/api/cafe24/oauth/callback` |
| 유형 | Web application (Authorization Code) |
| 타임존 | Asia/Seoul (UTC+09:00) |
| 운영자 권한확인 URI | 비움 (운영자별 권한 제어 미구현) |
| 쇼핑몰 운영자 권한 | 앱(Application) + **상품(Product) 읽기만** |
| 쇼핑몰 고객 권한 | **선택 안 함** (고객 식별자 해제) |
| Front API | 사용안함 |
| WebHook | 미등록 (수신 엔드포인트 미구현) |

권한 scope 코드는 등록 화면의 "API Scope 목록"에서 확인해 `mall.read_product`(상품 읽기)와
`mall.read_application`(앱 설치 정보)만 남긴다. `mall.read_application`도 자동 포함이 아니므로
직접 선택해야 한다. "권한선택 (쇼핑몰 고객)"의 `고객 식별자(Customer Identifier)`는 `plan.md` §3에서
연락처·식별자 수집을 제외했으므로 선택하지 않는다.

등록한 scope 목록은 순서·구분자까지 `CAFE24_SCOPES` 환경변수 값과 **정확히 같아야** 한다. 다르면
403(`insufficient_scope`)이 난다. 구현 시 구분자를 고정하고 `CAFE24-APP.md`에 함께 기록한다.

## 등록 전에 필요한 구현 (plan §6)

- [ ] `/api/cafe24/launch` — 서명·timestamp 검증
- [ ] `/api/cafe24/oauth/callback` — 인증코드→토큰 교환, 앱 전용 토큰 암호화 저장, tenant 격리
- [ ] 최소 scope 환경변수 일치(`CAFE24_CLIENT_ID` / `CAFE24_CLIENT_SECRET` / `CAFE24_SCOPES`)
- [ ] 갱신 토큰 재발급, 전체 query 보존
- [ ] 상품 조회가 디지털 상품 식별에 무엇을 주는지 확인 (이름 기반 자동 분류 금지, plan §4)

## 등록으로 답할 질문

- 공식 export/API가 운영자의 수동 입력 시간을 실제로 줄이는가.
- 외부 발송 서비스 설정을 합법·안정적으로 읽을 수 있는가. 불가하면 이 도구는 수동 입력을 유지한다.
- 주문 데이터만으로 규칙 누락·도착 여부를 판단할 수 없는 한계가 유지되는가 (plan §1).

## 보안

- Client Secret은 재발급 후 Vercel 환경변수에만 저장한다. repo·CSV·채팅·문서에 남기지 않는다.
- 타 서비스의 비밀키·세션 쿠키·개인 다운로드 링크를 입력으로 받지 않는다 (plan §6).
