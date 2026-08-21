# LoveTree 49번 4-3기 STORYBOARD LOCK 실행지시서 v1
## 승인 스토리보드 고정 · Shot Clip 우선 제작 · HTML은 재생/인터랙션 셸로 제한

**문서 상태:** 설계팀장 4기 실행지시  
**대상:** LoveTree 4-3기 시네마틱 디자인팀장  
**대상 트랙:** `49_아이돌모먼트_리빌포털_분류대기`  
**신규 작업 상태:** `V2 STORYBOARD LOCK IMPLEMENTATION`  
**작성일:** 2026-08-09

---

# 0. 제품 오너 최신 결정

현재 4-3기가 제출한 LoveTree 49 / Superhuman 계열 스토리보드의 **서사·장면 이미지·색·PRIMARY 인물·Moment→Connection→Tree 흐름은 좋은 방향으로 승인 후보**다.

이번 작업의 목적은 새로운 디자인을 만드는 것이 아니다.

> **현재 스토리보드에서 잘 나온 것을 실제 영상으로 최대한 그대로 옮기는 것**

이다.

따라서 이후 구현자는 **창작자나 재해석자가 아니라 복원자**로 작업한다.

---

# 1. 가장 중요한 원칙 — STORYBOARD IS THE SPEC

현재 제출된 스토리보드는 단순 참고 이미지가 아니다.

다음 항목은 **LOCK**한다.

- PRIMARY 남성 identity
- 장면별 주요 구도
- 얼굴의 거리
- dark / silver / cyan / white / red-magenta 색 흐름
- FIRST GLIMPSE의 첫 인상
- AFTERIMAGE의 glass/reflection
- PERSON REVEAL의 white-space 대비
- DELICATE MOMENTS의 세부 순간
- SAVE의 빛 고정 사건
- CONNECTION의 portal/path
- NEXT MOMENT의 다른 면
- DEEPENING의 여러 Moment
- MEMORY FIELD의 누적
- TREE EMERGES의 수렴
- LOVETREE reveal

구현 과정에서 임의로 더 예쁘게 바꾸거나 다른 아이디어를 추가하지 않는다.

---

# 2. 현재 여러 스토리보드의 역할을 분리한다

현재 제출된 보드에는 서로 다른 컷 수와 러닝타임 표기가 존재한다.

예:
- 10-beat semantic storyboard
- 12-panel concept storyboard
- 21-shot / 22-shot storyboard
- 약 29.5초 / 34초 / 40.5초 등 서로 다른 타임 표기

이 숫자들을 임의로 섞지 않는다.

## 최종 권위

### A. VISUAL / SEMANTIC MASTER
현재 제품 오너가 좋다고 판정한 **LoveTree V2 스토리보드 이미지들**.

### B. TIMING MASTER
기존에 검증한 `NCT 127 'Superhuman' MV Teaser`의 실제 cut timing:
약 **29.252초 / S01~S21**.

따라서 Full Version은:

> **승인 스토리보드의 장면 의미와 구도를 유지하면서 Superhuman의 21-shot timing에 배치**

한다.

스토리보드의 34초/40.5초 표기는 visual planning용으로만 보고 최종 실행 타임라인으로 사용하지 않는다.

---

# 3. 구현 방식을 바꾼다 — HTML에서 시네마를 만들지 마라

지금까지 반복 실패한 핵심 원인은:

> **정지 이미지를 HTML/CSS transform으로 움직여 영화처럼 보이게 하려 한 것**

이다.

이번부터 제작구조를 다음처럼 바꾼다.

```text
APPROVED STORYBOARD
→ FULL-RES SCENE MASTER
→ SHOT-LEVEL MOTION CLIP
→ EXACT TIMING EDIT
→ FINAL CINEMATIC
→ HTML INTERACTION SHELL
```

## 절대 규칙

**Cinematic motion은 먼저 영상 클립으로 만든다.**

HTML은 다음만 담당한다.

- shot video playback
- exact timeline sync
- preload
- skip
- replay
- sound
- ENTER LOVETREE
- Moment detail/modal
- responsive wrapper

HTML/CSS가 주연출을 만들지 않는다.

---

# 4. Shot Clip 우선 방식

각 주요 shot은:

- MP4 또는 WebM
- 1920×1080 이상 권장
- 최소 30fps
- 가능하면 60fps master
- shot별 독립 파일

로 먼저 만든다.

### 예

```text
S01_first_glimpse.mp4
S02_afterimage.mp4
S03_person_reveal.mp4
S04_delicate_01.mp4
...
S21_tree_lovetree.mp4
```

그 다음 이 shot들을 정확한 Superhuman 타이밍으로 조립한다.

---

# 5. 스토리보드 프레임을 그대로 Scene Master로 승격

현재 잘 나온 스토리보드 프레임을 버리고 새 장면을 text prompt만으로 다시 만들지 않는다.

각 shot은 먼저:

1. 승인 스토리보드에서 해당 프레임을 crop/reference로 추출
2. PRIMARY identity reference 함께 사용
3. 같은 구도 / 같은 의상 계열 / 같은 조명 / 같은 카메라 거리 유지
4. 16:9 high-resolution scene master 생성
5. storyboard ↔ scene master side-by-side 비교
6. PASS된 scene master만 motion 단계로 이동

### 금지

- text-only regeneration
- 다른 얼굴로 새로 생성
- storyboard와 다른 의상
- 카메라 위치 임의 변경
- 배경을 전혀 다른 곳으로 교체
- 새 props 추가
- 전체 미감 재설계

---

# 6. PRIMARY Identity Lock

현재 storyboard에서 잘 나온 PRIMARY 남성을 identity master로 고정한다.

현재 팀이 선택한 `M-MC01 정석 센터형` identity를 기준으로 하되,
실제 구현에서는 **현재 승인 storyboard 속 얼굴 인상**이 최우선이다.

모든 주요 solo shot에서 다음이 같아야 한다.

- 얼굴 골격
- 눈/코/입 비율
- 헤어라인
- 머리 길이/색
- 피부 톤
- 귀/이어링 등 특징
- 기본 체형

## 금지

- S01과 S03이 다른 사람처럼 보임
- SAVE에서 얼굴 변화
- NEXT MOMENT에서 새 남자
- 동일 캐릭터를 명목상만 같다고 표시

---

# 7. MANY MOMENTS ≠ MANY PEOPLE

이번 49번의 절대 규칙.

`DELICATE MOMENTS`, `DEEPENING`, `MEMORY FIELD`는
여러 남자를 소개하는 장면이 아니다.

PRIMARY 한 사람의:

- Stage
- Backstage
- Interview
- Smile
- Hand
- Mic
- Walking
- Live
- Performance
- Detail

등 **서로 다른 순간**이다.

Secondary 멤버는 group/performance context에서만 등장한다.

---

# 8. 단계별 제작 순서

## PHASE A — SCENE MASTER PACK

먼저 motion 없이 scene master를 만든다.

필수:

- PRIMARY hero shot
- Afterimage
- White person reveal
- Detail shots
- Save
- Connection entry
- Next Moment
- Deepening scenes
- Memory Field
- Tree climax

### 제출
`01_SCENE_MASTER_PACK/`

각 이미지 옆에:
- storyboard ref
- shot id
- identity status
- intended motion
- PASS/REVISION

표기.

**이 단계 PASS 전 motion 제작 금지.**

---

## PHASE B — EXACT TIMING ANIMATIC

Scene Master만 이용해 정지 기반 animatic을 만든다.

목적:

- shot 순서
- shot duration
- narrative flow
- Superhuman rhythm
- LoveTree emotional causality

만 검증.

이 단계에서는 화려한 motion을 넣지 않는다.

### 제출
`02_EXACT_TIMING_ANIMATIC/`

- `49_v2_storyboard_lock_animatic_29.252s.mp4`
- `49_v2_shot_registry.md`

---

## PHASE C — 12초 MOTION PROOF

Full 29초 금지.

먼저 다음 구간만 실제 cinematic clip으로 만든다.

```text
FIRST GLIMPSE
→ AFTERIMAGE
→ PERSON REVEAL
→ DELICATE MOMENTS
→ SAVE THIS MOMENT
→ CONNECTION begins
```

12초 내외.

### 여기서 증명할 것

1. PRIMARY가 동일인인가
2. 정지 사진이 아니라 실제 장면처럼 움직이는가
3. 카메라가 움직이는가
4. glass/reflection/white-space가 실제 공간으로 느껴지는가
5. SAVE가 사건으로 보이는가
6. SAVE 흔적이 CONNECTION의 시작으로 이어지는가
7. Superhuman의 공격적인 cinematic language가 살아있는가

### 제출
`03_12SEC_MOTION_PROOF/`

- individual shot clips
- assembled 12sec MP4
- storyboard comparison sheet

**12초 PASS 전 Full 제작 금지.**

---

## PHASE D — FULL CINEMATIC

12초 PASS 후에만 S01~S21 전체를 제작.

영상 제작 후:

1. Final 29.252s cinematic MP4
2. Desktop HTML wrapper
3. Mobile responsive wrapper
4. 기능 QA

순서.

HTML을 먼저 만들지 않는다.

---

# 9. Motion 방식 — 장면 자체를 움직인다

정지 portrait를 CSS로 밀지 않는다.

가능한 방법:

- image-to-video
- reference-guided video generation
- first/last frame controlled generation
- composited 2.5D scene with real separated depth layers
- WebGL only where portal/glass/liquid geometry is genuinely needed
- conventional editing / compositing

### 필요한 motion

- head/eye micro movement
- cloth/hair motion
- light change
- camera push/pull
- parallax
- foreground pass
- body turn
- walking
- group formation movement
- glass refraction
- portal motion
- branch/light growth

### 금지

`scale(1.00 → 1.08)` 하나를 camera push라고 보고하지 않는다.

---

# 10. Shot별 시각 재현 기준

## FIRST GLIMPSE
- storyboard의 dark cyan close 유지
- 첫 1~2초 hook
- 얼굴 절반의 shadow/light 대비 유지

## AFTERIMAGE
- reflection/glass
- 같은 PRIMARY
- 복제 얼굴 collage 금지

## PERSON REVEAL
- white 공간이 실제로 열림
- 얼굴/몸의 clean reveal

## DELICATE MOMENTS
- storyboard에 나온 손/마이크/무대/걷기/웃음 등
- PRIMARY의 여러 순간
- rapid micro-cuts

## SAVE THIS MOMENT
- golden/red light lock
- 순간이 실제로 고정되는 사건
- UI 버튼이 주인공이 아님

## CONNECTION / WHY NEXT?
- SAVE trace에서 출발
- tunnel/portal이 그 흔적에서 열림
- 랜덤 SF portal 금지
- 다음 Moment를 실제로 연다

## NEXT MOMENT
- 같은 PRIMARY
- 다른 면/다른 상황
- "그래서 다음 걸 봤다"가 읽혀야 함

## DEEPENING
- 여러 순간
- 다른 사람들 소개가 아님

## MEMORY FIELD
- storyboard처럼 cosmic depth 가능
- 단, 사진 카드가 단순 floating gallery가 되지 않게
- saved moments가 path 위에 존재해야 함

## TREE EMERGES
- path/trace가 root/branch로 전환
- 완성 Tree PNG 단순 fade-in 금지

## LOVETREE
- Tree climax가 먼저
- title은 마지막 보조

---

# 11. Storyboard Lock 위반 조건

아래 중 하나라도 발생하면 즉시 REJECT.

- storyboard와 다른 PRIMARY
- 새로운 solo male 추가
- scene의 핵심 composition 변경
- dark/white/red/cyan 색 흐름 붕괴
- Connection 이유 삭제
- floating portrait wall 재도입
- alpha-head collage
- generic sci-fi HUD
- 완성 Tree 이미지 갑작스러운 등장
- CSS transform 중심 motion
- scene clip 없이 바로 full HTML 제작
- 스토리보드보다 구현 프레임 품질 저하

---

# 12. 최종 제출 구조

```text
V2_STORYBOARD_LOCK_IMPLEMENTATION/
├─ 00_LOCKED_STORYBOARD/
├─ 01_SCENE_MASTER_PACK/
├─ 02_EXACT_TIMING_ANIMATIC/
├─ 03_12SEC_MOTION_PROOF/
├─ 04_FULL_SHOT_CLIPS/          # 12초 Gate 승인 후
├─ 05_FINAL_CINEMATIC/          # 승인 후
├─ 06_HTML_WRAPPER/             # 영상 승인 후
└─ 07_QA/
```

---

# 13. 이번 첫 제출은 여기까지만

지금 즉시 제작할 것:

1. `SCENE MASTER PACK`
2. `29.252s EXACT TIMING ANIMATIC`
3. `12SEC MOTION PROOF`

아직 하지 말 것:

- Full 29초 motion
- Full HTML
- Mobile QA
- Modal polish
- 추가 feature
- 새로운 캐릭터 생성

---

# 14. 성공 기준

이번 프로젝트는 다음 질문으로 판정한다.

> **“스토리보드 정지 프레임이 너무 잘 나와서 기대했던 바로 그 영상이 실제로 움직이기 시작했는가?”**

다음 질문은 모두 YES여야 한다.

- storyboard와 구현 첫 프레임이 거의 같은가
- PRIMARY가 같은 사람인가
- 장면 자체가 살아 움직이는가
- Superhuman의 camera/space energy가 있는가
- LoveTree의 Save→Connection→Next Moment 인과가 보이는가
- 마지막 Tree가 앞 경로의 결과인가
- HTML 기술이 아니라 영상 자체가 멋있는가

---

# 15. 최종 한 줄 지시

> **스토리보드를 다시 디자인하지 마라. 스토리보드 프레임을 고해상도 Scene Master로 복원하고, 그 Scene Master를 실제 Shot Clip으로 움직인 뒤, 승인된 영상만 HTML에서 재생하라.**

> **STORYBOARD IS THE SPEC. VIDEO FIRST. HTML LAST.**

**END OF WORK ORDER**
