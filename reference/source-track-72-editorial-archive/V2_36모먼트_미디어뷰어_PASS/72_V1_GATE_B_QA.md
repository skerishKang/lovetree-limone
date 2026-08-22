# LoveTree Track 72 — GATE B QA

## 상태
- A3 STRUCTURE = PASS
- A3.5 ASSET CURATION = PASS
- GATE B = IMPLEMENTED / 승인 대기
- GATE C = HOLD

## 기준
- 최신 제품오너 지시: A3.5 first viewport 12 asset LOCK 유지
- GATE B 범위: 36 Moment scroll / Filter / Responsive / Lazy loading / Scroll preservation / Stability
- 금지 범위: hover autoplay / detail viewer / click video open / ESC return / advanced motion / 3D transition / asset recuration

## 구현 요약
- 전체 데이터: **36 Moment**
- deterministic data order 유지
- Desktop >= 1440: **4 columns**
- Small desktop / tablet landscape: **3 columns**
- <= 1023: **2 columns**
- Desktop All 첫 화면은 별도 A3.5 LOCK stage로 고정하여 13번째 자산이 첫 viewport에 침범하지 않음
- 이후 continuation wall은 deterministic shortest-column masonry로 이어짐
- Filter: All / Video / Photo-Scene / Object / Memo / Connection 실제 동작
- Filter 전환은 page reload 없이 DOM 재배치
- All 이전 scroll position 별도 저장/복원
- viewport resize 시 visible anchor를 기준으로 위치 보존
- page horizontal overflow 차단

## 성능
- 최종 HTML: 약 **22 KB**
- `72_GATE_B_ASSETS`: **20 files**
- first-view 원본 이미지는 기존 `02_디자인팀\캐릭터` 원본 파일을 상대경로로 직접 사용
- below-fold 지원 이미지는 Gate B assets로 외부화하고 `loading="lazy"`, `decoding="async"` 적용
- 실제 Video source는 기존 `결과물` MP4를 상대경로로 보존
- Video는 `preload="none"`, autoplay 없음
- poster 선표시로 video metadata에 의한 초기 layout jump 방지
- card height metadata를 렌더 전에 확정해 image load 전 레이아웃 높이 확보

## 자동 QA 결과

### Desktop 1920×1080
- item count: **36 / PASS**
- first-view locked source list exact match: **PASS**
- desktop columns: **4 / PASS**
- 첫 viewport locked card IDs:
  - `m01, m06, m11`
  - `m02, m04, m10`
  - `m03, m08, m12`
  - `m05, m07, m09`
- first viewport continuation asset 노출: **0개 / PASS**
- document scroll height: **2862 px**
- bottom max scroll: **1782 px**
- bottom 도달: **PASS**
- positive horizontal overflow: **0 / PASS**

### Filter
- 중간 All scroll position: **1104 px**
- Video filter: **6 items**, 렌더된 모든 card type = `video` / PASS
- Object filter: **6 items**, 렌더된 모든 card type = `object` / PASS
- Object → All 복귀 위치: **1104 px**
- All scroll restoration delta: **0 px / PASS**

### Tablet 1200×900
- computed columns: **3 / PASS**
- rendered grid columns: **3 / PASS**
- positive horizontal overflow: **0 / PASS**

### Mobile 390×844
- computed columns: **2 / PASS**
- rendered grid columns: **2 / PASS**
- desktop sidebar: hidden
- compact mobile top bar: visible
- drawer menu: keyboard/click 접근 가능
- positive horizontal overflow: **0 / PASS**

### Typography / Forbidden Feature
- Georgia: 없음
- Times New Roman: 없음
- Noto Serif KR: 없음
- 바탕체/궁서: 없음
- 한국어 Sans-only: PASS
- autoplay attribute: 없음
- hover autoplay handler: 없음
- detail viewer: 없음
- click video open: 없음
- advanced 3D transition: 없음

## Accessibility
- Filter는 실제 `<button>`
- card에 `aria-label`
- focus-visible outline 적용
- mobile menu button `aria-expanded`
- drawer close 후 focus 복귀
- `prefers-reduced-motion`에서 transition 최소화

## Video Source Path
Gate B HTML 위치:
`03_디자인채택본\72_러브트리_에디토리얼모먼트아카이브_디스커버리월_V1\05_GATE_B\72_V1_GATE_B.html`

실제 source folder:
`[01_러브트리]\결과물`

따라서 video source는:
`../../../결과물/<filename>.mp4`

로 유지한다.

## 증거 영상
- `72_V1_GATE_B_DESKTOP_SCROLL.mp4`
  - first viewport → 36 Moment continuation → bottom
- `72_V1_GATE_B_FILTER.mp4`
  - All 중간 위치 → Video → Object → All → 이전 위치 복원
- `72_V1_GATE_B_MOBILE.mp4`
  - 2-column mobile scroll → compact menu drawer → filter 접근

## 최종 판정
디자인팀 자체 QA 기준:
- Scroll = PASS
- Filter = PASS
- Responsive = PASS
- First View Lock = PASS
- Scroll Restoration = PASS
- Horizontal Overflow = PASS
- Korean Sans-only = PASS
- GATE C 금지 기능 미구현 = PASS

**GATE B candidate / 제품오너·설계팀 승인 대기.**
