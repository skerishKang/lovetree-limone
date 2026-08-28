# Track 72 — GATE B1 36 ASSET FIT AUDIT

## 기준
- MASTER: `설계팀장9기_72_GATE_B_REJECT_B1_미디어비율_누끼검수_스크롤재생_클릭열기_긴급수정_2026-08-17.md`
- 원본 삭제: **0건**
- 자산 임의 재큐레이션: **0건**
- A3.5 first-view 12 source identity: 유지

## 정책
- `USE_NATIVE`: 원본 비율 우선
- `USE_CONTAIN`: 전신/누끼/제품을 contain stage로 표시
- `USE_COVER_SAFE`: landscape scene/video 등 safe crop 가능
- `USE_POSITIONED`: 이번 B1에서는 필요 없음
- `DO_NOT_USE`: 원본 자체가 이미 부분 신체 crop이라 fitting으로 복구 불가. 파일은 삭제하지 않음

## 36개 전수

| ID | filename/source | native size | fitMode | status | alpha audit | note |
|---|---|---:|---|---|---|---|
| m01 | `65_입덕단서_시네마틱에디토리얼.mp4` | 1920×1080 | COVER_SAFE | USE_COVER_SAFE | opaque | 실제 MP4 연결, visible autoplay 대상. |
| m02 | `sphere-final.png` | 1122×1402 | NATIVE | USE_NATIVE | opaque |  |
| m03 | `04_lovetree-sculpture.png` | 1024×1536 | CONTAIN_STAGE | USE_CONTAIN | opaque |  |
| m04 | `ride-side.png` | 627×627 | NATIVE | USE_NATIVE | opaque |  |
| m05 | `신규조각상_06_마이크퍼포먼스_블랙실버.png` | 1190×1683 | CONTAIN_STAGE | USE_CONTAIN | alpha bbox (0, 17, 1010, 1520) → safe trimmed derivative | alpha trim derivative로 transparent margin 축소. |
| m06 | `lubt-bloom.png` | 415×546 | CONTAIN_STAGE | USE_CONTAIN | alpha bbox (6, 1, 363, 489) → safe trimmed derivative | alpha trim derivative로 transparent margin 축소. |
| m07 | `52_글로벌모먼트오빗_3D네트워크.mp4` | 1920×1080 | COVER_SAFE | USE_COVER_SAFE | opaque | 실제 MP4 연결, visible autoplay 대상. |
| m08 | `07_키프레임_시즌개화.png` | 1600×900 | COVER_SAFE | USE_COVER_SAFE | opaque |  |
| m09 | `H_000.png` | 170×479 | CONTAIN_STAGE | USE_CONTAIN | alpha bbox (148, 17, 268, 446) → safe trimmed derivative | alpha bbox trim + safe pad derivative. 머리/발 100% 유지. |
| m10 | `crystal-awake-02.png` | 627×627 | NATIVE | USE_NATIVE | opaque |  |
| m11 | `59_메모리스케치북_페이지여정.mp4` | 1920×1080 | COVER_SAFE | USE_COVER_SAFE | opaque | 실제 MP4 연결, visible autoplay 대상. |
| m12 | `DOM Connection text` | —×— | NATIVE | USE_NATIVE | N/A |  |
| m13 | `67_메모리테이프_인터랙티브롤.mp4` | 1920×1080 | COVER_SAFE | USE_COVER_SAFE | opaque | 실제 MP4 연결, visible autoplay 대상. |
| m14 | `A1 existing archive pool` | 960×540 | COVER_SAFE | USE_COVER_SAFE | opaque |  |
| m15 | `A1 existing archive pool` | 576×720 | NATIVE | USE_NATIVE | opaque |  |
| m16 | `A1 existing archive pool` | —×— | NATIVE | USE_NATIVE | N/A |  |
| m17 | `A1 existing archive pool` | 960×540 | COVER_SAFE | USE_COVER_SAFE | opaque | 실제 MP4 없음. VIDEO badge 제거, PHOTO/SCENE으로 정정. |
| m18 | `A1 existing archive pool` | —×— | NATIVE | USE_NATIVE | N/A |  |
| m19 | `A1 existing archive pool` | 576×720 | NATIVE | USE_NATIVE | opaque |  |
| m20 | `A1 existing archive pool` | 960×540 | COVER_SAFE | USE_COVER_SAFE | opaque | 실제 MP4 없음. VIDEO badge 제거, PHOTO/SCENE으로 정정. |
| m21 | `A1 existing archive pool` | 760×980 | NATIVE | USE_NATIVE | opaque |  |
| m22 | `A1 existing archive pool` | 960×540 | COVER_SAFE | USE_COVER_SAFE | opaque |  |
| m23 | `A1 existing archive pool` | —×— | NATIVE | USE_NATIVE | N/A |  |
| m24 | `A1 existing archive pool` | 760×980 | CONTAIN_STAGE | USE_CONTAIN | opaque |  |
| m25 | `A1 existing archive pool` | 760×980 | CONTAIN_STAGE | USE_CONTAIN | opaque |  |
| m26 | `A1 existing archive pool` | —×— | NATIVE | USE_NATIVE | N/A |  |
| m27 | `A1 existing archive pool` | 760×980 | CONTAIN_STAGE | USE_CONTAIN | opaque |  |
| m28 | `A1 existing archive pool` | 760×980 | EXCLUDE | DO_NOT_USE | opaque | 원본 자체가 신체 일부 crop. 원본 보존, 화면 media 제외. |
| m29 | `A1 existing archive pool` | —×— | NATIVE | USE_NATIVE | N/A |  |
| m30 | `A1 existing archive pool` | 760×980 | EXCLUDE | DO_NOT_USE | opaque | 원본 자체가 신체 일부 crop. 원본 보존, 화면 media 제외. |
| m31 | `A1 existing archive pool` | 760×980 | EXCLUDE | DO_NOT_USE | opaque | 원본 자체가 신체 일부 crop. 원본 보존, 화면 media 제외. |
| m32 | `A1 existing archive pool` | —×— | NATIVE | USE_NATIVE | N/A |  |
| m33 | `A1 existing archive pool` | 760×980 | CONTAIN_STAGE | USE_CONTAIN | opaque |  |
| m34 | `A1 existing archive pool` | 760×980 | CONTAIN_STAGE | USE_CONTAIN | opaque |  |
| m35 | `A1 existing archive pool` | —×— | NATIVE | USE_NATIVE | N/A |  |
| m36 | `A1 existing archive pool` | 760×980 | CONTAIN_STAGE | USE_CONTAIN | opaque |  |

## DO_NOT_USE
- `m28_A1_ARCHIVE.jpg`: source 자체가 목/머리·하체 일부가 없는 partial-body crop.
- `m30_A1_ARCHIVE.jpg`: source 자체가 seated partial body crop.
- `m31_A1_ARCHIVE.jpg`: source 자체가 torso/lower-body 부분만 존재.

세 파일은 **원본 삭제하지 않고** B1 화면에서는 media를 제외하고 Moment metadata surface로 유지한다. 승인되지 않은 대체 자산을 임의 투입하지 않았다.

## VIDEO source audit
- `m01`: actual MP4 = 65 FIRST CLUE
- `m07`: actual MP4 = 52 Dark Network
- `m11`: actual MP4 = 59 Memory Sketchbook
- `m13`: actual MP4 = 67 Memory Tape
- `m17`, `m20`: 실제 MP4 부재 → PHOTO/SCENE 정정

## Alpha audit
- `m05`: RGBA, alpha bbox를 잘라 safe padding derivative 생성. 원본 보존.
- `m06`: RGBA, alpha bbox를 잘라 safe padding derivative 생성. 원본 보존.
- `m09 H_000.png`: RGBA canvas 내 subject bbox가 매우 좁음. bbox crop + safe padding derivative로 figure scale 확보. 원본 보존.

## 승인 대기
이 Audit은 B1 candidate의 rendering/use 상태를 기록한다. 원본 삭제 또는 임의 교체 승인을 의미하지 않는다.
