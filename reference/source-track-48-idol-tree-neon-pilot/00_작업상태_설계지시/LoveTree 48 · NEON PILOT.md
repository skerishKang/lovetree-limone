# LoveTree 48 · NEON PILOT
# 3기 설계팀장 긴급 방향전환 지시
## 참고영상 최대충실도 Cinematic Hero HTML 즉시 제작 v1

- 작성일: 2026-08-07
- 발행: LoveTree 3기 설계팀장
- 수행: LoveTree 디자인팀장
- 대상: `48_아이돌러브트리_네온파일럿_분류대기`
- 신규 지시 번호: 19
- 우선순위: 제품 오너 최신 직접 지시
- 이전 `18_Gate2B-A...` 지시: **SUPERSEDED PARTIAL**
- Production 반영: 금지
- 기존 승인 자산 덮어쓰기: 금지

# 0. 제품 오너의 최신 의도

이번 작업의 핵심을 다시 정의한다.

제품 오너가 원하는 것은 캐릭터 턴어라운드 자료집이 아니다.

원하는 결과는 **지정된 참고영상과 최대한 같은 시각적 인상, 움직임, 화면 전환, 카메라 리듬을 가진 LoveTree 사이트 대문/배경 HTML​**이다.

즉 이번 작업의 우선순위는 다음이다.

```text
참고영상 시각 충실도
> 움직임과 전환 충실도
> 아이돌의 매력과 동일성
> 사이트 대문으로서의 완성도
> LoveTree 의미 치환
> 추가 캐릭터 자료 제작
```

LoveTree를 과도하게 해석해서 참고영상과 다른 디자인을 만들지 않는다.

이번에는 먼저:

> **“이 참고영상을 웹페이지 자체가 재생하는 것처럼 보이게 한다.”**

가 목표다.

LoveTree는 참고영상의 세계를 바꾸는 것이 아니라 그 안에 들어가는 콘텐츠만 바꾼다.

---

# 1. 지금 즉시 중단할 작업

현재 진행하던 이미지 반복 생성은 일단 멈춘다.

특히 다음은 즉시 PAUSE한다.

```text
A_135 반복 재생성
A_315 반복 재생성
A의 완전한 8방향 확보 작업
B~E Intermediate 16장 대량 생성
추가 Character Bible
추가 정면/측면 캐릭터 사진
새 얼굴 캐스팅
의상 디테일 미세 재생성
```

현재까지 확보한 다음 자산을 사용한다.

- 승인 계열 5인 캐릭터
- 전신 Character Bible
- A~E Cardinal 4방향, 총 20장
- 멤버별 승인 얼굴
- Costume Geometry Lock
- 기존 HUD SVG
- Reference Video Analysis
- Transition Grammar

**새 이미지는 HTML을 만든 뒤 특정 장면에 정말 필요한 것으로 판명된 경우에만 생성한다.**

앞으로는:

```text
사진을 먼저 잔뜩 생성
→ 나중에 HTML
```

이 아니라,

```text
현재 자산으로 HTML 제작
→ 실제 화면 확인
→ 부족한 자산 특정
→ 필요한 것만 추가
```

방식으로 전환한다.

---

# 2. 최우선 산출물

이번 작업의 주 산출물은 하나다.

```text
lovetree-48-neon-pilot-cinematic-hero-v1.html
```

이 HTML은 단순 데모 카드나 캐릭터 뷰어가 아니다.

**LoveTree 웹사이트의 첫 화면 전체를 차지할 수 있는 움직이는 Cinematic Hero / Background Prototype**이어야 한다.

브라우저를 열면 별도 클릭 없이 즉시 움직이기 시작해야 한다.

데스크톱에서는:

```text
100vw × 100dvh
```

를 기본으로 한다.

참고영상이 하나의 영상처럼 진행되는 것과 마찬가지로 HTML도 하나의 연속된 시네마틱 시퀀스로 진행한다.

---

# 3. 가장 중요한 제작원칙 — 참고영상을 최대한 그대로 따라간다

이번 작업에서 “영감을 받았다”, “비슷한 분위기다” 수준은 불합격이다.

참고영상의 다음 요소를 가능한 한 그대로 추적한다.

- 장면 순서
- 컷의 길이
- 카메라 방향
- 화면 중앙의 주요 피사체
- 인물 크기
- 얼굴 크롭 정도
- 검정과 흰색의 교차
- Electric Lime 비율
- HUD의 위치
- 원형 프레임 크기
- 스캔 라인
- 렌즈 확대
- 피시아이 느낌
- 플래시 시점
- 화면 밀도
- 장면 속도
- 전환 방식
- 시선 유도
- 5인 → 개인 → 5인 구조

참고영상은 **레이아웃 참고자료가 아니라 Motion Storyboard**로 취급한다.

가능한 범위에서 장면별 타이밍도 원본과 맞춘다.

기존 1초 간격 및 2초 간격 Contact Sheet를 반드시 사용한다.

구현하면서 동시에 다음을 작성한다.

```text
reference-shot-map-v1.md
```

내용:

```text
REFERENCE TIME
REFERENCE SHOT
LOVETREE REPLACEMENT
TRANSITION
IMPLEMENTATION METHOD
```

그러나 Shot Map 작성을 별도 Gate로 삼아 HTML 제작을 늦추지 않는다.
분석과 구현을 병행한다.

---

# 4. LoveTree로 바꾸는 범위는 “내용”에 한정한다

참고영상의 시각언어는 최대한 그대로 유지한다.

바꾸는 것은 의미뿐이다.

예:

```text
원본 인물
→ 현재 승인된 LoveTree 5인 캐릭터

원본 분석 정보
→ Moment 정보

원본 대상 스캔
→ Moment Scan

원본 파일럿/멤버 분석
→ Member Dossier

원본 Mission Route
→ Moment Route / Connection

원본 기체 경로
→ MV / Fancam / Shorts / Interview Route

원본 출격
→ 다음 Moment 진입

원본 Squadron
→ Group LoveTree
```

그러나 이 의미를 설명하기 위해 화면에 긴 문장을 쓰지 않는다.

**참고영상과 같은 비주얼을 먼저 보이게 한다.**

LoveTree 텍스트는 짧은 HUD Label 수준만 사용한다.

예:

```text
MOMENT 01
FIRST SIGNAL
MEMBER A
NEXT ROUTE
REPLAYED
SAVED
CONNECTION
```

필요하면 최종 End Card에서만:

```text
LOVETREE
FOLLOW THE MOMENT
```

또는

```text
내 마음이 움직인 순간부터
```

정도를 사용한다.

---

# 5. 참고영상의 전체 장면 구조를 그대로 따른다

## SCENE A · 5인 Group Hook

가장 중요하다.

첫 1초 안에 5명이 보인다.

긴 소개문이나 로고 애니메이션부터 시작하지 않는다.

화면:

```text
Black
5 silhouettes / 5 idols
Electric Lime
reflective ground
thin technical light
group geometry
```

처음부터 “아이돌 다섯 명을 해부·분석하는 세계”라고 느껴져야 한다.

현재 Character Bible의 5인 디자인을 활용한다.

필요하면 5인의 단일 Cardinal 이미지를 레이어링해 그룹 구도를 만든다.

새 Group Hero를 만들기 위해 작업 전체를 중단하지 않는다.

---

# 6. Member Scan

참고영상처럼 한 사람씩 빠르게 분석한다.

구조:

```text
full body
→ medium
→ face
→ eye
→ costume
→ accessory
```

현재 가진 동일 인물 이미지를 CSS/Canvas crop으로 확대해서 사용한다.

**얼굴 클로즈업 이미지를 매번 새로 생성하지 않는다.**

정면 원본 하나에서:

```text
face crop
eye crop
mouth crop
costume crop
glove crop
belt crop
```

을 실시간으로 추출할 수 있다.

원형 마스크와 HUD가 같은 좌표를 공유하게 한다.

---

# 7. Thermal / Scan 장면

별도의 열화상 인물 사진을 생성하지 않는다.

현재 인물 이미지를 Canvas/WebGL/CSS filter로 변환한다.

가능한 구현:

```text
grayscale
contrast
false-color gradient
threshold
scan-line
noise
radial mask
```

참고영상에서:

```text
Thermal
→ Face
→ Eye
```

로 같은 위치에서 변하는 느낌을 그대로 만든다.

---

# 8. Face / Eye Match Cut

이 장면은 참고영상의 핵심이다.

화면 중앙의 눈 또는 얼굴 중심점을 유지한 채:

```text
face
→ eye
→ HUD ring
→ detail
```

로 전환한다.

장면마다 위치가 바뀌면 안 된다.

같은 중심좌표를 유지한다.

전환시간은 짧고 공격적으로 한다.

대략적인 인상:

```text
0.4s ~ 1.2s
```

단, 실제 컷 길이는 Reference Contact Sheet를 우선한다.

---

# 9. White Turntable

여기서만 화면을 완전히 White/Cool Gray로 전환한다.

검정 네온 화면 중간에 갑자기 새하얀 전시공간이 열리는 대비가 중요하다.

현재 가진 4 Cardinal을 사용한다.

```text
000 FRONT
090 LEFT
180 BACK
270 RIGHT
```

이번 v1에서 억지로 완전한 360도를 만들 필요 없다.

4방향을:

```text
hard frame
short dissolve
snap rotation
```

방식으로 보여주어도 된다.

단:

**한 PNG에 CSS rotateY를 걸어 가짜 뒷면을 만드는 것은 금지한다.**

이번 HTML의 성공 여부는 “부드러운 360도”보다 **참고영상처럼 White Character Exhibition 장면이 강하게 들어가는가**가 우선이다.

HTML을 본 뒤 45° 중간 프레임이 반드시 필요하다고 판단되면 그때 생성한다.

---

# 10. Black ↔ White 전환

아래 전환은 반드시 구현한다.

```text
Black Analysis Lab
→ White Iris
→ White Character Exhibition
```

그리고 다시:

```text
White Exhibition
→ iris close / flash
→ Black Analysis Lab
```

단순 CSS fade로만 처리하지 않는다.

중앙의 원형 Iris가 열리고 닫히는 구조를 사용한다.

---

# 11. Journey / Flight Scene

이 장면에서 참고영상의 비행 세계를 삭제하지 않는다.

LoveTree답게 만들겠다고 Tree 그래프나 영상 카드만 띄우는 것은 금지한다.

반드시:

```text
sky
cloud
flight
velocity
vehicle
cockpit
route
```

이미지가 있어야 한다.

단, 캐릭터 사진 제작에 다시 며칠을 쓰지 않는다.

기체는 우선:

- SVG
- CSS 3D
- Canvas
- Three.js procedural geometry
- 1개 기본 clean plate

중 가장 빠르게 원본 인상을 만들 수 있는 방식을 사용한다.

멤버별 차이는 전체 기체를 새로 5장 생성하기보다:

```text
point color
HUD
route color
call sign
```

으로 준다.

---

# 12. Cockpit POV

참고영상처럼 Cockpit이 한 번만 등장하고 끝나면 안 된다.

멤버 또는 Route 전환 시 다시 나타날 수 있다.

사용자가 “내가 이 세계 안으로 들어온 것 같다”고 느껴야 한다.

화면:

```text
foreground cockpit frame
central sky / route
circular HUD
member accent
current Moment
next signal
```

Moment 카드 UI를 큰 웹 카드처럼 띄우지 않는다.

HUD 안에 흡수한다.

---

# 13. Transition Grammar

다음 전환은 필수다.

```text
Black → White
= White Iris

Member A → Member B
= Lime Scan Wipe

Face → Eye
= Same-center Match Cut

Vehicle → Cockpit
= HUD Ring Push

Group Return → End Card
= Lime Full-frame Flash
```

참고영상처럼 보여야 한다.

과도한 랜덤 글리치로 때우지 않는다.

---

# 14. 화면을 “사이트 배경”으로 사용한다

이번 결과는 일반 섹션형 홈페이지가 아니다.

처음 화면의 뒤 전체가 살아 움직인다.

구조 예:

```text
<body>
  <div class="cinematic-background">
      scene engine
  </div>

  <header>
      LoveTree logo
      navigation
  </header>

  <div class="hero-ui">
      minimal copy
      CTA
  </div>
</body>
```

Hero UI는 영상 위에 얹히며,
배경의 시네마틱 타임라인은 계속 재생된다.

스크롤을 해야 영상이 움직이는 구조로 제한하지 않는다.

사이트에 들어오면 바로 재생한다.

---

# 15. 재생 길이

참고영상이 약 45.33초이므로 우선 v1도 **약 45초 전체 시퀀스**를 목표로 한다.

페이지 로드:

```text
0s
→ cinematic start
→ 약 45s
→ end card
→ short hold
→ seamless restart
```

첫 화면에서 사용자가 기다려야 핵심 화면이 나오는 것은 안 된다.

첫 1초부터 강한 화면이 나와야 한다.

---

# 16. 구현 기술

정적인 HTML 슬라이드쇼는 불합격이다.

허용:

- HTML / CSS
- SVG
- Canvas 2D
- WebGL / Three.js
- Web Animations API
- requestAnimationFrame
- CSS clip-path
- filter
- mask
- mix-blend-mode
- transform
- image sequence

가장 적절한 조합을 사용한다.

권장 구조:

```text
Timeline engine
+ DOM/SVG HUD
+ Canvas effects
+ image layers
+ procedural flight layer
```

모든 텍스트는 이미지 안에 박지 않고 DOM/SVG로 작성한다.

---

# 17. 사용자 조작

이번 v1은 영상과 같은 자동 재생이 우선이다.

필수:

```text
AUTO PLAY
PLAY / PAUSE
MUTE / SOUND 상태
RESTART
```

선택:

```text
member click
timeline scrub
scene skip
```

그러나 인터랙션 때문에 영상 같은 자동 시퀀스가 망가지면 자동 시퀀스를 우선한다.

---

# 18. 사운드

브라우저 자동재생 정책 때문에 기본은 muted로 시작한다.

참고영상 원본 음원을 그대로 제품 자산으로 삽입하는 것은 하지 않는다.

필요하면 별도의 자체 제작 sound bed를 나중에 연결한다.

이번 Gate는 시각·동작 우선이다.

---

# 19. LoveTree 화면이라고 과도하게 설명하지 않는다

이번 HTML에서 다음은 금지한다.

- 큰 나무 그래픽
- 꽃잎
- 종이 카드 UI
- 다이어리 화면
- 일반 LoveTree 성장 Tree
- 여러 개의 큰 Moment 카드
- 대시보드
- 통계 패널
- 감성 장문
- 커뮤니티 UI

이번 48번은 기존 LoveTree의 종이·꽃 UI를 대체하는 것이 아니다.

**아이돌 콘텐츠의 한 Moment를 강렬하게 보여주는 별도의 움직이는 대문/배경 스타일 후보**다.

---

# 20. 이미지 신규생성 규칙

지금부터 신규 이미지는 “HTML에서 필요함이 확인된 것”만 허용한다.

예:

```text
현재 자산으로 Group Hook이 성립
→ 새 Group Hero 생성 금지

현재 정면에서 얼굴/눈 crop 가능
→ Face/Eye 사진 생성 금지

Cardinal 4장으로 White Exhibition 성립
→ Intermediate 생성 보류
```

정말 부족할 가능성이 높은 것은:

```text
1. clean cockpit plate
2. clean vehicle/flight plate
3. 필요 시 한 장의 5인 clean group hero
```

정도다.

그마저도 CSS/SVG/3D 조합으로 가능한지 먼저 검토한다.

**사진 20장, 40장을 다시 만드는 방식으로 돌아가지 않는다.**

---

# 21. 참고영상 유사도 검증

완성 후 “멋있다”는 이유로 PASS하지 않는다.

참고영상과 결과를 같은 타임라인으로 비교한다.

검증 시점:

```text
0s
1s
2s
3s
...
45s
```

1초마다:

- 장면 유형
- 인물 수
- 인물 크기
- Black/White
- 주요 색
- 카메라 축
- 원형 HUD 위치
- 화면 밀도
- 주요 전환
- 모션 방향

을 비교한다.

제출:

```text
reference-vs-result-contactsheet-v1.jpg
```

가능하면:

```text
REFERENCE | RESULT
```

형태로 같은 시간대 프레임을 나란히 둔다.

---

# 22. 자동 반려 기준

다음 중 하나라도 해당하면 수정한다.

### A. 참고영상과 다른 일반 SF 사이트가 됨

FAIL.

### B. 화면이 멋있지만 영상의 장면 순서가 사라짐

FAIL.

### C. 정적인 아이돌 사진 위에 HUD만 깜빡임

FAIL.

### D. 웹 대시보드처럼 보임

FAIL.

### E. “LoveTree로 재해석”하느라 원본의 비행·Cockpit·White Turntable을 제거함

FAIL.

### F. 사진을 계속 생성하느라 HTML이 없음

FAIL.

### G. 하나의 배경영상 MP4를 그냥 넣고 HTML이라고 주장함

FAIL.

참고영상을 삽입하는 것이 아니라 **HTML 레이어와 LoveTree 자산으로 그 움직임을 재구성**해야 한다.

### H. 캐릭터가 계속 바뀜

FAIL.

현재 승인된 5인을 유지한다.

---

# 23. 반드시 제출할 결과물

주 결과:

```text
lovetree-48-neon-pilot-cinematic-hero-v1.html
```

분석:

```text
reference-shot-map-v1.md
```

구현 보고:

```text
implementation-report-v1.md
```

검증:

```text
validation-results-v1.json
reference-vs-result-contactsheet-v1.jpg
```

실행 증거:

```text
desktop-execution-v1.mp4
mobile-execution-v1.mp4
```

필요한 경우 `assets/`를 별도 사용해도 된다.

이번 Gate에서는 단일 HTML 강박 때문에 품질을 낮추지 않는다.

최종 후보가 승인된 뒤 self-contained 패키징을 별도로 진행할 수 있다.

---

# 24. 이번 작업의 PASS 기준

최우선 질문은 이것이다.

> **원본 참고영상과 결과 HTML을 번갈아 보았을 때 “이 영상의 웹 버전을 만들었구나”라는 느낌이 즉시 드는가?**

다음이 모두 만족되어야 한다.

```text
첫 1초의 5인 훅
Black ↔ White 강한 대비
빠른 Member Scan
Face / Eye Match Cut
Circular HUD
White Character Exhibition
Flight
Cockpit
Electric Lime
Group Return
End Card
45초 내외의 연속 모션
```

그리고 그 안에 현재 승인된 LoveTree 5인이 들어가 있어야 한다.

LoveTree는 화면 형식을 바꾸는 것이 아니라 **콘텐츠의 의미와 브랜드만 바꾼다.**

---

# 25. 이후 Gate

이번 HTML v1을 제품 오너가 직접 본다.

그 뒤 부족한 장면을 다음처럼 판단한다.

예:

```text
“White Turntable만 끊겨 보인다.”
→ 필요한 Intermediate Angle만 추가

“Group Hook이 약하다.”
→ Group Hero 1장만 추가

“Cockpit의 실사감이 부족하다.”
→ Cockpit plate만 추가

“Face Match Cut이 약하다.”
→ 특정 멤버 close-up만 추가
```

이렇게 보완한다.

**다시는 결과 HTML을 보기도 전에 수십 장의 사진부터 만드는 방식으로 돌아가지 않는다.**

---

# 최종 명령

지금 해야 할 일은:

> **추가 아이돌 사진 생성이 아니라, 현재 확보된 자산을 사용해 참고영상과 최대한 같은 움직임을 가진 LoveTree Cinematic Hero HTML v1을 실제로 만드는 것.**

참고영상 시각 충실도가 이번 Gate의 최우선 평가 기준이다.

LoveTree로 과도하게 재해석하지 말 것.

먼저 똑같이 움직이게 만들 것.

그 다음에 LoveTree를 다듬는다.