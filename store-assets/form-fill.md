# 디지털 발송 점검 — 개발자센터 입력 시트

기본정보/API 등록 값은 `../CAFE24-APP.md`에 있다. 이 문서는 그 값과 STEP 03(판매 정보)을 한 번에
옮겨 적기 위한 시트다. 값은 복사해 붙여넣고, 업로드 파일은 아래 표를 그대로 쓴다.

## 0. 제출 전 남은 항목

| 항목 | 상태 | 영향 |
|---|---|---|
| Cafe24 연동(OAuth·상품 조회) | 구현됨, **테스트몰에서 실제 실행 확인 필요** | 설치·상품 불러오기가 동작하지 않으면 심사 반려 |
| Client Secret 재발급 | **필요** (개발 중 채팅에 노출) | 재발급 후 Vercel env 교체 |
| 개인정보처리방침 | 구현됨 `/privacy` | 폼에 URL 입력 가능 |
| 요금 | **무료로 확정** | — |
| 카테고리 최종 선택 | 미정 (상품관리 권장) | 심사 카테고리 |
| 스크린샷·아이콘·배너 | 생성 완료(`store-assets/`) | 1MB 미만 확인됨 |

## 1. 기본정보 / API 정보

`../CAFE24-APP.md`의 표를 그대로 사용한다. 요약:

| 필드 | 입력값 |
|---|---|
| App URL | `https://cafe24-delivery-check.vercel.app/api/cafe24/launch` |
| 표시 방식 | 새 창 열기(기본값) |
| Redirect URI(s) | `https://cafe24-delivery-check.vercel.app/api/cafe24/oauth/callback` |
| 유형 | Web application (Authorization Code) |
| 타임존 | Asia/Seoul (UTC+09:00) |
| 운영자 권한확인 URI | 비움 |
| 쇼핑몰 운영자 권한 | 앱(Application) + **상품(Product) 읽기만** (`mall.read_product`) |
| 쇼핑몰 고객 권한 | 선택 안 함 |
| Front API / WebHook | 사용안함 / 미등록 |

Vercel 환경변수: `CAFE24_CLIENT_ID`, `CAFE24_CLIENT_SECRET`, `CAFE24_REDIRECT_URI`,
`CAFE24_SCOPES=mall.read_product`, `TOKEN_ENCRYPTION_KEY`.

`CAFE24_SCOPES`는 등록한 scope와 **순서·구분자까지 같아야** 한다. 다르면 403.

## 2. 판매 정보 (STEP 03 · 한국어)

`store-listing-copy.md`의 표를 그대로 넣는다. 요약:

| 입력란 | 입력값 |
|---|---|
| 앱 이름 | `디지털 발송 점검` |
| 카테고리 | 상품관리 계열 권장 |
| 소개 제목 | 발송 규칙이 빠진 디지털 상품, 한 번에 찾습니다 |
| 짧은 설명 | 몰 상품 목록과 발송 규칙을 대조해 규칙이 없거나 꺼진 디지털 상품을 표시합니다. |
| 샘플보기 | `https://cafe24-delivery-check.vercel.app/demo` |
| Support email | `kwan765@naver.com` |
| 가격 | 무료 |
| 개인정보처리방침 URL | `https://cafe24-delivery-check.vercel.app/privacy` |

핵심 기능·핵심포인트·연관검색어·FAQ는 `store-listing-copy.md` 참고.

## 3. 업로드 파일

| 폼 항목 | 파일 | 크기 |
|---|---|---|
| 앱 아이콘 | `store-assets/icon-512.png` | 512×512 |
| (보조 아이콘) | `store-assets/icon-256.png` | 256×256 |
| 앱 배너 | `store-assets/banner-740x416.png` | 740×416 |
| 스크린샷 PC | `store-assets/screenshots/pc-01-new-check.png` | 1920×1080 |
| 스크린샷 PC | `store-assets/screenshots/pc-02-demo-results.png` | 1920×1080 |
| 스크린샷 PC | `store-assets/screenshots/pc-03-check-result.png` | 1920×1080 |
| 스크린샷 모바일 | `store-assets/screenshots/mo-01-guide.png` | 360×640 |
| 스크린샷 모바일 | `store-assets/screenshots/mo-02-demo.png` | 360×640 |
| 스크린샷 모바일 | `store-assets/screenshots/mo-03-check-result.png` | 360×640 |
| 스토리 대표 이미지 | `store-assets/cover-store.png` | 444×320 |
| (초안) 대표 이미지 | `store-assets/cover.png` | 1200×675 |

## 4. 심사 제출 이메일 (`eco_bizops@cafe24corp.com`)

**제목**

```
[앱 심사] 디지털 발송 점검 — 테스트 방법 안내 (Client ID: ICIi7fVaDyEARcfvSbom4B)
```

**본문**

```
카페24 앱스토어 심사팀 담당자님께,

카페24 앱스토어 앱 심사를 요청드립니다. 테스트에 필요한 정보를 안내드립니다.

■ 앱 소개
몰의 디지털 상품 목록과 발송 규칙 설정을 대조해, 규칙이 없거나 비활성일 수 있는 상품을
찾아주는 설정 점검 도구입니다. 파일을 실제로 발송하지 않으며, 외부 규칙을 변경하지 않습니다.

■ 앱 정보
- 앱명: 디지털 발송 점검
- Client ID: ICIi7fVaDyEARcfvSbom4B
- 앱 URL: https://cafe24-delivery-check.vercel.app/api/cafe24/launch
- Redirect URI: https://cafe24-delivery-check.vercel.app/api/cafe24/oauth/callback
- 요청 권한: mall.read_product (상품 읽기)
- 요금: 무료
- 개인정보처리방침: https://cafe24-delivery-check.vercel.app/privacy

■ 테스트 몰 / 계정
- 테스트 몰: onnurimun.cafe24.com
- 테스트 관리자 계정: (제출 시 기재)

■ 테스트 방법 (약 2분)
1. 테스트 몰 관리자 로그인 → [앱] 메뉴 → 디지털 발송 점검 → 관리하기
2. OAuth 동의 화면에서 동의 → 새 점검 화면으로 이동
3. [Cafe24 상품 불러오기]를 누르면 몰 상품 목록이 채워집니다.
4. [점검 실행]을 누르면 상품별 판정이 표시됩니다.
5. 결과 화면에서 [체크리스트 CSV 내려받기]와 [규칙 서식 내려받기]를 확인할 수 있습니다.
   (상대경로 업로드 파일은 서버로 전송되지 않습니다.)

■ 확인 사항
- ① Redirect URI 일치: 개발자센터 등록값과 동일
- ② 인증코드 → 액세스토큰 교환: 콜백에서 교환 후 암호화 쿠키로 보관(서버 DB 미저장)
- ③ 갱신토큰 재발급: 만료 전 refresh
- ④ 최소 권한만 요청: mall.read_product

문의 사항이 있으면 이 메일로 회신 부탁드립니다. 감사합니다.
```

## 5. 사용자가 채워야 할 값

| 항목 | 값 |
|---|---|
| 테스트 관리자 계정 / 비밀번호 | (제출 메일에 기재) |
| 카테고리 최종 선택 | |
| Client Secret 재발급 값 | Vercel `CAFE24_CLIENT_SECRET`에 설정 |
