# LoveTree Track 72 — GATE B1 ASSET FIT AUDIT

## 기준
- 최신 MASTER: `설계팀장9기_72_GATE_B_REJECT_B1_미디어비율_누끼검수_스크롤재생_클릭열기_긴급수정_2026-08-17.md`
- 원본 파일 삭제 없음
- 화면 사용 여부는 파일 존재 여부가 아니라 FIT/AUDIT 상태로 관리

## 36 Moment 전수 결과
- `unintended head crop = 0`
- `unintended hand crop = 0`
- `unintended foot crop = 0`
- `accidental lower-body-only crop by card = 0`
- `broken alpha used = 0`
- `green spill used = 0`
- `bad halo used = 0`

## Transparent PNG alpha audit
- `신규조각상_06_마이크퍼포먼스_블랙실버.png`: 1024×1536, alpha bbox `(0,17)-(1010,1520)` → subject가 canvas 대부분을 점유, 원본 사용 + `USE_CONTAIN`.
- `lubt-bloom.png`: 512×512, alpha bbox `(6,1)-(363,489)` → 우측 transparent margin이 커서 표시용 `lubt-bloom_alpha_trim.png` 생성. 원본 삭제/변경 없음.
- `H_000.png`: 378×506, alpha bbox `(148,17)-(268,446)` → 좌우 transparent margin이 매우 커서 표시용 `H_000_alpha_trim.png` 생성. 머리/손/발 전부 보존. 원본 삭제/변경 없음.
- 위 3개 transparent PNG에서 green-screen variant는 사용하지 않음.

## DO_NOT_USE 규칙
- `*_green.png` 전부 Track 72 B1에서 `DO_NOT_USE`.
- 기존 first-view blacklist(`petal-runner-open-v3.png`, `01_stage-singing.png`, `02_dance.png`) 유지.
- 원본 파일은 삭제하지 않는다.

## VIDEO type audit
- 실제 MP4가 있는 VIDEO는 `m01 / m07 / m11 / m13` 4개.
- `m17`, `m20`은 WebP/JPG poster만 존재하여 VIDEO badge를 제거하고 `PHOTO / SCENE`으로 타입 정정.
- 정지 이미지를 VIDEO라고 표시하는 항목 = 0.

## 36개 상세 표

| ID | Type | Source | Native | Fit status | Quality | Notes |
|---|---|---|---|---|---|---|
| m01 | video | `65_입덕단서_시네마틱에디토리얼.mp4` | 1920×1080 (1.778) | `USE_NATIVE` | `PASS` | actual MP4 / startTime=25.04s |
| m02 | photo | `sphere-final.png` | 1122×1402 (0.800) | `USE_POSITIONED` | `PASS_SAFE_POSITION` | `object-position: 50% 18%`; 머리/얼굴 safe. |
| m03 | object | `04_lovetree-sculpture.png` | 1024×1536 (0.667) | `USE_CONTAIN` | `PASS` |  |
| m04 | object | `ride-side.png` | 627×627 (1.000) | `USE_CONTAIN` | `PASS` |  |
| m05 | photo | `신규조각상_06_마이크퍼포먼스_블랙실버.png` | 1024×1536 (0.667) | `USE_CONTAIN` | `PASS_ALPHA` |  |
| m06 | object | `lubt-bloom.png` | 512×512 (1.000) | `USE_CONTAIN` | `PASS_ALPHA_TRIM` | alpha bbox trim derivative 사용; 원본 유지. |
| m07 | video | `52_글로벌모먼트오빗_3D네트워크.mp4` | 1920×1080 (1.778) | `USE_NATIVE` | `PASS` | actual MP4 / startTime=8.36s |
| m08 | photo | `07_키프레임_시즌개화.png` | 1600×900 (1.778) | `USE_NATIVE` | `PASS` |  |
| m09 | photo | `H_000.png` | 378×506 (0.747) | `USE_CONTAIN` | `PASS_ALPHA_TRIM` | alpha bbox trim derivative 사용; 머리·손·발 유지. |
| m10 | object | `crystal-awake-02.png` | 627×627 (1.000) | `USE_CONTAIN` | `PASS` |  |
| m11 | video | `59_메모리스케치북_페이지여정.mp4` | 1920×1080 (1.778) | `USE_NATIVE` | `PASS` | actual MP4 / startTime=11.01s |
| m12 | connection | `DOM Connection text` | DOM | `DOM_TEXT` | `PASS` |  |
| m13 | video | `67_메모리테이프_인터랙티브롤.mp4` | 1920×1080 (1.778) | `USE_NATIVE` | `PASS` | actual MP4 / startTime=11.4s |
| m14 | photo | `A1 existing archive pool` | 960×540 (1.778) | `USE_NATIVE` | `PASS` |  |
| m15 | photo | `A1 existing archive pool` | 576×720 (0.800) | `USE_NATIVE` | `PASS` |  |
| m16 | memo | `A1 existing archive pool` | DOM | `DOM_TEXT` | `PASS` |  |
| m17 | photo | `A1 existing archive pool` | 960×540 (1.778) | `USE_NATIVE` | `PASS_TYPE_CORRECTED` | 실제 MP4 부재 → PHOTO/SCENE 타입 정정. |
| m18 | connection | `A1 existing archive pool` | DOM | `DOM_TEXT` | `PASS` |  |
| m19 | photo | `A1 existing archive pool` | 576×720 (0.800) | `USE_NATIVE` | `PASS` |  |
| m20 | photo | `A1 existing archive pool` | 960×540 (1.778) | `USE_NATIVE` | `PASS_TYPE_CORRECTED` | 실제 MP4 부재 → PHOTO/SCENE 타입 정정. |
| m21 | photo | `A1 existing archive pool` | 760×980 (0.776) | `USE_NATIVE` | `PASS` |  |
| m22 | object | `A1 existing archive pool` | 960×540 (1.778) | `USE_NATIVE` | `PASS` |  |
| m23 | memo | `A1 existing archive pool` | DOM | `DOM_TEXT` | `PASS` |  |
| m24 | photo | `A1 existing archive pool` | 760×980 (0.776) | `USE_NATIVE` | `PASS` |  |
| m25 | photo | `A1 existing archive pool` | 760×980 (0.776) | `USE_NATIVE` | `PASS` |  |
| m26 | memo | `A1 existing archive pool` | DOM | `DOM_TEXT` | `PASS` |  |
| m27 | photo | `A1 existing archive pool` | 760×980 (0.776) | `USE_NATIVE` | `PASS` |  |
| m28 | object | `A1 existing archive pool` | 760×980 (0.776) | `USE_NATIVE` | `PASS_SOURCE_DETAIL_CROP` | 원본 자체가 detail framing; B1 card에서 추가 crop 없음. |
| m29 | connection | `A1 existing archive pool` | DOM | `DOM_TEXT` | `PASS` |  |
| m30 | photo | `A1 existing archive pool` | 760×980 (0.776) | `USE_NATIVE` | `PASS_SOURCE_DETAIL_CROP` | 원본 자체가 detail framing; B1 card에서 추가 crop 없음. |
| m31 | photo | `A1 existing archive pool` | 760×980 (0.776) | `USE_NATIVE` | `PASS_SOURCE_DETAIL_CROP` | 원본 자체가 detail framing; B1 card에서 추가 crop 없음. |
| m32 | connection | `A1 existing archive pool` | DOM | `DOM_TEXT` | `PASS` |  |
| m33 | photo | `A1 existing archive pool` | 760×980 (0.776) | `USE_NATIVE` | `PASS` |  |
| m34 | photo | `A1 existing archive pool` | 760×980 (0.776) | `USE_NATIVE` | `PASS` |  |
| m35 | memo | `A1 existing archive pool` | DOM | `DOM_TEXT` | `PASS` |  |
| m36 | photo | `A1 existing archive pool` | 760×980 (0.776) | `USE_NATIVE` | `PASS` |  |

## 판정
B1 rendering layer 기준 36 Moment 모두 사용 가능. `DO_NOT_USE`로 분류된 것은 현재 36개 외 green-screen/기존 blacklist 계열이며, 원본 파일은 보존한다.