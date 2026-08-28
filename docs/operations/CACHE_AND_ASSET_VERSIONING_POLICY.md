# LoveTree Cache and Asset Versioning Policy

```text
status: CANONICAL_OPERATIONAL_POLICY
version: 1.0
effective_date: 2026-08-01
scope: LoveTree V1, V2, V3, Cloudflare Workers Static Assets, API responses
```

## 1. 목적

LoveTree 배포 후 사용자가 강력 새로고침, 브라우저 캐시 삭제, 시크릿 창 재접속을 반복하지 않아도 최신 화면과 자산을 받도록 한다.

이 문서는 다음을 통제한다.

- HTML·RSC·동적 라우트 응답의 재검증
- 콘텐츠 해시가 포함된 JS·CSS 자산의 장기 캐시
- API·인증·사용자별 응답의 캐시 금지
- 배포 버전 확인과 stale asset 방지
- 캐시 관련 회귀 검증과 장애 대응

## 2. 기본 원칙

### 2.1 수동 버전 쿼리 금지

다음과 같은 수동 캐시 무효화 방식을 기본 전략으로 사용하지 않는다.

```text
/app.css?v=17
/app.js?version=20260801
/image.png?cacheBust=123
```

JS·CSS·빌드 자산은 Vite/vinext가 생성하는 콘텐츠 해시 파일명을 사용한다.

```text
/assets/home-a81c39f2.js
/assets/views-86f21b9c.css
```

내용이 변경되면 파일명이 변경돼야 한다. 동일한 파일명에 다른 내용을 덮어쓰는 방식은 허용하지 않는다.

### 2.2 하나의 배포 단위

Worker 코드, 서버 번들, RSC manifest, `dist/client` 정적 자산은 동일한 빌드에서 생성하고 동일한 Wrangler 배포로 올린다.

서버 코드와 정적 자산을 서로 다른 commit 또는 서로 다른 빌드 결과로 조합하지 않는다.

### 2.3 사용자에게 강력 새로고침을 요구하지 않는다

정상 배포 검증의 기준은 일반 새로고침과 새 탭 접근이다.

강력 새로고침은 진단 수단일 뿐 운영 절차가 아니다. 강력 새로고침을 해야만 최신 화면이 보이면 배포 또는 캐시 정책 결함으로 처리한다.

## 3. 응답별 캐시 정책

### 3.1 해시가 포함된 정적 자산

대상:

```text
/assets/*
```

정책:

```http
Cache-Control: public, max-age=31536000, immutable
```

전제:

- `/assets/*`의 JS·CSS 파일명에는 콘텐츠 해시가 포함돼야 한다.
- 이미지·폰트·기타 build asset도 동일하다. `/assets/*`에 포함되는 모든 파일은 파일명에 콘텐츠 해시를 포함해야 한다.
- 내용이 변경되면 새 URL이 생성돼야 한다.
- 해시가 없는 고정 파일을 `/assets/*`에 두지 않는다.
- 고정 파일은 `/assets/*` 밖(`dist/client` 루트 등)에 두어 기본 재검증 정책(`public, max-age=0, must-revalidate` + ETag)을 받도록 한다.
- `/_headers`의 `/assets/*` immutable 규칙은 파일명을 구분하지 않으므로, build가 `/assets/*`에 고정 이름 파일을 내보내지 않음을 테스트로 강제한다.

### 3.2 HTML·RSC·동적 페이지 응답

프레임워크가 별도 정책을 제공하지 않는 경우 다음을 적용한다.

```http
Cache-Control: private, max-age=0, must-revalidate
```

목적:

- 브라우저는 응답을 보관할 수 있으나 재사용 전에 최신 여부를 확인한다.
- 사용자별 또는 인증 상태가 섞일 수 있는 동적 응답을 공유 캐시에 저장하지 않는다.

이미 더 엄격한 `Cache-Control`을 가진 응답은 덮어쓰지 않는다.

### 3.3 API·인증·사용자별 응답

대상:

```text
/api/**
인증 결과
트리·순간·댓글·좋아요·저장 등 사용자 데이터
생성·수정·삭제 결과
오류 응답과 requestId 포함 응답
```

정책:

```http
Cache-Control: private, no-store
```

API 응답은 브라우저 캐시와 공유 캐시에 저장하지 않는다.

성공(2xx)뿐 아니라 4xx·5xx 오류 응답에도 동일하게 적용한다. 오류 응답이 공유 캐시에 남으면 이후 요청이 stale 오류를 재사용할 수 있기 때문이다.

### 3.4 고정 이름 정적 파일

예:

```text
/favicon.ico
/robots.txt
/manifest.webmanifest
```

Cloudflare Workers Static Assets의 기본 정책인 다음 재검증 방식을 유지한다.

```http
Cache-Control: public, max-age=0, must-revalidate
ETag: <asset content hash>
```

고정 파일에 장기 캐시가 필요하면 파일명 자체를 버전화한다.

### 3.5 `/_vinext/image` 변환 라우트

대상:

```text
/_vinext/image?url=...&w=...&q=...
```

정책:

- 성공 응답은 vinext가 명시한 다음 헤더를 유지한다.

  ```http
  Cache-Control: public, max-age=31536000, immutable
  Vary: Accept
  Content-Security-Policy: script-src 'none'; frame-src 'none'; sandbox;
  X-Content-Type-Options: nosniff
  ```

- `/_vinext/image`는 `/assets/*` static 규칙과 무관하며 `_headers`가 이 라우트를 대상으로 하지 않는다.
- 명시적 `Cache-Control`이 없는 응답(400·404 등 오류)에는 Worker가 동적 기본 정책 `private, max-age=0, must-revalidate`를 적용한다. 오류가 잘못 public cache되지 않는다.
- 이미지 응답은 API·인증·사용자별 데이터로 취급하지 않는다. 변환 파라미터가 URL에 인코딩되므로 성공 응답의 immutable 정책은 safe하다.

## 4. 저장소 구현 계약

### 4.1 정적 자산 헤더

`public/_headers`에서 `/assets/*`에만 immutable 정책을 적용한다.

전역 `/*` 규칙과 `/assets/*` 규칙에 `Cache-Control`을 중복 선언하지 않는다. Cloudflare는 중복 헤더 값을 결합할 수 있으므로 상충하는 지시문을 만들지 않는다.

### 4.2 API 헤더

`server/api/http.ts`의 공통 JSON 응답 생성기가 모든 API JSON 응답에 다음을 포함해야 한다.

```http
Cache-Control: private, no-store
```

라우터별로 캐시 헤더를 개별 구현하지 않는다.

### 4.3 동적 페이지 헤더

`worker/index.ts`는 vinext handler가 명시적인 `Cache-Control`을 제공하지 않은 경우에만 다음 기본값을 추가한다.

```http
Cache-Control: private, max-age=0, must-revalidate
```

프레임워크가 이미 `no-store`, `private`, `s-maxage` 등 명시적 정책을 반환하면 그대로 보존한다.

Cache-Control 결정 로직은 `worker/cache-policy.ts`의 순수 함수 `applyDefaultDynamicCachePolicy`로 분리한다. Worker의 앱 응답과 `/_vinext/image` 응답 모두 이 함수를 거친다. 헤더가 이미 있으면 그대로 두고, 없을 때만 동적 기본값을 추가하므로 static asset 응답(플랫폼이 이미 Cache-Control을 부여)에는 fallback이 적용되지 않는다.

### 4.4 stale manifest 방지

`npm run build`는 `scripts/prune-rsc-assets.mjs`를 실행해야 한다.

빌드 후 RSC manifest가 참조하는 모든 `/assets/*` URL은 `dist/client/assets`에 실제로 존재해야 한다.

존재하지 않는 자산 참조, 이전 빌드의 chunk URL, CSS placeholder chunk는 배포 전에 차단한다.

## 5. 필수 자동 검증

`npm test` 또는 동일 수준의 독립 검증에서 다음을 확인한다.

1. `public/_headers`가 빌드 결과 `dist/client/_headers`에 포함된다.
2. `/assets/*`에 `public, max-age=31536000, immutable`이 선언된다. 전역 `/*` 규칙이나 `/_vinext` 대상 규칙은 없다.
3. clean build 후 `dist/client/assets`에 내보내진 **모든** 파일(JS·CSS·이미지·폰트·기타)의 파일명이 콘텐츠 해시를 포함한다.
4. `favicon.svg` 등 고정 이름 파일은 `/assets/*` 밖에 배포되며 immutable 규칙이 적용되지 않는다.
5. API JSON 응답이 2xx·4xx·5xx 모두 `private, no-store`를 반환한다(헬퍼와 실제 handler 실행).
6. Worker의 동적 응답 기본 정책이 `private, max-age=0, must-revalidate`이다. 명시적 헤더 보존, API no-store 보존, static asset 무변경, 오류 public 금지를 실행으로 검증한다.
7. `/_vinext/image` 성공 응답은 vinext 명시 헤더를 유지하고, 헤더 없는 오류 응답은 Worker 기본 정책을 받는다. `/assets/*` immutable 규칙과 혼동되지 않는다.
8. RSC manifest의 모든 자산 참조가 실제 파일과 일치한다.
9. 일반 새로고침에서 asset 404, chunk load error, 이전 UI 잔존이 없다.

## 6. 배포 검증 절차

각 Preview·Staging·Production 배포에서 exact SHA를 고정한 뒤 다음을 검증한다.

### 6.1 새 브라우저 접근

- 일반 새 탭에서 대표 라우트 접근
- 강력 새로고침 사용 금지
- 최신 기능과 문구 확인
- console error, page error, failed request 0

### 6.2 기존 탭 갱신

- 이전 배포부터 열려 있던 탭에서 일반 새로고침
- 최신 HTML과 신규 chunk가 함께 로드되는지 확인
- 이전 chunk 404가 없는지 확인
- 무한 reload가 없는지 확인

### 6.3 헤더 확인

최소 다음을 기록한다.

```text
HTML/RSC: Cache-Control
/assets/*.js: Cache-Control, ETag
/assets/*.css: Cache-Control, ETag
/api/health: Cache-Control
인증된 API: Cache-Control
```

### 6.4 자산 일치 확인

- HTML/RSC가 참조한 chunk URL 전부 HTTP 200
- `/assets/*` 404 0
- 배포 Worker version과 검증 대상 exact SHA 기록

## 7. 오래된 탭 복구 정책

장시간 열린 탭이 이전 chunk URL을 보유한 상태에서 새 배포가 이뤄질 수 있다.

자동 복구를 구현할 경우 다음을 지킨다.

1. 실제 `ChunkLoadError` 또는 로컬 `/assets/*` 404에서만 동작한다.
2. 같은 세션에서 최대 1회만 일반 reload한다.
3. `sessionStorage` 등으로 재시도 여부를 기록한다.
4. 반복 실패 시 무한 reload하지 않고 오류 화면과 재시도 버튼을 제공한다.
5. 네트워크 단절이나 외부 YouTube 실패를 chunk 오류로 오인하지 않는다.

이 자동 복구는 별도 제품 변경으로 검토하며 본 정책 도입의 필수 조건은 아니다.

## 8. 금지 사항

- 배포마다 임의의 `?v=` 숫자 변경
- 동일한 해시 자산 URL에 다른 바이트 배포
- API 응답에 `public` 또는 장기 `s-maxage` 적용
- 인증 응답과 사용자별 트리 데이터를 공유 캐시에 저장
- Worker와 `dist/client`를 서로 다른 build에서 조합
- stale asset 404를 강력 새로고침 안내로 종결
- 캐시 문제를 확인하지 않고 CDN 전체 purge를 상시 운영 절차로 사용

## 9. 장애 판정과 대응

다음 중 하나라도 발생하면 캐시·자산 배포 장애로 판정한다.

- 일반 새로고침에서 이전 UI가 계속 노출됨
- 신규 HTML이 삭제된 chunk URL을 참조함
- `/assets/*` 404 또는 `ChunkLoadError`
- API 응답이 브라우저·공유 캐시에서 재사용됨
- 배포 exact SHA와 실제 로드된 자산 집합이 일치하지 않음

대응 순서:

1. 현재 Worker version과 exact SHA 확인
2. HTML/RSC 응답의 chunk URL 수집
3. 배포된 `dist/client/assets`와 비교
4. 응답 헤더 확인
5. 잘못된 배포면 이전 정상 Worker version으로 rollback
6. 원인 수정 후 새 exact SHA로 재배포
7. 일반 새로고침 기준으로 재검증

## 10. 관련 공식 문서

- Cloudflare Workers Static Assets headers: https://developers.cloudflare.com/workers/static-assets/headers/
- Cloudflare Workers Static Assets: https://developers.cloudflare.com/workers/static-assets/
- Cloudflare Vite plugin static assets: https://developers.cloudflare.com/workers/vite-plugin/old/reference/static-assets/

이 문서는 V1·V2·V3 모두에 적용된다. 특정 버전 구현 문서가 이 정책과 충돌하면 이 운영 정책을 우선한다.
