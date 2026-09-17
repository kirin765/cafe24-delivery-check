# 디지털 상품 발송 설정 점검

몰별 디지털 상품 목록과 운영자가 제공한 발송 규칙 snapshot을 대조해 확인이 필요한 누락·비활성·충돌
가능성을 찾는 **설정 점검 도구**입니다. 발송 엔진이 아닙니다.

- 업로드 자료는 브라우저에서만 파싱하며 서버로 보내지 않습니다.
- 규칙 존재는 고객 수신을 의미하지 않고, 행 미발견은 발송 실패가 아닙니다.
- 파일 실제 발송·재발송, 메시지 비용, 고객 연락처/다운로드 링크 수집은 범위 밖입니다.

계획 원문은 `plan.md`를 참고하세요.

## 시작

```bash
mise install
pnpm install
pnpm dev            # http://localhost:3000
```

검증:

```bash
pnpm run verify     # lint + typecheck + test + build
pnpm run test:e2e   # build + next start + Playwright E2E (system chromium)
```

`test:e2e`는 `CHROME_PATH`(기본 `/usr/bin/chromium`)의 Chromium을 사용합니다. 브라우저를 내려받지
않습니다.

## 화면

| 경로 | 기능 |
|---|---|
| `/` | 범위 안내 |
| `/demo` | 합성 자료 데모. 완전/불완전/오래된 자료를 전환 |
| `/checks/new` | 상품·규칙·근거 CSV 입력, 상품 export 변환, 가져오기 오류·완전성 확인 |
| `/checks/[id]` | 몰별 판정·근거·수정 체크리스트·규칙 확인 서식·재점검 비교 |

점검 결과는 브라우저 `localStorage`에 저장됩니다. 서버 저장·로그인·Cafe24 조회는 아직 없습니다.

## CSV 입력 계약

모든 값은 UTF-8 CSV이며 첫 행은 헤더입니다. 파일이 아니라 붙여넣기도 됩니다.

### 상품 export 가져오기 (CSV/XLSX)

`/checks/new`의 "상품 export 가져오기"에서 몰 관리자의 상품 다운로드 파일(`.csv`/`.xlsx`/`.xls`)을
올리면 열을 자동 추정해 상품 목록 CSV로 변환합니다.

- 머리글 행과 각 열 매핑을 화면에서 확인·수정할 수 있습니다. 값이 채워진 열을 우선하므로 빈 식별자 열
  (예: 스마트스토어 `그룹상품번호`)을 잘못 고르지 않습니다.
- Cafe24·스마트스토어·쿠팡·Qoo10·Shopify·WooCommerce 등 주요 양식의 식별자(`상품코드`/`SKU`/`Handle`/
  `item_number`), 이름, 상태 열을 자동 인식합니다. 안내 행이 있는 양식도 머리글을 찾습니다.
- UTF-8(BOM 포함)과 EUC-KR/CP949 CSV를 읽습니다.
- `mall_id`, `shop_no`, `sale_active`는 파일에 없으면 고정값으로 지정합니다.
- `digital_confirmed`는 상품명으로 자동 분류하지 않습니다. 고정값으로 주거나, 운영자가 확인한
  분류 열과 값(예: `세분류 = eBook`)을 "디지털 판정 열"로 직접 지정합니다.
- 파일은 브라우저에서만 읽고 서버로 보내지 않습니다.

### 규칙 확인 서식 (수동)

외부 발송 서비스에 규칙 export가 없어도 점검할 수 있습니다. 점검 결과 화면에서 **규칙 서식**을 내려받으면
디지털 상품별 행이 채워집니다.

- 규칙이 있으면 `rule_id`를 실제 값으로, `active`를 `active`/`inactive`로 바꿉니다.
- 규칙이 없으면 그 행을 삭제합니다.
- 모든 상품을 확인했으면 **근거 서식**의 `complete`를 `yes`로 바꿉니다. `complete=no`면 누락으로
  단정하지 않고 판정 불가로 남습니다.

### 상품 목록 (`catalog.csv`)

| 열 | 필수 | 값 |
|---|---|---|
| `mall_id` | 예 | 몰 식별자 |
| `shop_no` | 예 | 몰 내 shop 번호 |
| `product_no` | 예 | 상품 번호 |
| `variant_code` | 아니오 | 옵션 코드 |
| `product_name` | 예 | 상품명 |
| `digital_confirmed` | 예 | `yes` / `no` / `unknown` |
| `sale_active` | 예 | `yes` / `no` / `unknown` |

`digital_confirmed`는 운영자가 확인한 값입니다. 이름에 PDF/전자책이 있다고 자동 분류하지 않습니다.
묶음·옵션별 전달 방식이 섞인 상품은 `unknown`으로 둡니다.

### 발송 규칙 (`rules.csv`)

| 열 | 필수 | 값 |
|---|---|---|
| `mall_id` | 예 | 몰 식별자 |
| `shop_no` | 예 | shop 번호 |
| `product_no` | 예 | 상품 번호 |
| `variant_code` | scope=variant면 예 | 옵션 코드 |
| `rule_id` | 예 | 규칙 식별자 |
| `scope` | 예 | `product` / `variant` |
| `active` | 예 | `active` / `inactive` / `unknown` |
| `channel` | 아니오 | 명시된 발송 채널 |
| `configured_at` | 아니오 | 설정시각(알면) |
| `collected_at` | 아니오 | 자료 수집시각 |
| `source` | 아니오 | 출처 |

### 근거·완전성 (`evidence.csv`)

| 열 | 필수 | 값 |
|---|---|---|
| `mall_id` | 예 | 몰 식별자 |
| `complete` | 예 | `yes` / `no` — 해당 몰 규칙 목록이 완전한지 |
| `product_rule_covers_variants` | 아니오 | `yes` / `no` / `unknown` — 상품 규칙이 옵션에 적용되는지 확인된 의미 |
| `snapshot_from` / `snapshot_to` | 아니오 | snapshot 기간 |
| `collected_at` | 아니오 | 자료 수집시각 |
| `confirmed_by` | 아니오 | 확인자 |
| `source` | 아니오 | 출처 |

## 판정

| 판정 | 조건 |
|---|---|
| 설정 확인 | 동일 몰·상품/옵션에 활성 규칙 확인 (실제 발송 검증 아님) |
| 발송 규칙 없음 | 목록이 **완전함을 확인**했고 적용 규칙이 없음 |
| 설정 비활성 | 적용 규칙이 있으나 모두 비활성 |
| 중복/충돌 가능성 | 활성 규칙 중복·우선순위 불명, 상품 규칙의 옵션 적용 미확인 |
| 판정 불가 | 목록 불완전, 자료 오래됨(기본 90일 초과), 수집시각 미상, 디지털 여부 불명 |
| 점검 대상 제외 | 운영자가 디지털 전달 대상이 아니라고 확인 |

핵심 규칙:

- 서로 다른 몰의 같은 상품 번호는 절대 같은 상품으로 매칭하지 않습니다.
- 목록 완전성이 확인되지 않으면 행 미발견을 `발송 규칙 없음`으로 바꾸지 않습니다.
- 설정시각이 없으면 주문 전후 관계를 추정하지 않고 별도 확인을 안내합니다.
- 수동 완료 메모는 판정을 바꾸지 않으며, `새 자료로 설정 확인`과 별도로 기록됩니다.

## 구조

```text
src/features/checks/   입력 타입, evaluateReadiness, 비교, 체크리스트, 저장소
src/features/imports/  CSV parser, schema 검증, 완전성 검사
src/app/               입력·결과·데모 UI
src/adapters/          수동 CSV adapter (공식 export/API는 접근 확인 전 미구현)
src/fixtures/          두 몰·합성 상품/규칙/근거 데이터
QA.md                  수동 검증표
```
