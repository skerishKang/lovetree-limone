# LoveTree Track 65 V2 — Lusion × H3 Scroll Cinematic Editorial Site
## 설계팀장 8기 → 디자인팀장 신규 작업지시

- **상태:** 신규 후보 / DESIGN REVIEW 전
- **작성일:** 2026-08-16
- **대상:** LoveTree Track 65 `입덕단서_시네마틱에디토리얼`
- **작업 종류:** Standalone cinematic HTML prototype
- **Production / GitHub 제품 구현:** 비범위
- **기존 채택본 덮어쓰기:** 금지

---

# 0. 이번 작업의 한 문장 목표

**LoveTree Track 65를 일반적인 세로 섹션 웹페이지가 아니라, Lusion처럼 스크롤 자체가 카메라와 장면을 움직이고, MiniMax H3 참고영상처럼 현재 장면 속 오브젝트가 다음 장면의 포털이 되는 10장짜리 시네마틱 인터랙티브 사이트로 만든다.**

중요하다.

이번에는 “LoveTree답게 바꾼다”는 이유로 모든 화면에 꽃·나무·크림색 카드·귀여운 요소를 덧붙이지 않는다.

**촌스러움 방지 원칙:**

- 01~09에서는 `LoveTree = 나무`를 노골적으로 반복하지 않는다.
- 핵심 브랜드 포인트는 핑크, 감정 문장, Moment/Connection의 인과 흐름이다.
- **실제 나무의 전면적 등장은 10번 `MY LOVETREE` 최종 Reveal에서만 허용한다.**
- 각 장면은 서로 다른 미술 세계를 가져야 한다.
- LoveTree는 콘텐츠를 덮어씌우는 테마가 아니라, 10개 세계를 하나의 감정 경로로 연결하는 서사다.

---

# 1. 작업 시작 전에 반드시 직접 볼 것

코드부터 작성하지 말고 아래 3가지를 먼저 직접 비교한다.

## A. MiniMax H3 참고영상

업로드 파일:

`참고영상-미니맥스H3_공간브랜드_에디토리얼(5).mp4`

관찰 대상:

- 43초 전체의 컷 리듬
- 거대 타이포가 공간이 되는 방식
- 현재 장면의 오브젝트가 다음 장면의 문이 되는 방식
- 2D 페이지가 공간 오브젝트로 튀어나오는 방식
- 렌즈/쌍안경/프레임 마스크 전환
- 라디오/TV/스크린 등 매체를 이용한 장면 handoff
- 색 세계가 장면마다 과감하게 바뀌지만 서사가 끊기지 않는 방식

**이번 Track 65의 전환 문법 1순위 기준이다.**

## B. Lusion 사이트와 제품오너 녹화영상

URL:

`https://lusion.co/`

업로드 녹화:

`녹화_2026_08_15_21_53_36_995.mp4`

관찰 대상:

- 첫 화면이 즉시 일반 웹 섹션처럼 내려가지 않는 점
- 한 viewport 안에서 비주얼 오브젝트가 계속 살아 있는 점
- 스크롤이 단순 Y 이동이 아니라 애니메이션 타임라인을 제어하는 점
- 커다란 이미지/3D/동영상 영역과 얇은 UI의 대비
- 화면 가장자리의 최소 내비게이션
- 메뉴 진입 시 페이지와 별개의 명확한 navigation state가 생기는 점
- full-bleed media와 프로젝트 카드 사이의 리듬 변화
- 큰 공간 → 정보 → 큰 공간의 반복

**이번 Track 65의 사이트 구조/스크롤 UX 1순위 기준이다.**

## C. Track 65 고화질 자산 폴더

Drive 기준:

`[01_러브트리]/03_디자인채택본/65_입덕단서_시네마틱에디토리얼/고화질`

작업 전 이 폴더의 **모든 이미지 파일을 먼저 썸네일 contact sheet로 만들어 한 번에 비교**한다.

현재 폴더에는 다음 계열이 포함되어 있다.

- `S01_FIRST_CLUE_1536w.jpg`
- `S02_LOOK_AGAIN_1536w.jpg`
- `S08_SAW_HEARD_FELT_1536w.jpg`
- `S10_MY_LOVETREE_1536w.jpg`
- `ChatGPT Image ...` 고화질 원본 다수
- 추가 생성된 UUID형 PNG 고화질 자산 다수
- FAN-A 계단/헤드폰/백팩 계열
- SUBJECT-B 무대/인터뷰/클로즈업/카메라/흑백 계열

**원칙: 파일명을 보고 추정하지 말고 실제 이미지를 모두 열어본 뒤 역할을 부여한다.**

---

# 2. 이미지 사용 절대 규칙

## 2.1 1번의 여학생은 지정 원본을 사용한다

제품오너가 첨부한 **투명 배경의 헤드폰 + 검정 백팩 + 차콜 재킷 + 플리츠 스커트 + 검정 워커를 신은 계단을 오르는 여학생 PNG**를 01의 주인공 `FAN-A`로 사용한다.

두 투명 PNG가 있다면 둘 다 비교하고 가장 윤곽과 다리/머리카락이 깨끗한 것을 MAIN으로 사용한다.

### 금지

- 01 주인공을 AI로 다시 생성
- 얼굴 변경
- 옷 변경
- 가방 변경
- 헤드폰 색 변경
- 전신을 새로 합성해 다른 사람처럼 만드는 것

### 허용

- scale / translate / rotateZ 1~2도 이내
- light wrap
- shadow
- bloom
- rim light
- motion blur
- depth blur
- foreground/background occlusion

즉 **사진 속 사람은 유지하고 공간과 카메라를 움직인다.**

---

## 2.2 고화질 폴더의 사진은 최대한 전부 사용한다

이번 결과는 몇 장만 골라 반복하는 것이 아니다.

**고화질 폴더 이미지 전체를 Asset Pool로 사용한다.**

다만 한 장면에 전부 우겨넣지 않는다.

다음 방식으로 분산한다.

- Hero background
- foreground cutout
- floating Moment card
- film strip
- wall poster
- lens frame
- phone/tablet/laptop screen
- depth background card
- scrapbook pinned photo
- menu preview thumbnail
- final LoveTree photo leaf/card

### 제출 시 필수

`65_V2_ASSET_USAGE_MAP.md`에 다음을 기록한다.

```text
파일명 | Scene | 사용 위치 | 사용 방식 | 비고
```

원칙적으로 **모든 고화질 이미지가 최소 1회 이상 등장**해야 한다.

완전히 동일한 중복 파일이나 기술적으로 손상된 파일만 제외할 수 있으며, 제외 시 이유를 적는다.

---

## 2.3 얼굴을 억지로 통일하지 않는다

고화질 폴더의 여성 사진이 여러 촬영 스타일과 약간 다른 인상으로 보이더라도, AI 재생성으로 모두 같은 얼굴로 바꾸려 하지 않는다.

이들은 **한 대상의 다양한 Moment / 팬이 기억한 다양한 미디어 이미지**처럼 편집한다.

통일성은 얼굴 재생성이 아니라 다음으로 만든다.

- color grade
- crop
- editorial border
- typography
- lighting
- shared motion
- scene transition

---

# 3. 사이트는 “10개 섹션”이 아니라 “하나의 시네마틱 스테이지”로 만든다

## 잘못된 구현

```text
<section>01</section>
<section>02</section>
<section>03</section>
...
```

각 섹션에 배경 이미지만 바꾸고 fade-in 하는 방식.

**이 방식은 금지한다.**

## 목표 구조

```text
<body>
  <header class="cinematic-nav" />
  <main class="scroll-runtime">
    <div class="scroll-spacer" />
    <div class="cinematic-stage sticky-100vh">
      <div class="world world-01" />
      <div class="world world-02" />
      ...
      <div class="world world-10" />
      <div class="transition-fx" />
      <div class="hud" />
    </div>
  </main>
</body>
```

`cinematic-stage`는 viewport에 고정되고,
사용자의 스크롤 진행률이 카메라·오브젝트·타이포·마스크·색·깊이를 변화시킨다.

즉:

> **스크롤 = 영상의 playhead**

이어야 한다.

---

# 4. 전체 Scroll Runtime

10개 장면을 총 **약 900~1200vh**의 scroll distance로 운용한다.

권장 초기 배분:

| Scene | Scroll 구간 | 체감 |
|---|---:|---|
| 01 | 0–11% | 느린 입장 / 발견 |
| 02 | 11–21% | 시선 고정 / 재확인 |
| 03 | 21–32% | 미디어 세계 확대 |
| 04 | 32–42% | 플랫폼 이동 / 속도 상승 |
| 05 | 42–52% | 정지 / 감정 분석 |
| 06 | 52–62% | 축적 / 카드 깊이 |
| 07 | 62–71% | 렌즈 / 집중 |
| 08 | 71–81% | 감정 합성 |
| 09 | 81–91% | 인과 경로 정리 |
| 10 | 91–100% | 전체 세계 Reveal |

### 스크롤 감각

- wheel 1틱에 장면이 갑자기 넘어가면 안 된다.
- scrub은 부드럽게 추종한다.
- 장면 진입에는 약간의 inertia가 있다.
- 강한 snap은 금지. 필요하면 scene midpoint 근처에서 아주 약한 magnetic settling만 사용한다.
- 사용자가 역스크롤하면 모든 transition이 자연스럽게 역재생되어야 한다.

---

# 5. 01~10 확정 시네마틱 스토리보드

# SCENE 01 — FIRST CLUE

## 목적

평범한 일상에서 단 하나의 이미지가 FAN-A의 시선을 붙잡는 순간.

## 미술 세계

- 따뜻한 크림/콘크리트
- 긴 계단 또는 계단 골목
- 강한 사선 햇빛
- 벽에 붙은 작은 포스터/폴라로이드
- black + cream + hot pink typography

## 반드시 사용할 것

- 제품오너 지정 **투명 FAN-A 전신 PNG**
- `S01_FIRST_CLUE_1536w.jpg`는 composition / background / typography reference로 비교
- 고화질 폴더의 벽/사진/포스터에 적합한 Subject-B 이미지 여러 장

## 시작 프레임

화면 왼쪽:

```text
01
FIRST
CLUE

한 순간이
모든 길을 바꿨다.

One moment
changed everything.
```

오른쪽/중앙:

FAN-A가 계단을 올라가는 실사 전신.

## 스크롤 동작

1. FAN-A는 화면 하단 오른쪽에서 6~10% 정도 위로 전진한다.
2. 실제 걷기 애니메이션을 만들지 않아도 된다. 카메라와 전신 PNG의 relative motion으로 “올라간다”는 착시를 만든다.
3. 벽 포스터는 서로 다른 depth layer로 0.8x / 1.0x / 1.25x parallax.
4. 한 포스터가 FAN-A 시야에 들어오면서 pink highlight.
5. `CLUE` 글자가 점점 확대되어 화면의 70~100%를 덮는다.
6. 마지막에 `CLUE`의 글자 내부/핑크 면이 다음 장면을 덮는 **shape wipe portal**이 된다.

### 금지

- 첫 화면부터 벚꽃나무
- 버튼 4~5개
- 앱 카드 그리드
- 단순 background crossfade

---

# SCENE 02 — LOOK AGAIN

## 목적

“왜 다시 보고 있지?”라는 재확인.

## 핵심 구성

**왼쪽 눈이 화면의 중심이 되는 극단적 close-up.**

제품오너가 요구한 방향대로:

- 큰 얼굴 close-up
- **LEFT EYE가 핵심 focal point**
- 피부/속눈썹/눈동자 디테일이 깨끗해야 함
- 얼굴 위 또는 주변에 고화질 카드 2~3장
- 카드 속 Subject-B 인물도 low-res 금지

## 사용할 자산

- `S02_LOOK_AGAIN_1536w.jpg`
- 제공된 눈 초근접 사진
- 인터뷰/미소/무대 Subject-B 사진
- 폴라로이드 계열 고화질 사진

## 카피

```text
Why am I watching this again?

왜 다시 보게 되었을까?
그 미소 때문일까,
그 눈빛 때문일까.
```

## 전환

1. 01의 핑크 CLUE surface가 02의 피부톤으로 질감 변환.
2. 카메라가 얼굴에 접근.
3. 2~3장의 사진 카드가 아주 천천히 depth를 달리해 떠 있음.
4. 카메라가 LEFT EYE로 더 접근.
5. 홍채가 dark portal처럼 커지면서 03의 밤/보라 세계로 연결.

**fade-to-black로 넘어가지 말 것. Eye → portal이어야 한다.**

---

# SCENE 03 — FOLLOW THE FEELING

## 목적

한 장면에서 시작된 궁금함이 여러 종류의 콘텐츠로 번지는 단계.

## 미술 세계

- deep navy
- violet
- magenta
- 공연장/우주 같은 깊이
- glowing media ribbon

## 구성

FAN-A를 뒤에서 본 실루엣/전신 또는 반신.

그 앞에:

- SHORTS
- COMMENT
- INTERVIEW
- PHOTO
- VARIETY
- STAGE

등의 Moment가 **나선형 media ribbon**으로 떠 있다.

## 이미지 사용

고화질 폴더의 무대·인터뷰·미소·클로즈업 사진을 다양한 카드에 분산한다.

카드는 한 장을 6번 복제하지 않는다.

## 스크롤 동작

- ribbon 전체가 천천히 회전
- 사용자의 스크롤에 따라 카메라가 spiral 안쪽으로 이동
- 가까운 카드는 빠르게 지나가고 먼 카드는 느리게 움직임
- 일부 카드가 화면 앞을 가로질러 다음 장면으로 이어지는 wipe 역할

## 전환

가장 가까운 하나의 media card가 카메라 앞으로 돌진해 100vw/100vh를 덮고, 그 카드의 콘텐츠가 04의 플랫폼 공간이 된다.

---

# SCENE 04 — PLATFORM HOP

## 목적

한 플랫폼에서 또 다른 플랫폼으로 계속 이동하는 실제 팬 탐색.

## 미술 세계

- sky blue
- lavender
- pale pink
- cloud / digital corridor
- 빛나는 가상 발판

## FAN-A

01의 투명 FAN-A PNG를 다시 사용할 수 있다.

이번에는 01과 다르게:

- 더 큰 scale
- 화면 중앙 횡단
- translateX + translateY + scale을 이용해 “플랫폼 사이를 건너는” 동작

## 주변 오브젝트

- phone
- laptop
- vertical screen
- translucent content window
- social/video generic glyph

각 화면 내부에는 고화질 폴더 사진을 서로 다르게 사용한다.

## 핵심

장면이 “앱 아이콘 나열”처럼 보여서는 안 된다.

**실제 공간 사이를 FAN-A가 건너고, 미디어 화면이 건축물처럼 서 있어야 한다.**

## 전환

한 대형 screen의 display가 흰색/회색으로 desaturate되며 화면을 덮고 05의 흑백 editorial world로 이어진다.

---

# SCENE 05 — MOMENTS MADE OF FEELING

## 목적

정보 수집에서 감정 인식으로 속도를 낮춘다.

## 반드시 지킬 미술 방향

- 흑백
- 고급 패션 에디토리얼
- 큰 세리프 타이포
- Subject-B의 실사 흑백 portrait
- 핑크는 아주 작은 accent만

## 구성

왼쪽:

```text
Moments
Made of
Feeling
```

오른쪽:

고화질 여성 흑백 portrait.

작은 black note:

```text
What moved me?
• Stage presence
• Her voice
• Her honesty
• Her smile
• The way she cares
```

하단에는 얇은 film strip.

## 스크롤 동작

- 04의 컬러가 스크롤 10~20% 안에서 서서히 빠져 흑백으로 전환
- portrait는 거의 정지
- film strip만 천천히 횡이동
- 큰 type가 camera depth를 다르게 두어 인물 앞/뒤를 교차

## 전환

film strip의 중앙 프레임 하나가 커져 06의 Moment Card가 된다.

---

# SCENE 06 — MOMENT STACK

## 목적

순간이 하나씩 쌓여 하나의 취향/기억 구조가 되는 단계.

## 미술 세계

- charcoal/navy
- glossy glass
- pink/violet rim light

## 구성

중앙 전면 카드 1장 + 뒤로 6~10장의 카드.

라벨 예:

- STAGE
- SHORTS
- INTERVIEW
- VARIETY
- COMMENT
- FAN CAM
- PHOTO

각 카드에는 **서로 다른 고화질 사진**을 넣는다.

## 스크롤 동작

1. 초기에는 카드가 한 덩어리로 겹쳐 있음.
2. 스크롤하면 좌우/깊이로 fan-out.
3. 카드가 화면의 Z축을 따라 앞으로/뒤로 이동.
4. 특정 카드가 선택될 때 큰 숫자/짧은 감정 문장이 뒤쪽에 나타남.
5. 마지막에 카드들이 다시 하나의 circular alignment로 모이며 07 렌즈 형상을 만든다.

---

# SCENE 07 — LOVETREE LENS

## 목적

“더 많이 보는 것”에서 “특정 순간을 더 가까이 보는 것”으로 전환.

## 미술 세계

- black/navy
- cream line
- selective pink light

## 구성

쌍안경/렌즈의 oval mask를 사용한다.

한 장면에 최소 4개의 view:

1. FAN-A profile
2. Subject-B stage
3. Subject-B candid/smile
4. eye close-up
5. 필요하면 촬영/관찰 장면

## 스크롤 동작

- mask가 화면을 잘라 실제 background image가 lens 안에서만 이동
- cursor 이동에 아주 약한 lens parallax 허용
- 스크롤하면 lens field가 좁아졌다가 한 lens가 화면 전체로 확대

## 전환

lens 내부에 있던 Subject-B 무대 장면이 전체 화면이 되며 08 진입.

---

# SCENE 08 — WHAT I SAW · HEARD · FELT

## 목적

팬이 본 것, 들은 것, 느낀 것을 세 층으로 합성한다.

## 참고 자산

- `S08_SAW_HEARD_FELT_1536w.jpg`
- 눈 close-up
- 무대 microphone image
- 따뜻한 미소/인터뷰 image

## 구성

3개의 cinematic band 또는 3개의 서로 다른 spatial layer.

### SAW

눈/무대의 시각적 순간.

### HEARD

마이크/목소리 + 얇은 waveform.

### FELT

미소/표정 + `Warmth / Honesty / Courage`.

## 스크롤 동작

- SAW가 먼저 화면을 차지
- 이어서 HEARD가 위/아래에서 들어옴
- waveform이 스크롤 진행률에 따라 길어짐
- FELT가 마지막으로 따뜻한 light를 가져옴
- 세 층이 한 화면에 잠깐 정렬된 뒤 종이 질감으로 변환

## 전환

waveform 또는 pink line이 손그림 화살표로 변형되어 09의 paper board로 연결.

---

# SCENE 09 — WHY NEXT?

## 목적

LoveTree 핵심인 **Connection = 왜 다음으로 갔는가**를 가장 명확하게 보여준다.

## 미술 세계

- cream paper
- black marker
- hot pink arrows
- masking tape
- pin / torn paper

## 구성

FAN-A는 하단에서 보드를 바라본다.

보드에는 고화질 폴더의 여러 사진을 실제로 다양하게 사용한다.

예:

```text
THE STAGE MADE ME CURIOUS.
        ↓
SO I WATCHED THE STAGE.
        ↓
HER STORY MADE ME LOVE HER MORE.
        ↓
SO I STAYED FOR WHAT'S NEXT.
```

한국어 설명도 병기 가능.

## 스크롤 동작

- 사진이 처음부터 다 보이면 안 됨
- 사용자가 스크롤할수록 하나씩 pin/tape되어 나타남
- pink arrow가 실제 stroke-dashoffset 방식으로 그려짐
- 연결 이유가 다음 사진을 끌어냄
- 마지막 화살표가 화면 위/오른쪽으로 뻗어 나감

## 전환

마지막 pink connection line이 점점 굵어져 나뭇가지/빛줄기의 형태가 되고, 카메라가 크게 pull-back하면서 10의 전체 LoveTree를 만든다.

---

# SCENE 10 — MY LOVETREE

## 목적

앞의 9개 장면이 사실 하나의 감정 경로였음을 마지막에 처음으로 보여준다.

## 핵심 원칙

**나무는 여기서 처음 완전히 등장한다.**

01~09에서 꽃나무를 반복하지 않는다.

## 구성

- dawn / rose / pale sky
- 도시 또는 먼 horizon
- 절벽/높은 지점에 앉은 FAN-A
- 한 그루의 luminous LoveTree
- 가지에는 지금까지 사용한 사진들이 photo Moment로 달려 있음
- 작은 메모/Connection card가 일부만 섞임

고화질 폴더의 남은 자산을 이 최종 트리의 Moment로 모두 회수한다.

## 타이포

```text
The Path Became Your
My LoveTree

이 모든 순간들이 모여
나의 LoveTree가 되었다.
```

## 마지막 상호작용

최종 frame에서만 다음 CTA를 보여준다.

- `다시 보기`
- `첫 순간 열기`
- `샘플 경로 따라가기`

버튼은 3개 이하.

## 마지막 카메라

1. 나무 가까이
2. 천천히 pull-back
3. FAN-A + tree + city 전체가 한 장면에 들어옴
4. scroll end에서 1~2초 정도 settle

---

# 6. Scene 사이 전환은 반드시 “원인 있는 전환”으로 만든다

이번 작업에서 가장 중요한 항목이다.

## 금지

```text
opacity 1 → 0
다음 background opacity 0 → 1
```

만 반복하는 방식.

## 필수 Handoff Map

```text
01 CLUE typography/shape
   → 02 skin/eye

02 iris
   → 03 dark media universe

03 foreground media card
   → 04 platform screen/world

04 giant display
   → 05 monochrome editorial

05 film strip frame
   → 06 Moment Stack front card

06 stacked cards align
   → 07 lens geometry

07 lens zoom
   → 08 SAW image

08 waveform/pink line
   → 09 handwritten arrow

09 Connection line
   → 10 tree branch / whole reveal
```

**장면 전환 자체가 이야기다.**

---

# 7. Lusion식 메뉴/내비게이션 요구사항

일반적인 상단 메뉴를 처음부터 크게 펼쳐놓지 않는다.

## 초기 0~5%

좌상단:

`LOVETREE`

우상단:

`MENU`

하단 또는 우측:

`SCROLL TO EXPLORE`

정도만 보인다.

## 01이 시작된 뒤

작은 cinematic HUD가 나타난다.

```text
01 / 10
FIRST CLUE
──────────── progress
```

## 스크롤 8~12% 이후

`MENU`를 누르면 full-screen chapter menu가 열린다.

메뉴 예:

```text
01 FIRST CLUE
02 LOOK AGAIN
03 FOLLOW THE FEELING
04 PLATFORM HOP
05 MOMENTS MADE OF FEELING
06 MOMENT STACK
07 LOVETREE LENS
08 SAW · HEARD · FELT
09 WHY NEXT?
10 MY LOVETREE
```

### 메뉴 동작

- 현재 scene 강조
- hover 시 해당 scene의 고화질 preview 이미지 표시
- click 시 해당 scroll progress로 smooth jump
- 메뉴 open 동안 background animation은 완전히 사라지지 않고 아주 느리게 살아 있음
- ESC 닫기
- close 버튼
- body scroll lock은 menu state에서만

### 금지

- 웹사이트 처음부터 10개 탭을 가로로 빽빽하게 노출
- Bootstrap식 navbar
- 큰 흰색 header bar

---

# 8. 인터랙션의 질감

목표는 “애니메이션이 많다”가 아니다.

**화면의 깊이와 카메라 감각이 있어야 한다.**

필수:

- parallax
- z-depth
- scale
- masked reveal
- clip-path 또는 shader-like wipe
- transform-origin이 있는 motion
- subtle motion blur
- foreground occlusion
- image grain / paper grain where appropriate
- text tracking/scale motion

사용해도 되는 기술:

- GSAP + ScrollTrigger
- requestAnimationFrame custom scroll runtime
- CSS `transform: translate3d()`
- CSS `perspective`
- Canvas 2D
- Three.js/WebGL은 실제로 장면 품질이 좋아질 때만 사용

**Three.js를 썼다는 사실 자체가 목표가 아니다.**

사진과 타이포가 충분히 좋은 장면은 DOM/CSS3D가 더 깨끗할 수 있다.

---

# 9. 타이포그래피

이번 Track 65는 기존 LoveTree 기본 HTML보다 더 에디토리얼하게 간다.

## Display Serif

- Bodoni/Didot 계열 또는 유사 contrast serif
- 큰 영문은 viewport를 잘라먹을 정도로 크게 사용 가능

## Sans

- Pretendard / Noto Sans KR 계열
- 작은 정보/한국어 설명

## Handwriting

- `WHY NEXT?`
- 감정 한 줄
- pink annotation

에 제한적으로 사용.

### 금지

- 모든 문장을 필기체
- 모든 장면에서 같은 크기의 대제목
- 카드 위에 작은 글자가 너무 많아 앱 대시보드처럼 되는 것

---

# 10. 색 세계

LoveTree 전체를 크림+핑크 하나로 통일하지 않는다.

| Scene | Primary World |
|---|---|
| 01 | warm cream / charcoal / hot pink |
| 02 | skin / cream / dusty pink |
| 03 | deep navy / violet / magenta |
| 04 | sky blue / lavender / pale pink |
| 05 | black / white / tiny pink |
| 06 | dark navy / glossy violet |
| 07 | black/navy / cream line / pink |
| 08 | dark navy / pink / warm skin |
| 09 | cream paper / black / hot pink |
| 10 | dawn sky / rose bloom / charcoal |

이 색 변화가 **감정 탐색이 깊어지는 리듬**으로 느껴져야 한다.

---

# 11. 기존에 만든 디자인 이미지 사용법

고화질 폴더 안에 이미 존재하는 `S01/S02/S08/S10` 및 기존 생성 디자인은 “그림 전체를 section background로 붙이는 것”만으로 끝내지 않는다.

두 방식으로 사용한다.

## 1) Visual Target

해당 scene의 composition, type hierarchy, color target.

## 2) Actual Media Layer

필요하면 해당 고화질 디자인을:

- background plate
- masked layer
- menu preview
- transition plate

로 실제 사용한다.

단, 이미 이미지 안에 UI와 글자가 박혀 있는 경우 HTML 텍스트를 그 위에 중복해 얹지 않는다.

가능하면 **원본 인물사진 + HTML 타이포 + CSS/Canvas 공간 연출**을 우선하여 진짜 웹처럼 만든다.

---

# 12. 반응형

이번 1차 디자인 평가의 기준은 **Desktop 1920×1080**이다.

하지만 모바일도 깨지면 안 된다.

## Desktop

- 1920×1080 기준 composition 완성
- 1440×900 추가 확인

## Mobile

- 390×844 또는 430×932
- desktop 장면을 단순 축소 금지
- FAN-A와 주요 인물은 safe crop 재설계
- 대형 type은 2~4행으로 재구성
- hover dependence 제거
- swipe/scroll로 동일 scene progress
- menu는 full-screen vertical list

---

# 13. 성능

고화질 이미지가 많으므로 성능을 무시하면 안 된다.

필수:

- 현재 scene + 다음 1~2 scene preload
- 나머지 lazy load
- `decoding="async"`
- offscreen scene의 heavy animation 중지
- GPU compositing이 필요한 레이어만 `will-change`
- 같은 고화질 원본을 CSS background와 img로 이중 decoding하지 말 것
- viewport 밖 동영상/Canvas render loop 중지

목표:

- 일반 데스크톱 Chrome에서 scroll animation이 눈에 띄게 끊기지 않을 것
- 60fps 지향
- 첫 화면에서 30장의 이미지를 한꺼번에 decode하지 않을 것

---

# 14. 접근성과 control

- `prefers-reduced-motion` 지원
- reduced motion에서는 scene transition을 단순화하되 이야기 순서는 유지
- ESC로 menu 닫기
- keyboard ↑↓ / PageUp/PageDown / Space 기본 scroll 방해하지 않기
- pointer가 없어도 전체 감상 가능
- audio를 넣는 경우 기본 MUTE
- 브라우저 정책을 무시한 강제 autoplay audio 금지

---

# 15. 이번 결과물은 일반 제품 UI가 아니다

이 Track 65의 위치는:

> **입덕단서 / 감정 경로를 보여주는 특별 시네마틱 인터랙티브 경험**

이다.

따라서 현재 LoveTree의 일상 3열 TreeWorkspace를 이 스타일로 교체하지 않는다.

이번 HTML은 독립된 cinematic candidate다.

---

# 16. 파일/버전 규칙

기존 파일 덮어쓰기 금지.

새 후보 폴더 예:

```text
65_입덕단서_시네마틱에디토리얼/
  버전2.0_LUSION_H3_SCROLL_CINEMATIC_후보/
```

필수 결과물:

```text
★_현재후보_65_V2_LUSION_H3_SCROLL_CINEMATIC.html
01_Assets/
65_V2_ASSET_USAGE_MAP.md
65_V2_SCENE_TIMELINE.md
65_V2_DESKTOP_CONTACT_SHEET.png
65_V2_MOBILE_CONTACT_SHEET.png
65_V2_SCROLL_CAPTURE.mp4
65_V2_QA_REPORT.md
```

### 01_Assets

원본은 이동/삭제/수정하지 않는다.

필요한 자산은 V2 폴더에 복사본 또는 명시적 상대경로로 연결한다.

---

# 17. 작업 순서

## STEP 1 — 자산 감사

- 고화질 폴더 전체 이미지 열기
- contact sheet 제작
- FAN-A / SUBJECT-B / STAGE / INTERVIEW / EYE / POLAROID / DESIGN PLATE 등으로 분류
- 각 파일 scene 배치 결정

**이 단계 전에는 HTML 제작 금지.**

## STEP 2 — 참고영상 shot map

H3 43초 영상을 scene/transition 기준으로 다시 정리한다.

최소:

```text
time
visual world
camera
foreground object
transition trigger
next scene handoff
```

## STEP 3 — Lusion scroll map

제품오너 녹화영상에서:

- sticky/fullscreen 구간
- menu state
- project/media 전환
- large type
- scroll continuation cue

을 추출한다.

## STEP 4 — 10 scene static composition

모션 전에 1920×1080 기준 각 scene의 keyframe을 먼저 만든다.

10개 keyframe이 모두 PASS된 뒤 motion 시작.

## STEP 5 — Scroll runtime

01→10을 한 timeline으로 연결.

## STEP 6 — transition polish

fade 위주라면 FAIL.

반드시 handoff object를 통한 전환으로 다시 수정.

## STEP 7 — menu / navigation

chapter menu와 progress HUD 완성.

## STEP 8 — responsive

desktop/mobile contact sheet 제작.

## STEP 9 — 실제 스크롤 녹화

최소 1920×1080 전체 스크롤 capture 제출.

---

# 18. 반드시 실패로 판정할 결과

다음 중 하나라도 해당하면 V2는 HOLD다.

1. 일반 섹션형 랜딩처럼 보임
2. 배경이 단순 crossfade만 함
3. 01의 FAN-A 지정 원본을 새 인물로 바꿈
4. 고화질 폴더의 좋은 사진 몇 장만 반복하고 나머지를 무시
5. 사진 속 인물보다 UI 카드 테두리가 더 눈에 띔
6. 매 장면에 벚꽃/나무를 반복해 촌스러움
7. 모든 장면이 cream/pink 한 팔레트
8. 03/04가 단순 앱 아이콘 나열
9. 05가 흑백 에디토리얼이 아님
10. 07 lens transition이 단순 둥근 div 장식에 그침
11. 09 Connection의 인과 흐름이 안 보임
12. 10 이전에 완성 나무를 계속 노출
13. 메뉴가 Bootstrap navbar처럼 보임
14. 역스크롤 시 transition이 깨짐
15. 모바일에서 인물 얼굴/타이포가 잘림
16. 스크롤이 버벅이고 이미지가 늦게 튀어 나옴
17. 참고영상의 motion grammar와 Lusion의 scroll immersion이 결과물에서 느껴지지 않음

---

# 19. PASS 기준

V2는 아래가 모두 충족되어야 DESIGN PASS 후보가 된다.

## Visual

- 10개 장면이 각각 독립된 art direction을 가짐
- 그러나 FAN-A와 감정 경로 때문에 하나의 영화처럼 연결됨
- 고화질 인물 사진이 화면의 주인공
- 큰 타이포가 UI가 아니라 공간의 일부처럼 보임
- 화면 정지 캡처만 해도 portfolio-grade

## Motion

- 스크롤만으로 01→10이 자연스럽게 이어짐
- 최소 7개 이상의 전환이 object/mask/portal 기반
- parallax와 z-depth가 분명함
- 역스크롤 가능

## Product Meaning

- 01 첫 단서
- 02 반복 재생/궁금함
- 03 탐색 확대
- 04 플랫폼 이동
- 05 감정 인식
- 06 순간 축적
- 07 집중
- 08 보고/듣고/느낌
- 09 Connection 이유
- 10 하나의 LoveTree

의 의미가 설명 없이도 대략 읽힘

## Asset

- 고화질 폴더 전체 asset usage map 제출
- FAN-A 지정 원본 사용 확인
- low-resolution stretch 없음

## Runtime

- desktop full capture 정상
- 1440 width 정상
- mobile 기본 정상
- menu/ESC/jump 정상
- reduced motion 기본 대응

---

# 20. 디자인팀장 완료 보고 형식

작업 완료 후 말로 “완료했습니다”만 보고하지 않는다.

아래 형식으로 제출한다.

```text
TRACK65_V2_SCROLL_CINEMATIC_REPORT

1. 기준 원본
- H3 reference:
- Lusion recording:
- High-res asset folder:

2. 결과물
- HTML:
- Assets:
- Desktop contact sheet:
- Mobile contact sheet:
- Scroll capture:

3. 자산 감사
- 발견 이미지 총 수:
- 실제 사용 수:
- 제외 수:
- 제외 사유:

4. Scene 01~10
- 각 scene 핵심 visual
- 각 scene 사용 asset
- 각 scene scroll behavior

5. Handoff transitions
01→02:
02→03:
...
09→10:

6. Lusion 적용 요소
- sticky stage
- scroll scrub
- menu
- full-bleed visual
- project-like scene change

7. H3 적용 요소
- typography architecture
- portal transition
- media-to-world
- lens transition
- final reveal

8. QA
- 1920×1080:
- 1440×900:
- mobile:
- reverse scroll:
- ESC/menu:
- reduced motion:
- performance:

9. Known limitations

10. DESIGN PASS 요청 여부
```

---

# 21. 최종 지시

이번 작업의 목표는 **LoveTree 색을 입힌 평범한 웹페이지**가 아니다.

다음 감각이 나와야 한다.

> 첫 순간을 본 사람이 스크롤을 내리는 동안 실제로 그 사람의 머릿속 팬 탐색 세계를 통과하고, 마지막에야 “이 모든 단서와 감정과 탐색이 하나의 LoveTree였구나”라고 이해한다.

따라서:

- 01은 계단을 오른다.
- 02는 눈에 들어간다.
- 03은 콘텐츠 세계에 빠진다.
- 04는 플랫폼 사이를 건넌다.
- 05는 감정을 멈춰 본다.
- 06은 순간을 쌓는다.
- 07은 렌즈로 더 깊게 본다.
- 08은 보고 듣고 느낀 것을 합친다.
- 09는 왜 다음으로 갔는지를 연결한다.
- 10에서야 그 모든 길이 LoveTree가 된다.

**MiniMax H3의 공간 전환 리듬 + Lusion의 scroll-driven immersive website 구조 + Track 65 고화질 여성 자산을 결합하되, 기존 레퍼런스의 로고/콘텐츠를 복제하는 것이 아니라 LoveTree의 10장 서사를 동일 수준의 완성도로 재구성한다.**

