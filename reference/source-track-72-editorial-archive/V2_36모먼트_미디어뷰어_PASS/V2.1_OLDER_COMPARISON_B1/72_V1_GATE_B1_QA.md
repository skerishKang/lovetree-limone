# LoveTree Track 72 — GATE B1 QA

## 상태
- A3 STRUCTURE = PASS
- A3.5 ASSET CURATION = PASS
- GATE B FOUNDATION = PASS
- GATE B1 = IMPLEMENTED / 승인 대기
- GATE C = HOLD

## MASTER
`설계팀장9기_72_GATE_B_REJECT_B1_미디어비율_누끼검수_스크롤재생_클릭열기_긴급수정_2026-08-17.md`

## 1. Media Fit / Crop
- 36 Moment 전수 contact sheet 제작 완료
- 고정 `h + cover` 기반 crop 시스템 폐기
- 일반 사진/scene/video: native ratio 기반
- 전신/누끼/object: contain stage
- `sphere-final.png`: positioned portrait crop (`50% 18%`), 머리/얼굴 safe
- unintended head crop: **0**
- unintended hand crop: **0**
- unintended foot crop: **0**
- accidental lower-body-only card crop: **0**
- broken alpha used: **0**
- green spill used: **0**

### Alpha correction
- `H_000.png`: original 378×506, alpha bbox `(148,17)-(268,446)` → display-only `H_000_alpha_trim.png` 사용
- `lubt-bloom.png`: original 512×512, alpha bbox `(6,1)-(363,489)` → display-only `lubt-bloom_alpha_trim.png` 사용
- 원본 파일 삭제/덮어쓰기 없음

## 2. Actual Video Source Audit
실제 VIDEO는 4개만 유지한다.

| ID | MP4 | Native | Duration | Curated start |
|---|---|---:|---:|---:|
| m01 | `65_입덕단서_시네마틱에디토리얼.mp4` | 1920×1080 | 89.433s | 25.04s |
| m07 | `52_글로벌모먼트오빗_3D네트워크.mp4` | 1920×1080 | 69.667s | 8.36s |
| m11 | `59_메모리스케치북_페이지여정.mp4` | 1920×1080 | 91.767s | 11.01s |
| m13 | `67_메모리테이프_인터랙티브롤.mp4` | 1920×1080 | 94.967s | 11.40s |

`m17`, `m20`은 실제 MP4가 없으므로 `PHOTO / SCENE`으로 정정했다.

## 3. Visible Inline Video Playback
IntersectionObserver thresholds: `[0, .08, .30, .6, 1]`.

자동 browser QA:
- Desktop first viewport에서 `m01 / m11 / m07` **3개 동시 muted playback = PASS**
- 1.2초 후 세 video 모두 currentTime 증가 = PASS
- viewport 밖으로 이동 후 세 video 모두 pause = PASS
- top re-entry 후 이전 currentTime에서 resume = PASS
- filter가 Object로 바뀌면 inline video DOM 0개 + currentTime map 보존 = PASS
- Mobile에서 `m13` visible 상태 `paused=false`, currentTime 증가 = PASS
- inline video attributes: `muted / playsinline / loop / preload=metadata`

## 4. Filter
- Video filter 결과: **4 items** (`m01,m07,m11,m13`)
- fake VIDEO poster-only item: **0**
- m17/m20 type correction 확인: **PHOTO**

## 5. Common Viewer
공통 viewer 1개가 type별 content만 변경한다.

### Photo/Image/Object
- card click open = PASS
- viewer image `object-fit: contain` = PASS
- crop 0 = PASS
- object neutral stage = PASS
- X close / ESC / backdrop close = 구현

### Video
- card click open = PASS
- inline currentTime handoff = PASS
- viewer controls = PASS
- default muted = PASS
- viewer에서 즉시 playback = PASS
- viewer close 시 currentTime을 inline map에 반환 = 구현

### Memo
- click open = PASS
- full memo text = PASS
- date / emotion / type / source 표시 = PASS

### Connection
- click open = PASS
- emotion before / after = PASS
- relation sentence = PASS
- previous / next Moment = PASS
- advanced graph/navigation는 미구현 (GATE C HOLD)

## 6. Scroll Preservation / Focus
- Photo viewer open scrollY: `668`
- close scrollY: `668`
- delta: **0px / PASS**
- body background scroll lock = 구현
- close 후 origin card focus return = 구현
- focus trap = 구현
- ESC = 구현

## 7. Responsive
### Desktop 1920×1080
- 4 columns = PASS
- first viewport A3.5 locked 12 cards = PASS
- horizontal overflow = 0

### Small desktop / tablet 1200×900
- 3 columns = PASS
- horizontal overflow = 0

### Mobile 390×844
- 2 columns = PASS
- horizontal overflow = 0
- visible video muted playback = PASS
- tap image → viewer open = PASS

## 8. Typography
- Korean Sans-only 유지
- Georgia / Times / Noto Serif KR / 명조 / 바탕 / 궁서 = 0

## 9. GATE C 금지 준수
미구현:
- cinematic previous/next route traversal
- exact timestamp route navigation
- fancy 3D transition
- advanced graph navigation
- 신규 asset recuration

## 10. Evidence
- `72_V1_GATE_B1_LIVE_VIDEO_SCROLL.mp4`
- `72_V1_GATE_B1_MEDIA_CLICK_VIEWER.mp4`
- `72_V1_GATE_B1_MEMO_CLICK.mp4`
- `72_V1_GATE_B1_MOBILE.mp4`

자동 QA용 영상은 동일 실제 MP4의 curated timestamp에서 잘라낸 짧은 로컬 excerpt를 사용해 브라우저 동작을 검증했다. 최종 HTML은 프로젝트 `결과물`의 원본 전체 MP4를 직접 참조한다.

## 최종 판정
디자인팀 내부 QA 기준 B1 요구사항 구현 완료. **GATE B1 candidate / 제품오너·설계팀 승인 대기. GATE C는 계속 HOLD.**
