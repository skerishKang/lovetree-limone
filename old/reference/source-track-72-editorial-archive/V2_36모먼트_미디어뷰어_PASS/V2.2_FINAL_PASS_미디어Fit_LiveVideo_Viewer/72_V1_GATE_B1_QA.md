# LoveTree Track 72 — GATE B1 QA

## 상태
- A3 STRUCTURE = PASS
- A3.5 ASSET CURATION = PASS
- GATE B FOUNDATION = PASS
- GATE B1 = IMPLEMENTED / 승인 대기
- GATE C = HOLD

## MASTER
`설계팀장9기_72_GATE_B_REJECT_B1_미디어비율_누끼검수_스크롤재생_클릭열기_긴급수정_2026-08-17.md`

## 1. 36 Asset Fit / Alpha Audit
- Moment count: **36**
- 원본 삭제: **0건**
- 임의 신규 자산 재큐레이션: **0건**
- `USE_NATIVE / USE_CONTAIN / USE_COVER_SAFE / DO_NOT_USE` 상태를 `72_V1_GATE_B1_ASSET_FIT_AUDIT.md`에 36개 전수 기록
- alpha-safe derivative: `m05`, `m06`, `m09(H_000)`
- 원본 자체 partial-body crop으로 fitting 복구 불가: `m28`, `m30`, `m31` → **DO_NOT_USE media**, 원본 파일 보존
- `m17`, `m20`: 실제 MP4 부재 확인 → **PHOTO/SCENE으로 정정**, VIDEO badge 제거

### Crop/Fit 결과
- 화면에서 사용되는 전신/누끼는 contain 또는 alpha-safe stage
- unintended head crop: **0**
- unintended hand crop: **0**
- unintended foot crop: **0**
- lower-body-only accidental media tile: **0** (`m28/m30/m31` media 제외)
- green spill 사용: **0**
- broken alpha/halo 사용: **0**

## 2. Actual Video Source
- `65_입덕단서_시네마틱에디토리얼.mp4` — ffprobe duration: **89.44s**
- `52_글로벌모먼트오빗_3D네트워크.mp4` — ffprobe duration: **69.68s**
- `59_메모리스케치북_페이지여정.mp4` — ffprobe duration: **91.79s**
- `67_메모리테이프_인터랙티브롤.mp4` — ffprobe duration: **94.99s**

HTML actual source path는 B1 nested folder 기준 `../../../../결과물/<file>.mp4`를 사용한다.
Inline video 기본:
- `muted`
- `loop`
- `playsinline`
- `preload="metadata"`
- poster 제공

## 3. Runtime Browser QA
실제 구현 DOM/JS를 Chromium에서 실행하고, 영상은 동일 source의 짧은 QA proxy clip으로 검증했다. 이는 autoplay/currentTime/IntersectionObserver 동작 검증용이며 최종 HTML은 원본 MP4를 가리킨다.

### Visible autoplay / simultaneous play
Desktop 첫 viewport visible videos:
[
  {
    "id": "m01",
    "paused": false,
    "time": 2.073992
  },
  {
    "id": "m11",
    "paused": false,
    "time": 2.068058
  },
  {
    "id": "m07",
    "paused": false,
    "time": 2.068096
  }
]

결과:
- multiple visible muted playback: **PASS**
- offscreen pause (`m01`): **PASS** — {'paused': True, 'time': 2.081905}
- re-entry resume (`m01`): **PASS** — {'paused': False, 'time': 2.973787}
- constant restart at 0: **없음**

### Video viewer
- inline currentTime before open: **1.105s**
- viewer open: **True**
- viewer controls: **True**
- viewer muted default: **True**
- viewer playback paused: **False**
- currentTime handoff: **PASS**

### Photo/Object click
- photo click → common viewer: **PASS**
- viewer `<img>`: **PASS**
- viewer `object-fit: contain`: **CSS 적용**
- close 후 scroll delta: **0px / PASS**

### Memo / Connection click
- Memo viewer open/readable: **PASS**
- Connection viewer open/readable: **PASS**
- Connection detail includes emotion transition + relation sentence + previous/next labels

### Mobile
- 390×844 columns: **2 / PASS**
- horizontal overflow: **0 / PASS**
- visible video playback rule 유지
- tap → common viewer 동일 경로

## 4. Viewer UX
공통 viewer 하나로 유형 분기:
- video
- image/photo
- object
- memo
- connection
- DO_NOT_USE media metadata detail

구현:
- card click / Enter / Space
- close button
- ESC close
- backdrop close
- focus trap
- close 후 triggering card focus return
- body background scroll lock
- scroll Y 복원
- image/object contain
- video controls + currentTime handoff

## 5. Foundation Regression
- 36 Moment: **PASS**
- Filter: **유지**
- Desktop 4 / small desktop 3 / mobile 2: **유지**
- horizontal overflow 0: **PASS**
- A3.5 first-view source identity: **12/12 유지**
- Korean Serif: **0 / Sans-only 유지**

## 6. Evidence
- `72_V1_GATE_B1_36_ASSET_FIT_CONTACT_SHEET.png`
- `72_V1_GATE_B1_LIVE_VIDEO_SCROLL.mp4`
- `72_V1_GATE_B1_MEDIA_CLICK_VIEWER.mp4`
- `72_V1_GATE_B1_MEMO_CLICK.mp4`
- `72_V1_GATE_B1_MOBILE.mp4`

Evidence MP4는 동일 구현 UI를 Chromium에서 실행해 캡처한 QA용 자산(이미지는 경량 proxy, video는 동일 원본에서 만든 짧은 QA proxy)을 사용한다. 최종 HTML에서는 원본 image/source 및 `결과물` 실제 MP4 경로를 사용한다.

## 7. Forbidden / GATE C
미구현 유지:
- advanced route traversal
- cinematic viewer transitions
- 3D transitions
- richer playback sequence
- GATE C 기능 확장

## 판정
디자인팀 자체 QA 기준 **B1 candidate = READY FOR REVIEW**.
최종 GATE B PASS 선언은 제품오너/설계팀 승인 전까지 하지 않는다.
