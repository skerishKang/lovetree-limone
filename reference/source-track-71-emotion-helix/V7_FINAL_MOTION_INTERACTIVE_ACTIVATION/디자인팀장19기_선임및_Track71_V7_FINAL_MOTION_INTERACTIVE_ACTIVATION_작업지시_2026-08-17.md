# LoveTree 디자인팀장 19기 선임 및 Track 71 V7 FINAL MOTION ACTIVATION 작업지시

**작성일:** 2026-08-17  
**지시자:** 설계팀장 9기  
**수신:** 디자인팀장 19기  
**대상 Track:** `71_러브트리_감정경로헬릭스_인터랙티브대문_V1`  
**신규 작업 폴더:** `V7_FINAL_MOTION_INTERACTIVE_ACTIVATION`  
**Drive Folder ID:** `1NkwQWiqL7DKDzkIofO-YaWjr2XLlpokV`

---

# 0. 디자인팀장 19기 선임

당신을 **LoveTree 디자인팀장 19기**로 선임한다.

담당 범위:

- HTML / CSS / JS / WebGL / SVG 기반 시각 구현
- Reference 시각 충실도 유지
- 모션 / 인터랙션 구현
- 브라우저 실행 결과 검수
- 증거 영상 / QA 작성

금지:

- 제품 구조 임의 확정
- 데이터 계약 임의 변경
- 승인된 후보 덮어쓰기
- 새로운 컨셉 발명
- 기존 V1~V6 수정
- Production 배포
- main 병합

제품오너 최신 명시적 지시가 최우선이다.

---

# 1. 반드시 읽을 기준

작업 시작 전 아래를 직접 확인한다.

## Track 71 루트

`H:\내 드라이브\[26]\[[지피티 작업]]\[01_러브트리]\03_디자인채택본\71_러브트리_감정경로헬릭스_인터랙티브대문_V1`

## 최신 시각 authority

`V6_A6_REFERENCE_MATCH_DESIGN_TOOL_SURFACE_PROOF`

특히:

- `71_V6_FINAL_REFERENCE_COMPARISON.png`
- `71_V6_FINAL_CANDIDATE_SCREEN.png`
- `71_V6_FINAL.html`
- `71_V6_FINAL_NOTES.md`

V6의 정지 시각 결과를 **이번 V7의 visual authority**로 사용한다.

---

# 2. 현재 문제 — 정확히 이해할 것

V6 정지 화면은 Reference 계열로 상당히 정리됐다.

그러나 현재 `71_V6_FINAL.html`은 최종 화면을 실질적으로:

```css
main {
  background: #000 url(data:image/png;base64,...)
}
```

형태의 **큰 정지 이미지 한 장**으로 사용한다.

즉:

- Jelly가 실제 object가 아님
- Giant typography가 실제 layer가 아님
- 좌측 CTA가 실제 interaction layer가 아님
- Jelly 개별 motion 없음
- cursor 반응 없음
- Reference의 살아 있는 움직임이 없음

따라서 이번 V7의 목적은 **새 디자인이 아니라 V6 정지 후보를 실제 움직이는 HTML로 재구축하는 것**이다.

---

# 3. 이번 V7은 마지막 구현 단계다

이번에도 Gate를 여러 번 쪼개지 않는다.

```text
V6 = STATIC VISUAL AUTHORITY
V7 = FINAL INTERACTIVE MOTION CANDIDATE
```

추가 V8/V9 반복을 기본 계획으로 두지 않는다.

중간 Pair Proof 제출 금지.

**한 번에 완성본을 제출한다.**

---

# 4. 최우선 원칙 — V6 화면을 바꾸지 마라

이번 작업에서 새로 디자인하면 안 된다.

LOCK:

- 전체 black / white composition
- 좌상단 LoveTree
- 좌중단 짧은 copy
- 좌하단 circular CTA
- giant typography 위치 / crop
- 우측 6개 Jelly cluster
- Jelly의 color / transparency / optical mood
- Jelly별 크기 / 회전 / 대략적 위치
- 화면 여백
- Reference와 비슷한 editorial feeling

모션을 넣는다는 이유로 위치와 형태를 다시 디자인하지 않는다.

---

# 5. FULL-SCREEN SCREENSHOT 방식 폐기

최종 V7에서 아래 방식 금지:

```text
1920×1080 완성 screenshot 1장
→ full viewport background-image
→ 끝
```

V6 screenshot은:

- fallback
- visual comparison
- loading poster

로만 사용할 수 있다.

**실제 화면은 분리된 layer로 존재해야 한다.**

---

# 6. DOM / Layer 구조

최소 다음 layer를 실제 객체로 분리한다.

```text
ROOT
├─ background
├─ left-ui
│  ├─ LoveTree logo
│  ├─ copy
│  └─ circular CTA
├─ giant-type
│  ├─ PATH / MOMENT / MEMORY / LOVE
│  └─ crop / overlap
└─ jelly-cluster
   ├─ jelly-01
   ├─ jelly-02
   ├─ jelly-03
   ├─ jelly-04
   ├─ jelly-05
   └─ jelly-06
```

6개 Jelly는 반드시 **개별 DOM/SVG/WebGL object**여야 한다.

---

# 7. Jelly 구현 방식

V6에서 이미 시각적으로 잘 나온 Jelly asset을 활용해도 된다.

허용:

- transparent PNG
- WebP
- SVG
- CSS masked layer
- WebGL plane

물리적으로 완벽한 refraction을 새로 연구하지 않는다.

중요한 것은:

> V6 Jelly 시각이 유지되면서 실제 object로 움직이는 것.

---

# 8. Jelly Motion — 필수

각 6개 Jelly가 서로 다른 phase로 아주 천천히 떠 있어야 한다.

권장 범위:

- X drift: 약 ±4~10px
- Y drift: 약 ±6~14px
- rotation: 약 ±1~3°
- duration: 약 8~16초
- easing: `ease-in-out`
- alternate / loop

6개가 동시에 같은 방향으로 움직이면 안 된다.

**각 object의 phase / amplitude / duration을 다르게 한다.**

---

# 9. Motion의 성격

Reference처럼:

- liquid
- floating
- slow
- expensive
- editorial

이어야 한다.

금지:

- bounce
- spring
- 카드 튕김
- 빠른 wobble
- 과한 jelly shake
- 장난감 같은 흔들림
- 계속 큰 폭으로 회전

사용자가 멈춰 있는 화면을 보고도
“살아 있다”고 느낄 정도면 충분하다.

---

# 10. Cursor Parallax — 필수

Desktop에서 pointer에 따라 cluster가 미세하게 반응한다.

권장:

- cluster base: ±4~8px
- individual Jelly: ±6~16px
- giant typography: Jelly보다 약하게 ±2~5px

각 layer depth가 달라야 한다.

금지:

- pointer를 따라 Jelly가 직접 붙어 다님
- 30~50px씩 큰 이동
- motion sickness 수준

---

# 11. Hover Reaction — 최소한만

Jelly hover 시:

- scale +1~2%
- local highlight 약간 증가
- keyword opacity / contrast 미세 증가

허용.

금지:

- 카드처럼 위로 튀기
- shadow card
- 크게 확대
- 모양 새로 변형

---

# 12. Jelly Shape Deformation — 선택

시각 품질이 유지될 경우에만:

- scaleX / scaleY 0.5~1.5%
- subtle warp
- optical shimmer

정도 허용.

V6 Jelly가 못생겨진다면 **deformation은 생략**한다.

Motion은 position / rotation만으로도 PASS 가능.

---

# 13. Giant Typography Motion

Giant type는 Jelly보다 더 안정적이어야 한다.

허용:

- pointer parallax ±2~5px
- 아주 느린 1~3px drift

금지:

- 계속 좌우 이동
- marquee
- 큰 scale animation
- 글자 재배열

타이포는 배경 anchor 역할이다.

---

# 14. 좌측 UI

`LoveTree / copy / circular CTA`를 실제 DOM으로 만든다.

CTA는 실제 `<button>` 또는 `<a>`로 구현한다.

현재 단계에서 외부 route를 임의로 확정하지 않는다.

route authority가 없으면:

- hover/focus reaction
- click visual feedback

까지만 구현하고 Notes에 `ROUTE NOT ASSIGNED`라고 기록한다.

dead screenshot hotspot 방식 금지.

---

# 15. Jelly Keyword

V6에 사용된 keyword를 유지.

예:

- MOMENTS
- CONNECTION
- REPLAY
- MY TREE
- FIRST
- RETURN

키워드는 실제 text layer 또는 Jelly asset의 일부여도 된다.

단 hover/focus가 가능한 경우 실제 DOM text를 우선한다.

---

# 16. Click Interaction

제품 route를 임의 발명하지 않는다.

이번 V7에서 허용되는 최소 click interaction:

```text
Jelly click
→ selected state
→ 해당 Jelly가 2~4% 확대
→ optical highlight 증가
→ keyword active 표시
```

다시 click 또는 ESC:

```text
→ 기본 상태 복귀
```

실제 Track 이동 / video open / route 연결은
별도 제품오너 지시가 없으면 추가하지 않는다.

---

# 17. Keyboard / Accessibility

필수:

- Jelly가 interactive면 keyboard focus 가능
- `Enter / Space` selected state
- `ESC` release
- visible focus
- CTA actual button/a
- `prefers-reduced-motion`

Reduced Motion:

- idle animation 최소화 또는 정지
- 정보/기능은 그대로 사용 가능

---

# 18. Responsive

Desktop visual fidelity가 1순위다.

검수 기준:

## Desktop
- 1920×1080
- 1440×900

Reference composition 유지.

## Mobile
완전히 새 모바일 디자인을 만들지 않는다.

최소:

- horizontal overflow 0
- Jelly cluster가 화면 밖으로 완전히 사라지지 않음
- 좌측 UI 읽힘
- typography 과도한 겹침 없음

---

# 19. 절대 금지

이번 디자인팀장 19기는 아래를 하지 않는다.

- 새 Jelly 디자인
- ring / annulus / donut 부활
- helix 부활
- pink flower/tree/heart 추가
- LoveTree식 감성 장식 추가
- 한국어 명조체
- V6 정지 결과보다 못생긴 WebGL 실험
- 완성 screenshot 한 장을 final HTML로 사용하는 방식
- 새로운 이미지 생성
- V6/V5 파일 덮어쓰기

---

# 20. 구현 기술

가장 빠르고 안정적인 방식을 쓴다.

권장:

```text
HTML/CSS + JS
+ transparent Jelly assets
+ CSS transforms
+ requestAnimationFrame pointer parallax
```

Three.js/WebGL은 필수가 아니다.

**움직임을 위해 기술 복잡도를 올리지 않는다.**

---

# 21. QA — 정지 Fidelity

Animation을 pause한 상태에서:

`V7 screenshot`

은 `V6 FINAL CANDIDATE SCREEN`과 최대한 같아야 한다.

비교:

- Jelly 위치
- Jelly 크기
- typography crop
- 좌측 UI
- negative space
- overall balance

큰 차이가 생기면 FAIL.

---

# 22. QA — 실제 움직임

영상에서 반드시 증명:

1. 6 Jelly가 개별 phase로 천천히 움직임
2. pointer parallax 동작
3. giant type는 더 약하게 반응
4. hover state
5. Jelly selected state
6. ESC 복귀
7. CTA focus/hover
8. screenshot background 한 장이 아님

---

# 23. 최종 제출물

중간 결과 없이 아래만 제출.

1. `71_V7_FINAL_INTERACTIVE.html`
2. `71_V7_FINAL_MOTION_EVIDENCE.mp4`
3. `71_V7_FINAL_INTERACTION_EVIDENCE.mp4`
4. `71_V7_FINAL_STATIC_COMPARE.png`
5. `71_V7_FINAL_NOTES.md`

---

# 24. STATIC COMPARE

`71_V7_FINAL_STATIC_COMPARE.png`

구성:

```text
LEFT  = V6 FINAL STATIC AUTHORITY
RIGHT = V7 animation paused
```

V7이 모션을 위해 V6 디자인을 훼손하지 않았는지 확인한다.

---

# 25. 완료 기준

아래 8개 충족 시 Track 71 디자인 작업 종료 후보.

1. V6 visual fidelity 유지
2. full-screen screenshot final 방식 제거
3. 6 Jelly independent object
4. idle floating motion 실제 동작
5. pointer parallax 실제 동작
6. hover / selected interaction 동작
7. CTA actual DOM interaction
8. motion evidence 제출

---

# 26. 디자인팀장 19기 첫 업무

**바로 V7 완성본을 제작한다.**

중간 Pair Proof 제출 금지.

질문을 만들어 시간을 끌지 말고,
V6 정지 authority를 실제 motion layer로 분해해
한 번에 최종 5종을 제출한다.

이번 작업의 한 문장 목표:

> **“사진처럼 잘 나온 V6를, 디자인은 그대로 둔 채 실제로 살아 움직이는 HTML로 바꿔라.”**
