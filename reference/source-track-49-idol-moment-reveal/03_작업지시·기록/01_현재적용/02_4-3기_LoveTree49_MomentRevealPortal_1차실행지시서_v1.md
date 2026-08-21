# LoveTree 4-3기 디자인팀장 임명 및 49번 1차 실행지시서 v1

- 발행: LoveTree 3기 설계팀장
- 대상: LoveTree 4-3기 디자인팀장
- 전담 프로젝트: `49_아이돌모먼트_리빌포털_분류대기`
- 기존 49번 1차 설계지시: 유지하되 본 지시가 최신 실행 기준
- 기존 48/50 수정: 금지
- Production 반영: 금지
- 기존 승인/후보 파일 overwrite: 금지
- 최종 사용자 노출 브랜드: `LOVETREE`

# 0. 역할 확정

4-3기는 49번을 전담한다.

병렬 구조는 다음과 같다.

- 4-1기: 48 Neon Pilot / Neon-System Track
- 4-2기: 50 Dream Memory / Dream-Memory Track
- 4-3기: 49 Moment Reveal Portal / Editorial-Portal Track

49번은 다른 팀과 중복이 아니다.
현재 `03_HTML결과물`이 비어 있으므로 4-3기가 최초 실제 구현 책임자다.

# 1. 49번의 핵심 목표

49번은 40초 티저 영상을 만드는 프로젝트가 아니다.

**K-pop 감도를 가진 실제 LoveTree 홈페이지 대문/포털**을 만든다.

핵심 사용자 여정:

`Editorial Hero → Moment Reveal → Landscape Moment Field → Tree Overview → Save Moment`

시각 우선순위:

`Reference Web Fidelity > Interaction Fidelity > Composition/Spacing > LoveTree Meaning > 장식`

# 2. 반드시 먼저 직접 확인할 레퍼런스

Drive `49/01_참고영상_분석`에 이미 다음이 있다.

- Hero/Reveal 구간
- Spatial Glass Board 구간
- Nature Overview 구간
- Save Modal 구간
- Contact Sheet
- `01_영상구간별_레퍼런스분석_LoveTree적용맵_v1.md`

문서만 읽고 구현하지 말 것.
각 MP4와 Contact Sheet를 직접 확인한 뒤 구현한다.

# 3. 이번 49번에서 절대 하지 않을 것

- Neon Pilot의 HUD/aircraft/cockpit 가져오기
- Dream Memory의 38초 자동 영화 구조 복사
- 종이 다이어리/꽃/나무 일러스트 전면 배치
- 일반 SaaS dashboard
- portrait 카드형 레이아웃
- 이미지부터 30~50장 대량 생성
- 특정 실제 아이돌 얼굴 직접 복제
- 참고영상 브랜드/로고/성과수치 복사

# 4. SCREEN A — Editorial Hero

첫 화면은 49번의 대표 장면이다.

필수:
- warm ivory/white background
- 중앙 대형 K-pop portrait
- 좌측 초대형 black grotesk headline
- 중앙 또는 상단 black pill navigation
- 넓은 whitespace
- portrait를 카드 안에 넣지 않음
- 인물이 viewport의 약 45~55%를 차지

사용 카피 후보:
`Keep the moment that moved you.`
또는
`Follow what made your heart move.`

보조:
`Save first. Understand the path later.`

오른쪽 소문구:
`ONE MOMENT CAN OPEN THE NEXT.`

# 5. HERO REVEAL

49번의 대표 interaction.

인물 전체가 다른 얼굴로 crossfade되면 실패.

동일 portrait 위에:
- cheek/jaw/chin
- transparent acrylic
- metallic trace
- thin signal line
- subtle chromatic reflection

등의 overlay가 pointer/scroll에 따라 나타나게 한다.

느낌:
`사람이 변함`이 아니라
`그 순간의 다른 층이 드러남`

# 6. HERO → LANDSCAPE

section cut처럼 끊지 않는다.

white hero가:
`ivory → pale green → full landscape`

로 이어진다.

portrait는 살짝 확대되며 사라지고,
landscape가 화면 전체를 가져간다.

# 7. SCREEN B — Moment Field

full-bleed 자연 landscape가 주인공.

그 위에 6~8개의 translucent Moment card.

중요:
카드가 풍경을 가리면 실패.

카드는:
- large / medium / narrow 혼합
- white glass
- backdrop blur
- thin border
- 최소 shadow

Moment 예:
- The stage where I noticed him
- That one fancam
- The interview I replayed
- First comeback night
- The photo I couldn't forget

단, 실제 사용자 데이터처럼 보이지 않게 prototype demo임을 유지.

# 8. Day / Night

같은 레이아웃을 유지한 채:
- day landscape → night/twilight landscape
- white glass → dark glass
- dark text → light text

로 전환.

카드 위치가 바뀌면 실패.

# 9. Moment Card Interaction

Hover:
- 아주 작은 lift
- image 1.00→1.03/1.04
- border highlight

Click:
`THIS MOMENT → NEXT CONNECTION → NEXT MOMENT`

을 짧게 보여주는 route preview.

Connection을 원+선 그래프 하나로 끝내지 말 것.

# 10. Bottom Dock

하단 중앙 translucent dock.

필터 예:
- ALL
- MEMBER
- MV
- FANCAM
- INTERVIEW
- PHOTO
- LIVE

desktop에서는 hover tooltip.
mobile은 swipe/compact.

# 11. SCREEN C — Tree Overview

Landscape 위에 얇은 glass interface.

필수:
- scenery 우선
- dashboard보다 공간 우선
- Moments / Connections / Routes는 HTML mock array에서 계산
- 임의 traction 수치 금지

좌:
current tree cover / memory note

중앙:
recent moments / light timeline

우:
Save Moment / Revisit Route / Open Connections

solid white dashboard는 금지.

# 12. SCREEN D — Save Moment

center modal.

필드:
- What moved you?
- Person / Work
- Visibility

Save 후:
`Moment saved. Add a connection now?`

버튼:
`Later / Connect`

V1은 local state/localStorage mock 허용.

# 13. 이미지 자산 전략

이번 49번은 인물 이미지가 매우 중요하다.

그러나 대량 생성 금지.

먼저 기존 LoveTree 자산에서 Hero 후보 3개를 찾는다.
49 방향과 안 맞으면 신규 Hero 1~2장만 만든다.

신규 Hero 기준:
- K-pop editorial
- low-angle 또는 subtle 3/4
- clean ivory
- fashion-forward but not sci-fi
- 자연스러운 피부
- no text/logo/HUD
- 최소 2000px, 권장 3000px+

Landscape:
- DAY/NIGHT 같은 구도 한 쌍
- 16:9 또는 21:9
- 사람 없음
- cinematic real-photo quality

Moment thumbnails:
기존 48/50의 clean 자산을 재활용 가능.
단 절대사용금지 실패봉인 자산은 금지.

# 14. 기존 작업에서 배운 실패 방지 규칙

## 이미지 경로
최종 검토용 HTML은 실제 더블클릭 검증.
404/broken image 0건.

## Self-contained
가능하면 최종 검토본은 self-contained 또는 정확한 package-relative 경로.

## 저해상도 확대
낮은 해상도 이미지를 cover로 확대하지 말 것.

## CSS-only 자연풍경
풍경이 핵심인 장면을 gradient/CSS 도형만으로 때우지 말 것.

## 기술 PASS ≠ 시각 PASS
console 0건이어도 제품 오너 시각 검토 전 채택 금지.

# 15. Mobile

390×844 필수.

desktop을 축소하지 않는다.

Hero:
- portrait 90~110vw 가능
- headline 46~62px
- 얼굴을 가리지 않는 배치

Moment Field:
- 1열 장문 리스트 금지
- 2열 stagger 또는 horizontal spatial carousel

Overview:
- metrics first
- panel은 swipe/bottom-sheet 허용

Modal:
- near full-width

# 16. 첫 실행 순서

1. 49번 기존 지시/분석 읽기
2. 5개 레퍼런스 MP4 직접 보기
3. Hero/Glass/Overview/Save 각각 핵심 프레임 3~5개 선정
4. 기존 자산 Hero 후보 3개 선정
5. landscape 기존 후보 확인
6. 필요한 신규 이미지 슬롯만 작성
7. HTML skeleton 제작
8. Hero 완성
9. Reveal interaction 완성
10. Moment Field
11. Day/Night
12. Overview
13. Save Modal
14. Mobile 별도 구성
15. 실제 루트 HTML 더블클릭 검증
16. 제품 오너 제출

# 17. 제출물

`49_아이돌모먼트_리빌포털_분류대기/03_HTML결과물/`

주 결과:
`lovetree-49-moment-reveal-portal-v1.html`

함께:
- `reference-selection-v1.md`
- `asset-slot-map-v1.md`
- `implementation-report-v1.md`
- `validation-results-v1.json`
- `desktop-execution-v1.mp4`
- `mobile-execution-v1.mp4`
- `reference-vs-result-v1.jpg`

# 18. 자동 반려

다음 하나라도 있으면 FAIL.

1. Neon Pilot처럼 보임.
2. Dream Memory처럼 38초 영상 중심으로 구성됨.
3. Hero portrait가 작은 카드 안에 들어감.
4. Reference의 large-scale editorial composition이 사라짐.
5. Landscape가 CSS gradient뿐임.
6. Glass card가 SaaS dashboard처럼 불투명함.
7. Day/Night에서 layout 이동.
8. Hero Reveal이 다른 얼굴로 crossfade.
9. 제품 오너가 여는 HTML에서 이미지 누락.
10. 특정 실제 아이돌 직접 복제.
11. V1부터 이미지 수십 장 생성.
12. 48/50 파일 수정.
13. Production 반영.

# 19. 최종 PASS 질문

- 첫 화면을 보자마자 고급 Editorial web처럼 보이는가?
- Hero portrait가 압도적인가?
- Reveal이 실제 interaction으로 느껴지는가?
- Landscape가 충분히 살아 있는가?
- Moment card가 풍경 위에 떠 있는가?
- Tree Overview가 관리 dashboard가 아니라 기억 공간처럼 보이는가?
- Save Moment가 실제로 작동하는가?
- desktop/mobile 모두 별도 디자인처럼 보이는가?
- Neon Pilot/Dream Memory와 완전히 다른 제3의 LoveTree 후보인가?

모두 YES일 때만 PASS_CANDIDATE.

# 최종 명령

4-3기는 별도 51번을 만들지 않는다.

**현재 비어 있는 49번을 전담해 최초 실제 HTML을 제작한다.**

`49 = Editorial Hero + Reveal + Landscape Glass Moment Field + Tree Overview + Save Moment`

이 구조를 높은 reference fidelity로 구현하고,
결과를 `03_HTML결과물`에 별도 V1으로 제출한다.
