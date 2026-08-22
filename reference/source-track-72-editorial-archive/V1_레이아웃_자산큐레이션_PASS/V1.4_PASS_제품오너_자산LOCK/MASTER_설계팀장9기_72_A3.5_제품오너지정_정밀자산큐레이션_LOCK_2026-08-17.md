# 설계팀장9기 — Track 72 A3.5 제품오너 지정 정밀 자산 큐레이션 LOCK 지시

**작성일:** 2026-08-17  
**작성자:** 설계팀장 9기  
**수신:** LoveTree 디자인팀장  
**Track:** `72_러브트리_에디토리얼모먼트아카이브_디스커버리월_V1`  
**정본 위치:**  
`H:\내 드라이브\[26]\[[지피티 작업]]\[01_러브트리]\03_디자인채택본\72_러브트리_에디토리얼모먼트아카이브_디스커버리월_V1`

**현재 상태:**  
`A3 STRUCTURE = PASS`  
`A3 ASSET CURATION = REJECT`  
`GATE B = HOLD`  
`NEXT = A3.5 PRODUCT-OWNER CURATION LOCK`

**중요:** 이 문서는 기존의 자산 큐레이션 일반지시보다 우선한다.  
이번 A3.5에서는 디자인팀장이 “비슷한 느낌의 다른 자산”으로 임의 교체하면 안 된다.

---

# 0. 제품오너 최신 지시 — 최우선

현재 Track 72의 구조는 유지한다.

문제는 **디자인팀장이 자산을 고르는 방식**이다.

제품오너가 직접 확인한 폴더에는:

- 훨씬 세련된 모델형 얼굴
- 보라색/사이버틱 얼굴
- 수채화·청순·플로럴 이미지
- LoveBot
- 핑크빛 자동차
- 크리스털
- LoveTree 자체 상징
- 블랙실버 남성 전신
- 여성 누끼 전신

이 다수 존재한다.

그런데 A2/A3에서는 상대적으로 무겁거나 평범한 자산을 선택했다.

따라서 A3.5는 **디자인팀장 자유 큐레이션이 아니다.**

> **아래 지정 자산군과 슬롯 규칙을 그대로 따른다.**

---

# 1. 이번 수정에서 절대 바꾸지 않을 것

A3에서 PASS된 아래 구조는 LOCK한다.

- 4-column masonry
- white editorial canvas
- sidebar 구조
- top filter 구조
- 10px 전후 rounded card
- 한국어 Sans-only
- video / object / full-body / LoveTree / text가 섞이는 heterogeneous archive
- first viewport에서 12개 이상 surface가 보이는 밀도

레이아웃을 새로 발명하지 않는다.

---

# 2. 이번 수정에서 바꿀 것

딱 두 가지다.

1. **첫 viewport 자산을 더 세련된 지정 자산으로 교체**
2. **색조 순서를 의도적으로 재배치**

---

# 3. 한국어 글꼴 — 재확정

한국어 명조/Serif 사용 금지.

허용:

```css
font-family:
  Pretendard,
  "Noto Sans KR",
  SUIT,
  "Apple SD Gothic Neo",
  "Malgun Gothic",
  Arial,
  sans-serif;
```

금지:

- Georgia
- Times
- Noto Serif KR
- 명조 계열
- 바탕체
- 궁서/캘리그래피형 한글

---

# 4. 첫 viewport 12 SLOT — 제품오너 지정

A3.5 첫 화면은 아래 12개 슬롯을 기준으로 구성한다.

디자인팀장은 슬롯의 **카테고리·톤·자산군을 임의 변경할 수 없다.**

---

## SLOT 01 — SATURATED EDITORIAL VIDEO

**유지/사용**

`결과물\65_입덕단서_시네마틱에디토리얼.mp4`

조건:

- A3에서 재선택한 saturated `FIRST CLUE` 계열 프레임 유지
- 사람 얼굴 close-up보다 typography / collage / editorial structure가 보이는 프레임 우선
- 첫 row에서 시각적 시작점 역할

**ROLE:** saturated editorial anchor  
**TONE:** vivid / cinematic / graphic

---

## SLOT 02 — CYBER / VIOLET FACE

**폴더**

`02_디자인팀\캐릭터\캐릭터-얼굴만`

**1순위 지정 후보**

- `sphere-final.png`
- `trace-profile.png`
- `bloom-final.png`

위 3개 중에서만 선택.

**우선순위**
1. `sphere-final.png`
2. `trace-profile.png`
3. `bloom-final.png`

다른 얼굴 파일 임의 사용 금지.

조건:

- 보라/사이버/투명/미래적인 인상이 가장 강한 것을 사용
- 첫 화면 얼굴 close-up은 이 슬롯 포함 최대 2개

**ROLE:** cyber portrait accent  
**TONE:** violet / futuristic / translucent

---

## SLOT 03 — LOVETREE CORE SYMBOL

**지정 파일**

`02_디자인팀\캐릭터\캐릭터-러브트리\04_lovetree-sculpture.png`

이 파일을 우선 사용.

임의로 다른 평범한 UI 캡처로 교체 금지.

조건:

- LoveTree 자체 상징이 한눈에 읽혀야 함
- object/card 안에서 작게 넣지 말고 충분한 존재감 확보

**ROLE:** brand anchor  
**TONE:** sculptural / product identity

---

## SLOT 04 — PINK CAR

기존 첫 화면의:

`petal-runner-open-v3.png`

**첫 viewport 사용 금지.**

대신 아래 `ride` 계열을 사용.

**1순위**
`ride-side.png`

**2순위**
`ride-doors-open.png`

**3순위**
`ride-front.png`

위 3개 외 자동차는 첫 화면 사용 금지.

조건:

- 제품오너가 지적한 핑크/웜 배경이 살아 있는 방향
- 검정/어두운 배경 자동차 금지
- car가 UI card가 아니라 object editorial처럼 보이게

**ROLE:** pink luxury object  
**TONE:** warm pink / metallic / refined

---

## SLOT 05 — BLACK-SILVER MALE FULL BODY

기존:

`01_stage-singing.png`

첫 viewport에서 제거.

아래 블랙실버 조각상 계열로 교체.

**1순위**
`신규조각상_06_마이크퍼포먼스_블랙실버.png`

**2순위**
`신규조각상_04_뒤돌아보기_블랙실버.png`

**3순위**
`신규조각상_01_정면스탠딩_블랙실버.png`

위 3개 외 남성 전신은 첫 viewport 사용 금지.

**ROLE:** dark fashion silhouette  
**TONE:** black / silver / sculptural

---

## SLOT 06 — LOVEBOT

반드시 LoveBot 1개를 첫 viewport에 넣는다.

**1순위**
`lubt-bloom.png`

**2순위**
`lubt-magic.png`

**3순위**
`lubt-guide.png`

**4순위**
`lubt-heart.png`

**5순위**
`lubt-idle.png`

위 계열 중 하나만 사용.

조건:

- 작은 아이콘처럼 축소 금지
- object tile 전체의 55~75% 정도 존재감
- background는 white / pale pink / soft neutral 중 하나

**ROLE:** playful brand artifact  
**TONE:** playful / pink / character object

---

## SLOT 07 — DARK NETWORK VIDEO

**지정 유지**

`결과물\52_글로벌모먼트오빗_3D네트워크.mp4`

조건:

- dark network / globe 장면
- 다른 pastel tile 사이에서 dark punctuation 역할
- 얼굴 중심 frame 금지

**ROLE:** dark spatial proof  
**TONE:** black / blue / network

---

## SLOT 08 — SOFT WATERCOLOR / FLORAL

제품오너가 직접 지적한 **수채화·청순·플로럴 계열**을 반드시 한 장 넣는다.

우선 탐색 대상:

- `캐릭터-얼굴만` 내 MIRA / 키프레임 / 수채화 / floral 계열
- 제품오너 첨부 스크린샷의 두 번째 그룹과 동일 visual family

**선택 조건**
- 꽃이 화면의 일부 이상 보임
- beige/pink/ivory watercolor
- 여성 인물은 청순/soft editorial
- 사진 실사형보다 회화/수채화 느낌이 명확

**금지**
- 같은 beige portrait를 평범하게 잘라 쓴 이미지
- 꽃 없이 얼굴만 있는 soft portrait

이 슬롯은 디자인팀장이 아무 이미지나 선택할 수 없다.

먼저 후보 3장을 Contact Sheet에 놓고
그중 **가장 수채화/플로럴 성격이 강한 1개**만 사용한다.

**ROLE:** poetic soft counterpoint  
**TONE:** watercolor / ivory / floral / blush

---

## SLOT 09 — FEMALE CUTOUT

기존:

`02_dance.png`

첫 viewport에서 제거.

대신 여성 누끼 계열 사용.

**1순위**
`H_000.png`

**2순위**
`I_000.png`

**3순위**
`J_000.png`

방향:

- `H_000.png` = cobalt/black fashion 계열 우선
- `I_000.png` = rose-black 계열 대안
- `J_000.png` = black/denim 계열 대안

위 3개 외 여성 전신 임의 사용 금지.

조건:

- fashion silhouette로 보이게
- green-screen 버전 사용 금지
- `*_green.png` 전부 금지
- 사람 catalog card처럼 보이지 않게 충분한 negative space 사용

**ROLE:** clean female fashion silhouette  
**TONE:** cobalt / black / editorial

---

## SLOT 10 — CRYSTAL

**1순위**
`crystal-awake-02.png`

**2순위**
`crystal-front.png`

**3순위**
`crystal-threequarter.png`

A3에서 사용한 crystal 방향은 유지 가능.

조건:

- glass/cyber/object 역할
- dark tile 옆에 붙이지 말고 light/soft tile 사이에 배치

**ROLE:** optical object  
**TONE:** crystal / translucent / cool

---

## SLOT 11 — LIGHT PRODUCT VIDEO

**지정 파일**

`결과물\59_메모리스케치북_페이지여정.mp4`

조건:

- light / pink / memory book UI 장면
- 너무 평범한 form screenshot 금지
- illustration / page / tactile UI가 잘 보이는 프레임 선택

**ROLE:** product/UI proof  
**TONE:** light / pink / tactile

---

## SLOT 12 — CONNECTION TEXT

실제 DOM text.

한국어 Sans-only.

예:

`CONNECTION`

`한 장면을 저장한 뒤,`
`이전 무대까지 거슬러 올라갔다.`

`호감 → 확신`

조건:

- 감성 편지처럼 보이지 않게
- data / path landmark 느낌
- serif 금지
- 배경: white 또는 very pale neutral

**ROLE:** LoveTree meaning anchor  
**TONE:** minimal / structural / text

---

# 5. 추가 VIDEO가 필요한 경우

첫 viewport에 video를 4개 유지하고 싶다면:

`결과물\67_메모리테이프_인터랙티브롤.mp4`

를 추가할 수 있다.

단:

- SLOT 02/03/04/05/06/08/09/10을 밀어내면 안 됨
- 첫 viewport에서 13번째 partial tile로 노출하거나
- 바로 아래 row 첫 tile로 사용

A3보다 video count를 늘리기 위해 지정 object를 제거하지 않는다.

---

# 6. 첫 화면에서 사용 금지 — 명시적 BLACKLIST

다음은 첫 viewport에 사용하지 않는다.

- `petal-runner-open-v3.png`
- `01_stage-singing.png`
- `02_dance.png`
- green screen 계열 `*_green.png`
- 일반적인 frontal face portrait 다수
- 비슷한 black-cap 얼굴 2개 이상
- beige soft portrait 2개 이상
- 검정 자동차 배경
- 동일 계열 UI screenshot 2개 이상
- 같은 인물 다른 각도 반복
- 같은 asset family 연속 배치

이 파일들이 프로젝트 전체에서 영구 폐기되는 것은 아니다.
**Track 72 첫 화면 큐레이션에서만 제외**한다.

---

# 7. 첫 화면 색 배치 순서 — 임의 재배치 금지

4-column 기준으로 인접 tile이 같은 톤이 되지 않게 아래 리듬을 맞춘다.

## Row / Flow 권장

**Column 1**
- saturated video
- LoveBot
- light product video

**Column 2**
- cyber violet portrait
- pink car
- crystal

**Column 3**
- LoveTree sculpture
- watercolor/floral
- Connection text

**Column 4**
- black-silver male
- dark network video
- female cobalt cutout

이 정확한 세로 순서를 기본값으로 사용한다.

Masonry height 때문에 위치가 조금 밀릴 수는 있으나,
**인접 tone sequence는 유지한다.**

---

# 8. 톤 균형 HARD RULE

첫 viewport에서 반드시 모두 존재해야 한다.

- Violet / Cyber: 1
- Warm Pink / Rose: 1 이상
- Black / Silver: 1 이상
- Dark Network: 1
- Watercolor / Floral / Ivory: 1
- LoveTree Brand Object: 1 이상
- Crystal / Transparent: 1
- Light Product UI: 1
- Playful LoveBot: 1

한 톤이 3칸 이상 연속되면 FAIL.

---

# 9. 디자인팀장 재량 허용 범위

이번 A3.5에서는 재량이 매우 제한된다.

## 허용
- 각 tile 내부 crop 5~15% 조정
- object scale 조정
- 같은 지정 후보군 내 1→2→3순위 교체
- masonry 높이 미세조정
- video currentTime 재선택

## 금지
- 지정 자산군 밖으로 교체
- 본인이 더 예쁘다고 생각하는 다른 asset 임의 추가
- black theme로 재해석
- pastel-only로 통일
- portrait-only로 정돈
- asset을 새로 생성
- 지정 slot 삭제

---

# 10. 후보 교체 규칙

1순위 파일이 기술적으로 깨지거나
실제 화면에서 crop 문제가 있을 때만 2순위를 사용한다.

2순위로 바꿀 경우 Notes에 반드시:

- 1순위 파일명
- 실패 이유
- 2순위 파일명
- 변경 근거

를 기록한다.

단순히:

`2순위가 더 예뻐 보여서`

는 허용하지 않는다.

---

# 11. A3.5 제출 전 ASSET LOCK BOARD 필수

HTML을 바로 수정하기 전에 먼저:

`72_V1_GATE_A3_5_ASSET_LOCK_BOARD.png`

를 만든다.

구성:

- 12칸
- SLOT 01~12 번호
- 실제 사용할 파일 thumbnail
- filename
- 역할
- tone

이 Board와 실제 HTML 자산이 1:1로 일치해야 한다.

**Asset Lock Board 작성 후 다른 파일로 몰래 교체 금지.**

---

# 12. 제출물

A3.5는 아래 5종 제출.

1. `72_V1_GATE_A3_5_ASSET_LOCK_BOARD.png`
2. `72_V1_GATE_A3_5_REFERENCE_COMPARISON.png`
3. `72_V1_GATE_A3_5_CANDIDATE_SCREEN.png`
4. `72_V1_GATE_A3_5_NOTES.md`
5. `72_V1_GATE_A3_5_ASSET_LEDGER.md`

HTML은 기존 A3 구조를 수정해도 되지만
GATE B 기능은 아직 추가하지 않는다.

---

# 13. Asset Ledger 필수 항목

각 SLOT마다:

- SLOT #
- selected filename
- source folder
- visual family
- tone
- why selected
- previous asset
- why previous asset rejected
- fallback 2순위
- actual crop policy

를 기록한다.

---

# 14. PASS 기준

## PASS 1 — 세련미
첫 화면에서 “안전한 샘플 모음”이 아니라
**의도적으로 큐레이션한 디자인 아카이브**로 보인다.

## PASS 2 — 지정 자산 준수
12 SLOT이 지시된 자산군을 따른다.

## PASS 3 — Pink Car
검정차가 아니라 ride 계열 pink/warm car가 보인다.

## PASS 4 — LoveBot
LoveBot 1개가 분명히 보인다.

## PASS 5 — Cyber Portrait
보라/사이버 face 1개가 보인다.

## PASS 6 — Watercolor
수채화/플로럴 1개가 보인다.

## PASS 7 — Full Body
블랙실버 남성 + 여성 cutout이 각각 존재한다.

## PASS 8 — LoveTree
LoveTree sculpture/core visual이 명확히 보인다.

## PASS 9 — Color Rhythm
violet / pink / black-silver / dark / floral / crystal / light UI가 교차한다.

## PASS 10 — Korean Font
한국어 serif/명조 0건.

---

# 15. 현재 Gate 상태

기존:

`GATE A3 = PASS`
`GATE B = AUTHORIZED`

를 최신 제품오너 지시에 따라 아래처럼 정정한다.

```text
A3 STRUCTURE = PASS
A3 ASSET CURATION = REJECT
A3.5 PRODUCT-OWNER ASSET LOCK = REQUIRED
GATE B = HOLD
GATE C = HOLD
```

A3.5 승인 전 GATE B로 넘어가지 않는다.

---

# 16. 최종 지시

이번에는 디자인팀장이 자의적으로 “무난한 것”을 고르면 안 된다.

제품오너가 직접 지적한 자산을 활용해:

- 보라 사이버 얼굴
- 수채화·플로럴
- 핑크 자동차
- LoveBot
- LoveTree 조형
- 블랙실버 남성 전신
- 여성 누끼
- crystal
- actual video
- Connection text

를 **의도적으로 교차 배치**한다.

> **좋은 자산이 이미 있는데 덜 세련된 자산을 선택하는 것을 이번 Gate의 주요 실패로 본다.**

A3.5는 기능 작업이 아니라 **정밀 큐레이션 작업**이다.

GATE B/C 기능 추가 금지.
