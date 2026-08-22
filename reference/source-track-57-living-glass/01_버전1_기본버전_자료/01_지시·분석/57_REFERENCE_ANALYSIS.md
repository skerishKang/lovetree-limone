# Track 57 Reference Analysis — 컬러카드마인드맵_자동전개

## 분석 대상
- 파일: `★_참고영상_컬러카드마인드맵_자동전개.mp4`
- 실제 파일: 1904×1068 / H.264 / 30fps / 32.3초
- 분석 목적: 마인드맵 기능이 아니라 **Glass Card의 물성·포인터 반응**을 추출

## 직접 관찰한 시각·동작 속성
1. 거의 검정에 가까운 graphite/smoky 배경 위에 카드가 떠 있다.
2. violet / rose / amber 세 카드가 각각 독립된 컬러 identity를 가진다.
3. 카드의 색은 단색 fill이 아니라 어두운 유리 표면 안쪽에서 번지는 형태다.
4. 카드 가장자리에 얇은 highlight가 있고, 중앙보다 하단/측면에 colored glow가 더 넓게 퍼진다.
5. hover 시 카드는 크게 튀지 않고 **무거운 얇은 slab**처럼 소폭 기울어진다.
6. 포인터 위치에 따라 표면 반사 hotspot이 이동한다. 단순 hover box-shadow가 아니다.
7. 카드 내부 요소가 완전히 한 평면처럼 붙지 않고 icon/text/CTA가 미세한 깊이 차이를 가진다.
8. pointer leave 뒤 즉시 0deg로 끊기지 않고 damped return이 보인다.
9. 전체 조명은 과도한 neon보다 low-key colored glass에 가깝다.
10. 영상 속 generic SaaS 텍스트/아이콘/마인드맵 의미는 Track 57에 채택하지 않는다.

## Track 57 번역 원칙
- Analytics/Automation/Security → **FIRST MOMENT / TURNING MOMENT / NOW**
- generic text → **Moment title / date / emotion / note / media / WHY NEXT**
- CTA → `Moment 열기`, `다음 순간 보기`
- card color → emotion-derived tone
- permanent graph lines → 사용자가 `다음 순간 보기`를 눌렀을 때만 잠깐 나타나는 luminous Connection thread

## Visual Gate 판정
내부 디자인 Gate: **PASS**

근거:
- 첫 화면에서 3개 카드가 media + colored glass + edge highlight + glow로 분리된다.
- media가 카드 위에 단순히 붙은 thumbnail이 아니라 glass 안쪽 layer로 읽힌다.
- violet / rose / amber가 reference와 같은 계열의 독립 identity를 가진다.
- 후보 첫 화면은 reference보다 정보량이 많지만 generic dashboard로 후퇴하지 않고 LoveTree Moment 정보가 중심이다.

최종 제품 오너의 주관적 visual 승인과는 별개이며, 현재 상태는 `design-review candidate`다.
