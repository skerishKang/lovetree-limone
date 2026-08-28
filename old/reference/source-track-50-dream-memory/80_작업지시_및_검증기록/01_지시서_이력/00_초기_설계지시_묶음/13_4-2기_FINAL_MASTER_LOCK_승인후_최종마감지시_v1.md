# LoveTree 50 / 4-2기 — FINAL MASTER LOCK & RELEASE CANDIDATE v1
## Supernova 여성 트랙 / 현재 RAPID FINAL 시각안 승인 / 재설계 금지 / 최종본 마감

**문서 상태:** 제품 오너 시각 승인 반영 / 최종 마감 실행지시  
**대상:** LoveTree 4-2기 시네마틱 디자인팀장  
**대상 트랙:** `50_드림메모리_시네마틱_분류대기_v1`  
**현재 승인 후보:** `09_RAPID_FINAL_SUPERNOVA_v1`  
**작성일:** 2026-08-09  
**현재 상태:** `VISUAL DIRECTION APPROVED / FINAL MASTER FINISHING AUTHORIZED`

---

# 0. 제품 오너 최신 판정

제품 오너가 현재 `RAPID FINAL SUPERNOVA` 완성 후보를 직접 확인하고:

> **좋다. 마음에 든다. 이제 이 결과가 완성작으로 나와야 한다.**

고 판정했다.

따라서 지금부터는 **재설계 단계가 아니다.**

현재 결과의:

- PRIMARY 여성
- 장면 선택
- Storyboard 구조
- 색 흐름
- 컷 순서
- Save / Connection / Memory Field / Tree 구조
- 전체 Supernova cinematic tone

을 **FINAL VISUAL BASE**로 LOCK한다.

---

# 1. 절대 금지 — 좋아진 것을 다시 바꾸지 마라

지금부터 다음은 금지한다.

- 새 여성 얼굴 생성
- PRIMARY 교체
- 새 storyboard 제작
- 다른 benchmark 추가
- 장면 순서 재설계
- Tree 디자인 교체
- 색 체계 재설계
- 전체 컷을 다시 생성
- 새로운 UI 콘셉트 추가
- 현재 후보를 "더 창의적으로" 재해석

이번 목표는:

> **현재 좋은 후보를 손실 없이 최종 품질로 마감하는 것**

이다.

---

# 2. 현재 후보를 MASTER BASE로 복제

현재:

`09_RAPID_FINAL_SUPERNOVA_v1`

을 수정 덮어쓰기 하지 않는다.

새 폴더:

`10_FINAL_MASTER_SUPERNOVA_v1`

을 생성하고 현재 승인 후보를 복제/파생하여 작업한다.

기존 09는 제품 오너 승인 시점의 스냅샷으로 보존한다.

---

# 3. 최종 마감 범위

이번 Final Pass에서 허용되는 수정은 **품질 마감만**이다.

## 허용

- shot 간 color balance 미세 통일
- brightness / contrast 미세 보정
- 저화질 frame 교체 또는 원본 master로 교체
- transition seam 제거
- black frame / flash timing 미세 수정
- audio level 정리
- 영상 시작/끝 frame 정리
- mobile crop/letterbox 최적화
- HTML preload 안정화
- 버튼/텍스트 가독성 미세 개선
- console / overflow / broken asset 수정
- frame pacing 안정화

## 금지

- shot 자체를 다른 장면으로 교체
- 얼굴을 더 예쁜 새 사람으로 변경
- Story Beat 변경
- Connection 의미 변경
- Tree climax 재설계
- 전체 러닝타임을 임의로 크게 변경

---

# 4. 영상 최종 Master

현재 Desktop 후보:

- 약 29.1958초
- benchmark 약 29.206초
- 24 logical shots
- 23.976fps
- 1920×1080

이 구조를 유지한다.

## Desktop Final

권장:

- 1920×1080 이상
- H.264 High Profile
- AAC
- 23.976fps 유지 가능
- frame duplication / unexpected stutter 없음
- audio sync 정상
- 시작 black gap 최소
- 마지막 LOVETREE hold 안정

파일:

`50_SUPERNOVA_FINAL_MASTER_DESKTOP_v1.mp4`

---

# 5. Mobile Final

현재 모바일 방향을 유지한다.

단, 후반 Tree 전체 보존을 위한 letterbox는 허용하되:

- 갑작스러운 framing 변화처럼 보이지 않을 것
- 의도적인 cinematic composition처럼 보일 것
- Tree / LOVETREE 타이틀이 잘리지 않을 것
- portrait crop에서 PRIMARY 얼굴이 과도하게 잘리지 않을 것

파일:

`50_SUPERNOVA_FINAL_MASTER_MOBILE_v1.mp4`

---

# 6. Motion 한계 처리

현재 후보는 일부 구간에서 true image-to-video보다:

- push
- pan
- whip
- scene-master based motion

비중이 높다.

이번 Final Pass에서는 이를 이유로 전체를 다시 만들지 않는다.

다만 시청 중 **명백히 slideshow처럼 느껴지는 shot**이 있다면 해당 shot만 국소적으로 보완한다.

원칙:

> **국소 repair만 허용 / 전체 rebuild 금지**

---

# 7. Save → Connection → Tree 인과 유지

현재 LoveTree 의미 구조를 절대 훼손하지 않는다.

최종 영상에서도:

```text
Moment
→ Save
→ trace
→ Connection
→ Next Moment
→ accumulated moments
→ Memory Field
→ Tree Bloom
→ LOVETREE
```

가 읽혀야 한다.

Final polish 과정에서 화려한 effect를 추가해 이 인과를 가리지 않는다.

---

# 8. HTML FINAL WRAPPER

현재 wrapper의:

- autoplay muted
- Sound
- Replay
- Skip to Bloom
- ENTER LOVETREE

기능을 유지한다.

최종 HTML은 영상이 주인공이어야 한다.

## 필수

- preload
- desktop/mobile responsive
- no horizontal overflow
- console error 0
- page error 0
- asset path 안정
- Replay 정확히 처음부터
- Skip to Bloom 정확한 위치
- Sound 상태 명확
- ENTER LOVETREE 동작 유지

## 금지

- 새로운 card UI
- scene navigation panel 추가
- 정지사진 slideshow 별도 추가
- benchmark 설명 패널 추가

파일:

`50_SUPERNOVA_FINAL_MASTER_WRAPPER_v1.html`

---

# 9. 최종 검증

최종 제출 전 직접 실행하여 확인한다.

## Visual

- PRIMARY 얼굴이 중간에 다른 사람으로 바뀌지 않는가
- 저화질 확대가 눈에 띄지 않는가
- shot rhythm이 무너지지 않는가
- Tree climax가 충분히 보이는가
- title hold가 너무 짧지 않은가
- desktop/mobile 모두 의도된 framing인가

## Technical

- Desktop 전체 uninterrupted playback
- Mobile 전체 uninterrupted playback
- console error 0
- page error 0
- overflow 0
- broken asset 0
- replay PASS
- skip PASS
- sound PASS
- enter PASS

---

# 10. 최종 비교자료

새 storyboard를 만들지 않는다.

검증을 위한 한 장만 만든다.

`50_SUPERNOVA_APPROVED_vs_FINAL_MASTER.jpg`

구성:

- 승인 RAPID FINAL 대표 frame
- FINAL MASTER 동일 frame

목적:

> Finalization 중 기존 좋은 화면을 망가뜨리지 않았음을 확인.

---

# 11. 최종 패키지

`10_FINAL_MASTER_SUPERNOVA_v1`에 다음을 저장한다.

1. `50_SUPERNOVA_FINAL_MASTER_DESKTOP_v1.mp4`
2. `50_SUPERNOVA_FINAL_MASTER_MOBILE_v1.mp4`
3. `50_SUPERNOVA_FINAL_MASTER_WRAPPER_v1.html`
4. `50_SUPERNOVA_APPROVED_vs_FINAL_MASTER.jpg`
5. `50_SUPERNOVA_FINAL_CONTACT_SHEET.jpg`
6. `50_SUPERNOVA_FINAL_SHOT_MAP.md`
7. `50_SUPERNOVA_FINAL_VALIDATION.json`
8. `50_SUPERNOVA_FINAL_MASTER_PACKAGE.zip`

Working source는 별도 하위 폴더에 보존 가능하다.

---

# 12. 최종 상태 명칭

완료 후 팀이 임의로 `PRODUCT FINAL`을 선언하지 않는다.

보고 상태는:

`FINAL MASTER CANDIDATE — PRODUCT OWNER FINAL CONFIRMATION`

으로 제출한다.

제품 오너가 최종 확인하면 그때:

`PRODUCT OWNER APPROVED FINAL MASTER`

로 기록한다.

---

# 13. 보고 방식

이번에는 과정 보고를 길게 하지 않는다.

최종 보고만 한다.

필수:

- Final Desktop 파일
- Final Mobile 파일
- Final HTML
- duration / fps / resolution
- 변경한 마감사항 최대 5개
- 알려진 잔여 한계 최대 3개
- 최종 Visual 확인 요청

---

# 최종 명령

> **현재 RAPID FINAL 후보는 제품 오너가 시각적으로 승인했다. 이제 새 얼굴, 새 storyboard, 새 연출을 만들지 마라. 현재 결과를 FINAL VISUAL BASE로 잠그고 품질·전환·오디오·모바일·HTML 안정성만 마감한 뒤 `10_FINAL_MASTER_SUPERNOVA_v1`에 완성 패키지를 제출하라. 좋아진 화면을 더 고치다가 망가뜨리는 것이 이번 단계의 가장 큰 실패다.**

**LOCK THE GOOD VERSION.  
POLISH, DON'T REDESIGN.  
SHIP THE FINAL MASTER CANDIDATE.**
