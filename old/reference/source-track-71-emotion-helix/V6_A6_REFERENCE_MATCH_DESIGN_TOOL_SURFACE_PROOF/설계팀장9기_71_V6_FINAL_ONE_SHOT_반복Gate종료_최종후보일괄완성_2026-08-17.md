# 설계팀장9기 — Track 71 V6 FINAL ONE-SHOT / 반복 Gate 종료 · 최종 후보 일괄완성 지시

**작성일:** 2026-08-17  
**작성자:** 설계팀장 9기  
**수신:** LoveTree 디자인팀장  
**Track:** `71_러브트리_감정경로헬릭스_인터랙티브대문_V1`  
**작업 폴더:** `V6_A6_REFERENCE_MATCH_DESIGN_TOOL_SURFACE_PROOF`  
**Drive Folder ID:** `136LYzF0qNWpanbGhLpo4nJGn_dUwT8O7`

---

# 0. 제품오너 긴급 최종 지시

지금까지 Pair Proof를 너무 많이 반복했다.

이제 더 이상:

- Pair Proof v6
- Pair Proof v7
- shader 미세조정
- optical map 추가 실험
- 새로운 Gate 세분화

를 하지 않는다.

**이번 V6에서 최종 후보를 한 번에 완성한다.**

---

# 1. 현재 상태

```text
V1~V5 = FAILURE / COMPARISON ONLY
V6 = FINAL ONE-SHOT IMPLEMENTATION

추가 Pair Proof = 금지
추가 중간 Gate = 금지
V7 = 현재 계획 없음
```

---

# 2. 목표

이번 작업의 목표는 단 하나다.

> Reference의 우측 Jelly / Glass object를 사용자가 보자마자 “거의 같은 계열”이라고 느끼게 하는 완성 HTML을 만든다.

물리적으로 완벽한 WebGL refraction 구현이 목표가 아니다.

**보이는 결과가 우선이다.**

---

# 3. 구현 전략 — 가장 빠른 방법 사용

## 1순위

디자인툴에서 Reference와 최대한 비슷한 6개 Jelly Lens를 만든다.

- Photoshop
- Figma
- After Effects
- Blender compositing
- SVG
- 기타 툴

어떤 툴이든 허용.

## 2순위

완성된 Jelly Lens를:

- transparent PNG
- WebP
- SVG

형태로 export.

## 3순위

HTML에서 정확한 위치/크기/회전으로 배치.

즉:

> **WebGL shader가 발목을 잡으면 버리고, pre-rendered glass asset을 사용한다.**

---

# 4. 반드시 지킬 Reference 특징

6개 object 모두:

- ring 아님
- donut 아님
- inner hole 없음
- solid transparent jelly
- irregular oval/blob
- 각기 다른 크기
- 각기 다른 회전
- 일부 overlap
- 일부 viewport crop
- clear center
- local dark reflection
- local blue/amber/red caustic
- glass-like specular

---

# 5. 흰 캡슐 금지

다시 강조:

- broad white body 금지
- milky white capsule 금지
- white oval card처럼 보이는 것 금지

body는 투명하고,
광학효과는 edge/local zone에 집중.

---

# 6. 실제 Refraction을 완벽하게 못 만들면

이번엔 그 때문에 다시 Gate를 돌리지 않는다.

선택지:

### A
디자인툴에서 typography까지 포함해 refraction이 보이는 composite를 만든다.

### B
Jelly asset 안에 distorted typography fragment를 baked texture로 포함한다.

### C
SVG filter / displacement를 일부만 사용한다.

**시각적 결과만 Reference와 가까우면 허용.**

---

# 7. 중앙 Giant Typography

Reference처럼 크게 유지.

LoveTree 후보:

- PATH
- MOMENT
- MEMORY
- LOVE

조건:

- crop 적극 허용
- Jelly 아래/안/사이에서 보임
- Jelly와 겹칠 때 일부 distortion이 느껴지면 충분

완벽한 물리굴절보다 전체 composition이 우선.

---

# 8. 좌측 레이아웃 LOCK

유지:

- 좌상단 `LoveTree`
- 좌중단 짧은 copy
- 좌하단 black circular CTA
- 중앙 giant typography
- 우측 Jelly cluster

새 레이아웃 발명 금지.

---

# 9. 6개 Jelly 배치

이번엔 전체 화면으로 바로 간다.

권장:

- J1 large upper
- J2 medium upper-mid
- J3 large center
- J4 diagonal center-lower
- J5 small irregular
- J6 partial off-screen

6개 모두 같은 타원 복붙 금지.

---

# 10. Keyword

필요한 경우:

- MOMENTS
- CONNECTION
- REPLAY
- MY TREE
- FIRST
- RETURN

중 4~6개 사용.

단 keyword 때문에 Jelly 모양이 망가지면 keyword를 줄인다.

---

# 11. Light/Dark

Reference에 light/dark state가 있다면
이번 최종 후보에 **정적 light state 하나만 완성**한다.

light/dark 전환 기능은 이번에 필수 아님.

---

# 12. Motion

이번엔 최소 motion만 허용.

가능:

- 2~4px slow floating
- 1~2° very slow rotation
- subtle cursor parallax

하지만 시간이 걸리면 **정지 상태만 완성**해도 된다.

시각 완성도가 우선.

---

# 13. VIDEO UNDER JELLY

이번 최종 V6에서 필수 아님.

영상 연결 때문에 또 늦어지면 하지 않는다.

최종 후보에서:

- jelly visual
- layout
- typography
- CTA

가 Reference처럼 보이는 것이 우선.

---

# 14. 디자인팀 임의 해석 금지

이번엔 다음 금지:

- 새로운 컨셉 추가
- helix 부활
- ring 부활
- 다른 색 테마
- LoveTree식으로 과도한 재해석
- 꽃/나무/하트 추가
- 새로운 mascot 추가

Reference 그대로에 가깝게.

---

# 15. 제출물 — 딱 4개

이번 V6에서 한 번에 제출:

1. `71_V6_FINAL_REFERENCE_COMPARISON.png`
2. `71_V6_FINAL_CANDIDATE_SCREEN.png`
3. `71_V6_FINAL.html`
4. `71_V6_FINAL_NOTES.md`

중간 Pair Proof 제출 금지.

---

# 16. 최종 비교본

`71_V6_FINAL_REFERENCE_COMPARISON.png`

구성:

```text
LEFT = Reference 18s frame
RIGHT = Final Candidate
```

동일 1920×1080.

---

# 17. PASS 기준

이번엔 아래 7개만 본다.

1. ring처럼 안 보임
2. 흰 캡슐처럼 안 보임
3. 6개가 서로 다른 transparent jelly object로 보임
4. Reference와 비슷한 우측 cluster
5. giant typography와 Jelly가 잘 겹침
6. 전체 화면이 Reference와 같은 디자인 family로 즉시 읽힘
7. LoveTree 치환이 촌스럽지 않음

---

# 18. 80~90% 시각 유사도면 종료

이번에는 pixel-perfect shader를 요구하지 않는다.

Reference와 나란히 봤을 때:

> “같은 디자인을 LoveTree로 바꿨다”

라고 느껴질 정도면 종료한다.

세부 optical physics 때문에 또 v7/v8로 반복하지 않는다.

---

# 19. 이번 작업 이후

V6 final이 위 기준을 만족하면:

```text
TRACK 71 = FINAL CANDIDATE
```

로 종료한다.

추가 개발은 제품에 실제 채택할 때 별도 개발 단계로 넘긴다.

---

# 20. 최종 지시

**더 이상 실험하지 말고 완성하세요.**

Reference를 보고:

- 젤리 6개
- giant type
- 좌측 logo/copy/CTA
- transparent glass mood

를 그대로 한 화면에 완성한다.

WebGL이 어렵다면 디자인툴에서 만들어 이미지로 얹어도 된다.

이번 V6는 연구 단계가 아니라 **납품 단계**다.

**다음 보고는 중간 결과가 아니라 FINAL 4종만 제출한다.**
