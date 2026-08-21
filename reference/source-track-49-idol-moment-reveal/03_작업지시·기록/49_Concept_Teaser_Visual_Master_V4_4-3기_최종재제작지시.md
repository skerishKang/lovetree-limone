# LoveTree 4-3기 최종 재제작 지시
## 49번 LoveTree Concept Teaser — Generated Visual Master Exact Build

**문서 상태:** 제품 오너 직접 지시 / 4-3기 실행용  
**작업 대상:** `49_아이돌모먼트_리빌포털_분류대기`  
**권장 신규 버전:** `lovetree-49-concept-teaser-visual-master-v4.html`  
**핵심 원칙:** 첨부 Generated Visual Master를 “참고 이미지”가 아니라 **완성 화면 명세서**로 사용한다.  
**Production 반영:** 금지  
**기존 버전 덮어쓰기:** 금지

---

## 0. 작업 목적

이번 작업은 더 이상 새로운 디자인을 제안하거나 재해석하는 작업이 아니다.

**제품 오너가 승인 방향으로 지정한 생성 이미지 1장을 이번 HTML의 절대 Visual Master로 사용한다.**

목표는 단 하나다.

> **전달된 이미지가 실제 브라우저에서 움직이고 클릭되는 HTML이 되었다고 느껴질 정도로 그대로 구현한다.**

기존 `R3`, `V2.2`, `V2.2 R1`, `V2.2 R2`의 시각 구조를 기준으로 삼지 않는다.

이전 결과물은 기능·코드 참고만 가능하다.

이번 버전의 **시각적 정답은 첨부한 새 Generated Visual Master 한 장**이다.

---

# 1. 가장 중요한 명령 — 새 디자인 금지

이번에는 다음 행동을 하지 않는다.

- 새 레이아웃 제안
- 섹션 순서 변경
- Hero 재구성
- 색상 재해석
- 타이포 재해석
- 다른 세계관 추가
- 산 배경 추가
- 콘서트 배경으로 전체를 덮기
- 검은 UI 중심으로 바꾸기
- 사이버/네온 UI로 바꾸기
- 별도의 캐릭터 소개 화면 추가
- hover reveal 추가
- 얼굴 교체 인터랙션 추가
- Mask effect 추가
- carousel 때문에 화면 구조 변경
- 기존 HTML의 UI를 억지로 섞기

**첨부 이미지가 이미 디자인이다.**

4-3기의 임무는 디자인이 아니라 **정확한 구현**이다.

---

# 2. 페이지 전체 구조 LOCK

페이지 순서는 아래 그대로다.

### SECTION 1
**HERO**

### SECTION 2
**MOMENT ARCHIVE**

### SECTION 3
**CONNECTION PREVIEW**

### SECTION 4
**THE LOVETREE**

### SECTION 5
**SAVE THIS MOMENT**

이 다섯 섹션 외 새로운 대형 섹션을 추가하지 않는다.

---

# 3. HERO — 첨부 이미지 그대로

첫 화면은 반드시 첨부 이미지의 비율과 분위기를 따른다.

### 왼쪽

작은 문구:

`ONE MOMENT CAN OPEN THE NEXT.`

메인:

**Keep the  
moment that  
moved you.**

보조:

`Save first.`  
`Understand the path later.`

버튼:

`EXPLORE MOMENTS →`

### 중앙·우측

**한 명의 동일한 남성 주인공**을 크게 사용한다.

중요:

- 얼굴 온전히 보이기
- 머리 온전히 자연스럽게
- 상반신 자연스럽게
- 목이나 어깨 잘못 잘리지 않게
- 몸통이 갑자기 끊겨 보이지 않게
- 사람을 타원형 안에 넣지 않기
- 인물 자체에 mask 씌우지 않기
- 얼굴 위 검은 오염 금지
- 반투명 polygon 금지
- 얼굴 위 효과 금지

첨부 이미지처럼:

- **크림/아이보리 셔츠**
- **따뜻한 자연광**
- **고급 editorial portrait**
- **정면보다 살짝 각도가 있는 자연스러운 표정**

으로 간다.

---

# 4. HERO 주변 네 Moment

첨부 이미지처럼 같은 인물의 네 가지 Moment를 배치한다.

### ON STAGE
무대에서 노래하는 순간

### THAT SMILE
밝게 웃는 candid 순간

### BACKSTAGE
카메라 직전 backstage 순간

### WALKING
걸어오는 순간 또는 자연스러운 외부 candid

여기서 가장 중요하다.

**같은 사진 4번 재활용 금지.**

각 Moment는 반드시 **서로 다른 사진**이어야 한다.

그러나 사람은 **같은 사람처럼 보여야 한다.**

---

# 5. Hero Light Path

이 이미지에서 매우 중요한 요소다.

Hero와 네 개 Moment 사이에

- 얇은 champagne-white 빛
- 미세한 glow
- 작은 luminous particle
- 아주 부드러운 곡선

으로 연결한다.

이건 단순 decorative line이 아니다.

**“이 사람의 여러 순간이 하나의 감정 경로로 연결되어 있다.”**

는 LoveTree의 핵심 시각 표현이다.

선을 굵은 SVG 선으로 만들지 말 것.

NASA UI처럼 만들지 말 것.

지도 Route처럼 만들지 말 것.

**빛이 자연스럽게 흘러가는 것처럼 만들어라.**

---

# 6. HERO에는 Hover Reveal 넣지 말 것

이번 버전에서는 삭제한다.

마우스를 올렸을 때:

- 얼굴 바뀜 금지
- 글씨 바뀜 금지
- Hero 바뀜 금지
- 사진 바뀜 금지
- mask 열림 금지

Hover는 있어도:

- 아주 미세한 scale
- border glow
- light intensity 변화

정도만 허용한다.

**내용 자체가 바뀌면 안 된다.**

---

# 7. MOMENT ARCHIVE — 이미지처럼 실제 미디어 보관소로

두 번째 섹션은 단순 카드 UI가 아니다.

첨부 이미지 구조 그대로 간다.

왼쪽:

### MOMENT ARCHIVE

**Every moment,  
beautifully kept.**

보조:

`Relive his world in every angle.`  
`Your way.`

`BROWSE ARCHIVE →`

---

## 상단 필터

- ALL
- STAGE
- FANCAM
- INTERVIEW
- PHOTO
- LIVE

필터 모양도 이미지처럼 작고 세련되게.

큰 pill UI 금지.

게임 버튼처럼 만들지 말 것.

---

# 8. Moment Archive 사진 재사용 금지

여기가 이전 결과에서 가장 크게 실패한 부분이다.

각 카드는 반드시 서로 다른 Moment를 보여준다.

예:

### STAGE
실제 공연 스타일

### FANCAM
웃거나 팬을 보는 candid

### INTERVIEW
마이크 / 방송 / studio

### PHOTO
editorial / 화보 / 자연스러운 portrait

### LIVE
콘서트 조명 / encore / 무대 뒤 순간

가능하다면 BACKSTAGE도 별도 자산으로 확보한다.

**동일 portrait를 crop만 바꿔서 5개 카드에 돌려쓰면 FAIL이다.**

---

# 9. 필요한 이미지가 없으면 먼저 이미지부터 제작

중요하다.

이번에는 HTML에 억지로 기존 사진을 끼워 넣지 않는다.

작업 순서:

### 1단계
Visual Master를 보고 필요한 Asset Slot을 나눈다.

예:

- Hero Main
- Hero Stage
- Hero Smile
- Hero Backstage
- Hero Walking
- Archive Stage
- Archive Fancam
- Archive Interview
- Archive Photo
- Archive Live
- Connection Interview
- Connection Concert
- Tree Moment 01
- Tree Moment 02
- Tree Moment 03
- Tree Moment 04
- Tree Moment 05
- Tree Moment 06

### 2단계
기존 자산에서 정확히 맞는 이미지를 찾는다.

### 3단계
없으면 **그 Slot 하나만 별도 이미지로 제작한다.**

### 4단계
이미지가 다 준비된 후 HTML에 넣는다.

즉:

**HTML 먼저 만들고 같은 사진을 돌려막는 방식 금지.**

---

# 10. 동일인 원칙

이번 페이지는 한 사람의 여러 Moment를 보여주는 것이 핵심이다.

따라서:

Hero Main → Stage → Smile → Backstage → Walking → Interview → Concert → Tree 내부 Moment

가 모두 **동일인으로 자연스럽게 읽히도록 한다.**

정확한 Identity Master가 아직 없다면, 프로토타입 단계에서도 최소한:

- 얼굴형
- 눈
- 헤어
- 피부톤
- 분위기
- 나이대

가 갑자기 달라지지 않도록 맞춘다.

---

# 11. CONNECTION PREVIEW — 그대로

첨부 이미지처럼 구성한다.

왼쪽 카피:

### CONNECTION PREVIEW

**From this  
moment to  
the next.**

`Why the next moment mattered.`

`SEE THE JOURNEY →`

---

## 오른쪽

### THIS MOMENT
Interview Moment

↓

### WHY IT MATTERS

예:

`That small smile changed how I remembered the stage.`

↓

### NEXT MOMENT
Concert / Stage Moment

두 사진은 반드시 다른 Moment다.

같은 사진 사용 금지.

---

# 12. Connection은 시스템 다이어그램처럼 만들지 말 것

이 화면은 database relation 설명이 아니다.

따라서:

- Node graph 금지
- 사람 얼굴 관계도 금지
- 거대한 화살표 금지
- 기술 UI 금지

첨부 이미지처럼 **두 개의 기억 카드 사이에 감정의 이유가 존재하는 구조**로 만든다.

LoveTree에서 Connection은 단순 순서가 아니라 “왜 다음 Moment로 갔는가”라는 감정의 인과관계라는 원칙을 그대로 표현한다.

---

# 13. THE LOVETREE — 이번 화면의 클라이맥스

기존 R3의 단순 선형 Tree는 폐기한다.

이번에는 첨부 이미지처럼:

**매우 크고**
**화려하고**
**만개하고**
**빛나고**
**감정적인 Tree**

를 사용한다.

Tree는 화면의 주인공이어야 한다.

---

# 14. Tree 구체적 시각 기준

반드시 포함:

- 실제 나무 같은 굵은 줄기
- 풍성한 가지
- 만개한 꽃
- 빛나는 잎
- champagne gold
- blush pink
- rose
- lavender
- warm white
- 작은 별빛
- 반짝이는 입자
- 떨어지는 petal 또는 tiny light
- 지면에 반사되는 glow
- 밤과 해질녘 사이의 몽환적 공간

현재 Generated Master에서 보이는 정도의 풍성함을 **최소 기준**으로 한다.

초라한 가지 6개짜리 SVG tree 금지.

---

# 15. Tree 안에 Moment가 실제로 달려 있어야 한다

이 부분이 중요하다.

나무에 작은 사진 또는 영상 thumbnail이

**빛나는 열매처럼 달려 있어야 한다.**

예:

- Stage
- Interview
- Fancam
- Backstage
- Photo
- Live

각 Moment Frame에는 은은한 luminous border를 준다.

영상이면 작은 Play affordance를 줄 수 있다.

클릭 시 실제 URL을 넣을 수 있는 구조로 만든다.

최종 URL이 아직 없으면:

`data-url=""`

또는 config object로 분리하여 나중에 교체 가능하게 한다.

가짜 공식 URL 작성 금지.

---

# 16. Tree Copy

왼쪽:

`THE LOVETREE`

**Your moments.  
Your glowing path.**

보조:

`The tree remembers emotional causality,`  
`not just chronological order.`

버튼:

`EXPLORE THE TREE →`

이 문구와 시각 배치를 Generated Visual Master에 가깝게 유지한다.

---

# 17. SAVE THIS MOMENT

첨부 이미지처럼 밝고 깨끗하게.

왼쪽:

`SAVE THIS MOMENT`

**Save it.  
Connect it later.**

`Keep the story going.`

중앙:

실제 Save form.

필드:

- What moved you?
- Person / Work
- Visibility
- Source / URL을 추가 가능하게 설계

버튼:

`SAVE THIS MOMENT →`

---

# 18. Saved Card

오른쪽에는 Generated Master처럼 어두운 summary card를 둔다.

예:

`MOMENT SAVED`

`Moment saved.`  
`Add a connection now?`

버튼:

- LATER
- CONNECT

오른쪽에는 작은 luminous LoveTree symbol 또는 miniature bloom tree.

이 부분은 전체 페이지의 마지막 UX 연결점이다.

---

# 19. 타이포그래피 LOCK

이번 이미지의 가장 좋은 요소 중 하나가 글씨체다.

따라서 **영어 중심으로 유지한다.**

한글 명조체 사용 금지.

Hero / 주요 Heading:

**강한 contemporary grotesk / modern sans 계열**

특징:

- 두껍고
- compact
- 깔끔하고
- editorial
- 큰 글자에서도 고급스러움

Body:

- clean modern sans
- 너무 가늘지 않게
- 충분한 readability

Tree section에서도 갑자기 serif로 바꾸지 않는다.

이번 버전은 **영문 일관성**을 우선한다.

---

# 20. 색상 LOCK

Generated Master의 색을 그대로 기준으로 한다.

### Primary background

- warm ivory
- cream
- pale peach
- pale blush

### Accent

- champagne
- rose
- dusty pink
- muted lavender

### Dark climax

- midnight plum
- charcoal violet
- deep mauve

### Tree

- champagne gold
- blush
- rose
- warm white
- soft lavender glow

Lime green 금지.

Cyber neon green 금지.

강한 blue sci-fi 금지.

---

# 21. 카드 스타일

기존 결과처럼 앱 카드가 너무 커지고 둔해지는 것을 금지한다.

Generated Master 기준:

- 작은 radius
- 얇은 border
- 미세한 shadow
- 충분한 white space
- 카드보다 사진 우선
- UI보다 콘텐츠 우선

Dating app / Tinder 느낌이 나면 FAIL.

---

# 22. 움직임은 다시 넣되 아주 절제해서

이번에는 “움직이지 말라”가 아니다.

**사진을 바꾸는 hover는 금지하고, 웹 전체의 생명감은 살린다.**

허용:

- 페이지 진입 fade
- Hero light trail 천천히 흐르기
- Moment card subtle lift
- Tree particle twinkle
- Tree thumbnail subtle float
- section scroll reveal
- very slow parallax
- button glow
- play icon micro-motion

금지:

- 화면 깜박임
- 얼굴 swap
- mask reveal
- 과도한 zoom
- 순간마다 전체 색상 급변
- 게임 HUD animation

---

# 23. Desktop 우선, Mobile 별도 재배치

Desktop 이미지를 그대로 축소하지 않는다.

모바일은:

Hero copy  
→ Main Hero  
→ 4 Moment mini strip  
→ Moment Archive horizontal scroll  
→ Connection stacked  
→ Tree full-width  
→ Save form

순으로 자연스럽게 재배치한다.

단 Desktop 디자인 DNA는 유지한다.

---

# 24. 이번 버전의 핵심 제품 메시지

사용자가 첫 화면부터 마지막까지 이해해야 할 것은 이것이다.

> **한 사람에게 마음이 움직였다.**

> **그 사람에게서 여러 다른 순간을 발견했다.**

> **각 순간을 저장했다.**

> **한 순간이 다음 순간을 열었다.**

> **그 기억이 쌓여 나만의 LoveTree가 되었다.**

사람 소개 사이트로 만들지 말 것.

팬클럽 프로필 페이지로 만들지 말 것.

Dating app처럼 만들지 말 것.

---

# 25. 구현 방식

HTML은 self-contained prototype으로 제작 가능하다.

다만 이미지와 설정은 가능하면 다음 식으로 분리한다.

```js
const moments = {
  hero: {...},
  archive: [...],
  connection: {...},
  tree: [...]
}
```

각 Moment에는 최소:

```js
{
  type,
  title,
  image,
  url,
  note
}
```

구조를 갖게 한다.

나중에 실제 데이터나 URL로 교체하기 쉽게 만든다.

---

# 26. 절대 금지사항

다시 명확히 한다.

- 같은 사진 돌려막기
- 얼굴 crop 사고
- 목 잘림
- 몸통 절단
- 검은 face patch
- polygon mask
- acrylic mask
- oval Hero
- 얼굴 바뀌는 hover
- 텍스트 바뀌는 hover
- 새로운 캐스트 roster
- mountain background
- aircraft
- cyber dashboard
- radar
- route map
- 능력치
- profile dossier
- 지나치게 많은 UI
- 촌스러운 한글 명조체
- 작은 선형 SVG Tree
- 검은 콘서트장으로 전체 페이지 통일
- “참고만 하고 다른 디자인 만들기”

---

# 27. 이번 작업의 제작 순서

반드시 아래 순서로 한다.

### Gate A — Asset Map
먼저 Visual Master를 분석해 필요한 이미지 목록 작성.

### Gate B — Asset Completion
필요한 각각의 이미지 확보.

같은 사진 반복 사용 금지.

### Gate C — Static Fidelity
아직 animation 넣지 말고 Desktop 정적 화면부터 Generated Master와 맞춘다.

### Gate D — Motion
정적 fidelity 통과 후 micro-motion만 추가.

### Gate E — Mobile
Desktop 통과 후 Mobile 재배치.

### Gate F — Runtime QA
그 다음 validation.

**Validation 점수보다 Visual Fidelity가 먼저다.**

---

# 28. 제출 전 자체 비교

반드시 Generated Visual Master와 실제 HTML을 나란히 놓고 비교한다.

아래 8개를 각각 PASS/FAIL로 기록한다.

1. Hero 구도가 사실상 같은가
2. 타이포 무게와 위치가 같은가
3. 4개의 Hero Moment가 모두 서로 다른 사진인가
4. Archive가 서로 다른 실제 Moment들로 채워졌는가
5. Connection의 두 Moment가 서로 다른가
6. Tree가 충분히 화려하고 만개했는가
7. Tree에 실제 Moment 사진/영상이 달려 있는가
8. 전체적으로 premium K-pop concept teaser + LoveTree로 보이는가

하나라도 FAIL이면 제출하지 말고 수정한다.

---

# 29. 이번 버전명

기존 파일 덮어쓰기 금지.

새 버전:

`lovetree-49-concept-teaser-visual-master-v4.html`

권장 작업 폴더:

`49_아이돌모먼트_리빌포털_분류대기/03_HTML결과물/lovetree-49-concept-teaser-visual-master-v4`

---

# 30. 필수 제출물

이번에는 QA 문서 수십 개 만들 필요 없다.

다음만 제출한다.

1. **최종 HTML**
2. **Desktop full-page screenshot**
3. **Mobile full-page screenshot**
4. **Visual Master vs HTML 비교 이미지**
5. **사용 이미지 Asset Map**
6. **각 카드의 image / type / future URL mapping**
7. 간단한 validation JSON

그리고 보고서 첫 줄에 반드시:

**`GENERATED VISUAL MASTER EXACT-BUILD CANDIDATE`**

라고 적는다.

---

# 31. 제품 오너 Gate

이번에는 기술 체크보다 아래를 먼저 본다.

### PASS 1
첫 화면이 첨부 이미지처럼 정말 고급스럽나?

### PASS 2
주인공의 얼굴과 몸이 자연스럽나?

### PASS 3
여러 Moment가 전부 다른 장면인가?

### PASS 4
한 사람의 여러 순간이라는 LoveTree 개념이 즉시 보이나?

### PASS 5
Connection이 “왜 다음으로 갔는지” 느껴지나?

### PASS 6
Tree가 정말 화려하고 만개했나?

### PASS 7
Tree에 사진과 영상 Moment가 실제로 매달려 있나?

### PASS 8
데이트앱·프로필 사이트가 아니라 LoveTree 홍보 티저로 보이나?

---

# 32. 최종 명령

**이번에는 첨부 이미지를 “영감”으로 사용하지 말고 “완성 화면 명세서”로 사용한다.**

보면서 비슷하게 새로 만드는 것이 아니라,

> **이 그림을 실제 웹사이트로 옮긴다.**

고 생각하고 제작한다.

이미지에서 다른 점을 만들어야 할 이유가 없다.

필요한 이미지가 부족하면 **먼저 이미지부터 별도로 만들고**, 같은 사진을 반복해 억지로 HTML을 완성하지 않는다.

**이번 작업의 최우선 순위는 기능 수가 아니라 Visual Fidelity다.**

---

## 핵심 실행 요약

이번 지시의 핵심은 세 가지다.

1. **Generated Visual Master를 레퍼런스가 아니라 완성 명세로 잠근다.**
2. **HTML보다 먼저 필요한 이미지 자산을 모두 확보한다.**
3. **정적 화면이 Visual Master와 충분히 일치한 뒤에만 모션을 추가한다.**

코드를 먼저 만들고 사진을 억지로 끼워 넣는 방식으로 돌아가지 않는다.

**목적은 기능 데모가 아니라 LoveTree의 고급 K-pop Concept Teaser 대문 완성이다.**
