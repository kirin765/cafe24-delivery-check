# 스토어 등록용 이미지

개발자센터 앱 등록(상품 정보) 화면에 올릴 이미지. `../cafe24-return-photo`,
`../cafe24-review`의 `store-assets` 규격·렌더링 방식을 재사용했다.

## 아이콘 · 배너

| 파일 | 크기 | 비고 |
|---|---|---|
| `icon-512.png` | 512×512 | 앱 아이콘 |
| `icon-256.png` | 256×256 | `icon-512.png`에서 다운스케일 |
| `banner-740x416.png` | 740×416 | 앱 배너 |

재생성: `pnpm run store-assets:icons` (256은 ImageMagick `magick`).

## 상세 설명 이미지 (2x 고해상도)

`detail-images.html` → `public/store/detail-01..03.png` (860px × 2 = 1720px).
배포하면 `https://cafe24-delivery-check.vercel.app/store/detail-0N.png`로 서빙된다.

재생성: `node store-assets/render-detail-images.mjs`

## 스크린샷

| 파일 | 크기 | 쓰는 곳 |
|---|---|---|
| `screenshots/pc-01-new-check.png` | 1920×1080 | 상품 목록 가져오기(Cafe24·export) |
| `screenshots/pc-02-demo-results.png` | 1920×1080 | 합성 자료 데모 판정 |
| `screenshots/pc-03-check-result.png` | 1920×1080 | 상품별 판정 결과 |
| `screenshots/mo-01-guide.png` | 360×640 | 사용 안내 |
| `screenshots/mo-02-demo.png` | 360×640 | 데모 요약 |
| `screenshots/mo-03-check-result.png` | 360×640 | 판정 결과 |
| `cover.png` | 1200×675 | 스토리 대표 이미지 초안 |
| `cover-store.png` | 444×320 | 스토리 대표 이미지 최종 |

## 문서

- `store-listing-copy.md` — 소개 문구·FAQ·바이트 수.
- `form-fill.md` — 개발자센터 입력 시트(기본정보·판매정보·업로드 파일·심사 메일).
- `store-detail.html` — 개발자센터 상세 설명에 붙여넣을 HTML.

## 규격과 전제

- PC 1920×1080, 모바일 360×640, 파일당 1MB 미만. 현재 산출물은 모두 1MB 미만이다.
- PC 화면은 콘텐츠 폭이 1024px이라 1920 프레임에서 비어 보인다. 스크린샷 렌더링 시에만 `zoom`을
  적용해 채운다. 앱 코드는 바꾸지 않는다.
- 스크린샷은 **합성 데모 자료**(`/demo`, `데모 자료 채우기`)만 사용한다. 실제 몰·고객 데이터를 쓰지 않는다.
- 상세 이미지도 합성 자료와 일반 설명만 담는다.

## 다시 만들기

배포된 앱을 캡처하므로 먼저 배포가 최신이어야 한다.

```bash
APP_URL=https://cafe24-delivery-check.vercel.app node scripts/render-store-assets.mjs
pnpm run store-assets:icons
node store-assets/render-detail-images.mjs
```

브라우저는 시스템 Chromium만 사용한다. 스크립트는 실제 쇼핑몰·Cafe24 API에 접속하지 않는다.
