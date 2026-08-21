# DREAM MEMORY · Implementation Report v1.2

## 상태
- 결과물: `lovetree-dream-memory-cinematic-v1.2.html`
- 상태: **신규 후보 / 승인 전 / Production 반영 금지**
- 기존 `v1`, 캐스트 풀, LoveTree 48/49: **overwrite 없음**

## 이번 긴급 목적 복귀 반영
캐스트 확장과 Identity Lock 대기를 중단하고 기존 여성·남성 후보를 **HTML 프로토타입용 임시 자산 창고**로만 사용했다. Face roster, 캐릭터 카드, profile UI는 결과물에 없다.

## 구현 핵심
- 44.5초 / 10 Scene cinematic loop
- `빠름 → 정지 → 파편 → 정지 → 전환`의 비균일 리듬
- 얼굴 close-up 연속 사용을 피하고 full-body walking, performance, backstage, Pair, detail crop, empty window/light를 교차
- Save: 사용자 클릭 시 약 0.32초 실제 timeline freeze + light settle + synthetic click tone(사운드 ON일 때만)
- Connection: 사람 관계도 대신 `stage circular light → light-only → window circular light` match cut
- Tree: 처음부터 노출하지 않고 Scene 09에서 trunk → twigs → Moment light nodes가 순서대로 축적
- muted autoplay / play-pause / sound / restart
- desktop + mobile responsive composition
- `prefers-reduced-motion`에서 autoplay off
- 외부 폰트/스크립트/이미지 요청 없음; self-contained HTML

## 자산 사용
기존 LoveTree 생성 자산만 사용했다. 여성 Batch의 close/half/full/performance/pair/backstage 자산과 기존 남성 승인 후보 portrait를 임시 Scene 재료로 사용했다. 이 자산 사용은 **HTML prototype용**이며 Identity Lock 승인으로 해석하지 않는다.

## 저작권
NewJeans / ILLIT / ENHYPEN 티저의 실제 프레임, 로고, 음원, 고유 artwork를 HTML에 넣지 않았다. 결과에 번역된 것은 cut rhythm, breath, light match, reveal timing, space transition grammar이다.

## 알려진 한계
- 현재 남성 자산은 대부분 portrait이므로 male full-body 비중은 낮다. 그러나 전체 HTML에서는 기존 여성 full-body/performance/backstage 자산을 사용해 close-up 연속 문제를 제거했다.
- 제품 오너 시각 검토 후 특정 Scene에서 남성 전신 또는 공간 plate가 반드시 필요하다고 판정될 때만 Scene ID가 명확한 최소 신규 생성으로 보강한다.
