# LoveTree 50번 4-2기 5차 전면반려 및 HARD RESET 지시서
## SUPERNOVA 벤치마크 유지 / LoveTree 컨셉 우선 재설계

**문서 상태:** 설계팀장 4기 긴급 재설계 지시  
**대상:** LoveTree 4-2기 시네마틱 디자인팀장  
**대상 트랙:** `50_드림메모리_시네마틱_분류대기_v1`  
**기존 후보:** `Supernova Exact Benchmark v1 / v1.1`  
**기존 후보 판정:** `VISUAL FAIL / PRODUCT CONCEPT FAIL / 보존만 하고 수정 금지`  
**신규 작업:** `50_SUPERNOVA_LOVETREE_FIRST_HARD_RESET`  
**작성일:** 2026-08-09

---

# 0. 제품 오너 최신 판정

제품 오너는 현재 Supernova v1.1 결과를 시각적으로 반려했다.

핵심 판정은 다음이다.

- 여성 캐스트가 프리미엄 K-pop 아이돌 시네마틱 기준에 미달한다.
- 여러 여성이 임의로 등장하여 "누군가에게 빠져드는 LoveTree의 감정 경로"가 보이지 않는다.
- 연출이 Supernova의 컷을 흉내 내는 데 머물고 LoveTree 제품 컨셉이 사라졌다.
- 마지막 Tree bloom도 앞선 Moment와 Connection의 결과가 아니라 장식적인 엔딩처럼 보인다.
- 기술적으로 29.206초, 24 shot, console error 0을 맞춘 것은 시각/제품 Gate 통과 근거가 아니다.

따라서 기존 v1/v1.1을 추가 수정해서 살리지 않는다.

**V1/V1.1은 반려본으로 보존한다.**

---

# 1. 이번 실패의 원인

이번 실패의 핵심은 구현력이 아니라 설계 순서다.

잘못된 순서:

```text
Supernova 24개 shot
→ 각 shot에 여성 이미지/도시/오브젝트 끼워 넣기
→ 마지막에 LOVETREE / Tree bloom 붙이기
```

올바른 순서:

```text
LoveTree 핵심 감정 여정
→ 장면별 의미
→ 그 의미를 가장 강하게 표현하는 Supernova의 카메라/컷/렌즈/색/전환 문법 차용
→ LoveTree 시네마틱
```

이번부터 절대 규칙은:

> **LOVETREE FIRST / SUPERNOVA SECOND**

다.

---

# 2. LoveTree 핵심

LoveTree는 단순한 영상 모음이 아니다.

> **누군가 또는 무엇인가를 처음 발견한 순간부터 완전히 빠져들기까지의 콘텐츠·감정·행동 경로를 쉽게 저장하고, 그 경로를 다시 걸어 당시의 감정을 되살리며, 다른 사람도 그 길을 따라 새로운 팬이 되게 하는 몰입 경로 플랫폼이다.**

### Moment
콘텐츠 자체가 아니라 **내 마음이 실제로 움직인 정확한 순간**이다.

### Connection
순서선이 아니라 **왜 그 순간 다음에 다른 순간을 찾아갔는가**를 나타내는 감정의 인과관계다.

### Tree
예쁜 나무 UI가 아니라 **Moment와 Connection이 누적되어 만들어진, 다시 재생 가능한 감정 경로**다.

---

# 3. 50번 시네마틱의 주인공을 다시 정의한다

기존 v1/v1.1처럼 서로 다른 여성 얼굴을 계속 보여주는 방식을 중단한다.

## 주인공

**한 명의 PRIMARY FICTIONAL FEMALE IDOL**

을 중심으로 한다.

사용자가 사랑에 빠지는 "대상"이 누구인지 처음부터 끝까지 식별 가능해야 한다.

### Secondary cast

- 3~5명까지 같은 fictional group의 멤버를 둘 수 있다.
- secondary cast는 group/performance context 역할이다.
- 서로 다른 여성 6명을 각각 독립적인 주인공처럼 보여주지 않는다.
- solo beauty barrage에서 정체불명의 다른 얼굴이 계속 바뀌면 실패다.

즉:

```text
한 사람을 처음 발견함
→ 그 사람의 다른 장면이 궁금해짐
→ 다른 무대/인터뷰/표정/행동을 찾아감
→ 점점 빠져듦
```

이 읽혀야 한다.

---

# 4. 캐스팅 Gate를 HTML보다 먼저 시행한다

현재 여성 자산을 자동 재사용하지 않는다.

"여 폴더에 있으니 사용한다" 금지.

## Gate A — Primary Idol Casting

먼저 PRIMARY 후보 6~10명만 Contact Sheet로 제출한다.

판정 기준:

- 실제 K-pop comeback teaser에 들어가도 어색하지 않은 스타성
- camera presence
- close-up crop에서도 안정적인 얼굴
- 현대적인 헤어/메이크업
- 얼굴 비율과 피부 표현의 자연스러움
- 과도한 AI plastic face 금지
- 성인 fictional idol
- 실존 aespa 멤버 복제 금지
- "일반 AI 여성 이미지"처럼 보이면 반려

**Primary 한 명이 승인되기 전에는 HTML 제작 금지.**

## Gate B — Identity Consistency

승인된 Primary에 대해 최소:

- face close
- medium
- performance/full-body
- white/high-key
- dark/night
- profile 또는 3/4

를 한 사람으로 인식할 수 있는지 확인한다.

정체성이 흔들리면 full cinematic 금지.

---

# 5. 이번 50번의 실제 LoveTree 서사

## ACT 1 — FIRST MOMENT
우연히 한 장면을 본다.

- 무대/영상 속 Primary의 짧은 표정 또는 움직임
- 아직 이름도 잘 모르는 상태
- 화면은 낯설고 약간 멀다

사용자 마음:

> "방금 저 사람 뭐지?"

## ACT 2 — CURIOSITY
그 장면이 계속 신경 쓰인다.

- close-up
- 왜곡된 기억
- 같은 표정을 다시 떠올리는 느낌
- 검색/다른 장면으로 이동하는 시각적 전환

감정:

```text
낯섦 → 궁금함
```

## ACT 3 — NEXT SEARCH / CONNECTION
다른 무대, 다른 영상, 다른 모습을 찾아간다.

Connection은 텍스트 선이 아니라:

- 빛의 이동
- 공간을 가르는 경로
- 화면을 다음 장면으로 끌고 가는 전환
- 다음 Moment를 실제로 열어버리는 motion

이어야 한다.

감정:

```text
궁금함 → 놀람 → 호감
```

## ACT 4 — DEEPENING
Primary의 다른 면을 본다.

예:

- performance
- interview/off-stage 느낌
- 웃음/표정
- group 안에서 눈에 들어오는 순간
- 다시 Primary close

여러 여성을 보여주는 것이 아니라 **같은 한 사람을 여러 Moment에서 다시 발견하는 과정**이다.

감정:

```text
호감 → 설렘 → 몰입
```

## ACT 5 — TREE REVEAL
지금까지 지나온 Moment의 흔적과 Connection이 사라지지 않고 축적된다.

```text
First Moment trace
+ Second Moment trace
+ Third Moment trace
+ Connection paths
```

가 한 구조로 수렴하며 LoveTree가 된다.

Tree가 갑자기 마지막 3초에 등장하면 실패다.

> **앞에서 실제로 보았던 Connection의 흔적이 마지막에 Tree의 가지였다는 것이 드러나야 한다.**

---

# 6. Supernova는 무엇을 따라할 것인가

가져올 것:

- close ↔ wide 거리 충격
- dark ↔ white ↔ vivid pink/cyan/orange 색 충돌
- fisheye / lens distortion
- 아주 짧은 micro-cut
- 갑작스러운 공간 변화
- scale transition
- whip / push / pull
- 인물과 공간의 기묘한 관계
- beauty hold와 rapid barrage의 대비
- 마지막까지 밀어붙이는 K-pop teaser energy

따라하지 말 것:

- city shot이 있으니 아무 도시 이미지 삽입
- fire가 있으니 아무 fire portrait 삽입
- white beauty barrage가 있으니 다른 여성 얼굴 7개 삽입
- group shot이 있으니 6명 사진을 줄 세움
- wireframe logo가 있으니 의미 없는 wireframe 추가

**원본의 표면을 따라하지 말고 연출 기능을 따라한다.**

---

# 7. 24-shot Exact Map 규칙 변경

기존 지시의 "24 shot을 그대로 채워라"는 우선순위를 해제한다.

유지 가능한 것:

- 전체 약 29초 rhythm
- 빠른/느린 구간 대비
- 주요 cut density
- 14~20초 rapid energy
- finale 전 title/reveal tempo

LoveTree의 감정 인과관계를 더 명확하게 만들기 위해:

- shot merge
- shot split
- 길이 ±15~20% 조정
- 의미 없는 object shot 제거
- LoveTree Connection shot 추가

를 허용한다.

단, Supernova를 참고했다는 카메라/컷/색/거리 언어는 명확해야 한다.

---

# 8. Floating-photo / Collage 금지

- 여성 portrait를 카드처럼 띄우기 금지
- 여러 얼굴을 grid/panel로 배열 금지
- 동일 portrait를 scale만 다르게 반복 금지
- 사진이 화면에서 천천히 둥둥 이동 금지
- 이미지 위에 glow만 얹어 cinematic이라고 처리 금지
- 얼굴 6개를 보여주는 것을 group performance로 대체 금지

인물이 등장하려면:

> **장면 안에 인물이 존재한다**

고 느껴져야 한다.

full-bleed scene / environmental compositing / foreground-background / silhouette / lighting / camera framing을 사용한다.

---

# 9. 48에서 가져와야 할 것

48 Neon Pilot의 소재는 가져오지 않는다.

금지:
- aircraft
- cockpit
- radar
- military HUD
- lime system

가져올 것:

- 첫 1~3초 강한 hook
- 예상하기 어려운 화면 변화
- 강한 camera push/pull
- scene state가 계속 변하는 느낌
- 사진 전시가 아니라 사건이 계속 발생하는 구조
- climax로 실제 밀려가는 리듬

---

# 10. Tree의 재정의

### First Moment
아주 작은 light trace 1개 발생.

### Second Moment
첫 trace에서 다른 방향으로 Connection이 뻗음.

### Third Moment
새로운 branch가 생김.

### Deepening
branch가 계속 늘어남.

### Finale
camera pullback 또는 공간 반전으로:

> **지금까지의 Connection path 전체가 하나의 LoveTree였음**

을 보여준다.

Tree asset 한 장 fade-in 금지.  
wireframe Tree 갑자기 등장 금지.

---

# 11. 텍스트 사용

기존 `MOMENT / SAVE IT / LOVETREE` 같은 문구를 장식처럼 남발하지 않는다.

POC에서는 텍스트를 거의 쓰지 않는다.

허용:

- 첫 Moment 이후 아주 짧은 `FIRST MOMENT`
- Connection 발생 시 필요하면 `WHY NEXT?`
- 마지막 `LOVETREE`

시각만으로 이야기 이해가 안 되는데 텍스트로 설명하면 실패다.

---

# 12. 바로 29초 HTML을 만들지 않는다

## STEP 0 — LoveTree Interpretation Sheet

1페이지.

반드시 다음을 적는다.

- 이 영상에서 사용자가 누구에게 빠지는가
- First Moment가 무엇인가
- 왜 Next Moment로 가는가
- 감정이 어떻게 바뀌는가
- Connection은 화면에서 어떻게 보이는가
- 마지막 Tree가 앞 장면과 어떻게 인과적으로 이어지는가

## STEP 1 — Primary Idol Gate

6~10 후보 Contact Sheet.

승인 전 다음 단계 금지.

## STEP 2 — 8~10초 SEMANTIC POC

딱 다음 4개 사건만 만든다.

```text
First Moment
→ Curiosity
→ Connection opens Next Moment
→ branch trace remains
```

필수:

- Primary 1명
- secondary solo 얼굴 0
- random female face 0
- floating photo 0
- 실제 camera/lens motion
- Supernova 스타일의 강한 색/거리 변화
- Connection 1회
- branch trace 1회

## STEP 3 — 제품 오너 시각 Gate

다음 질문을 모두 통과해야 full version 허용.

1. 이 인물이 실제 프리미엄 fictional K-pop idol처럼 보이는가?
2. 한 사람에게 빠지는 과정으로 읽히는가?
3. Supernova의 강한 연출 에너지가 느껴지는가?
4. 정적인 사진 slideshow처럼 보이지 않는가?
5. 왜 다음 Moment로 이동했는지 시각적으로 느껴지는가?
6. 마지막 흔적이 Tree 성장의 시작으로 읽히는가?
7. "LoveTree가 아니면 설명할 수 없는 영상"인가?

하나라도 NO면 29초 full version 제작 금지.

---

# 13. 기존 v1/v1.1 처리

삭제하지 않는다.

기존 산출물은:

`REJECTED_VISUAL_AND_PRODUCT_CONCEPT`

상태로 보존한다.

기존 v1.1에서 사용한 여성 얼굴/6인 master는 재사용 기본값이 아니라 **반려 자산**으로 본다.

다시 쓰려면 새 Primary Idol Gate에서 다시 통과해야 한다.

---

# 14. 신규 폴더 권장

`50_드림메모리_시네마틱_분류대기_v1`

아래:

```text
Supernova_LoveTree_First_HardReset_v2/
├─ 00_Concept/
├─ 01_Casting_Gate/
├─ 02_Semantic_POC/
├─ 03_QA/
└─ 90_Rejected_Reference/
```

기존 v1/v1.1을 덮어쓰지 않는다.

---

# 15. 첫 제출물

다음 4개만 먼저 제출한다.

1. `01_lovetree-interpretation-sheet.md`
2. `02_primary-idol-candidate-contact-sheet.jpg`
3. `03_semantic-poc-storyboard.jpg`
4. 승인 후에만 `04_semantic-poc-8to10s.html/mp4`

**29초 full HTML 제출 금지.**

---

# 16. 최종 작업 기준

> **"Supernova처럼 보이는 영상"을 만들지 말고, "LoveTree의 감정 경로를 Supernova의 연출 언어로 찍은 영상"을 만들어라.**

그리고 반드시:

> **한 사람을 처음 발견하고 → 왜 자꾸 찾게 되었는지 → 다음 Moment가 열리고 → 그 Connection들이 Tree로 자라는 과정**

이 보여야 한다.

이 서사가 보이지 않으면 컷 타이밍이 정확해도 FAIL이다.

**END OF WORK ORDER**
