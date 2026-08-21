# Track 73 V3 — 메뉴·라우트 적용 기록

## 상태
- V1/V2는 보존.
- V3는 별도 `V3_FAST_SCRUB_TEMPLATE_PORTAL` 후보.
- 모든 외부 템플릿은 새 탭으로 열어 Track 73 상태를 보존.

## 메뉴 역할
### 첫 순간 심기
- Track 64 `현재후보.html`
- 역할: 첫 감정 진입 / 첫 Moment 시작

### 둘러보기
- Track 62 원형 레일
- Codex 12-1 / 12-2 / 12-3 Living Media Sphere
- Codex 13 Liquid Glass Infinite Video Wall
- 역할: 공개 탐색 / 공간형 발견

### 내 러브트리
- Track 35 LP Player
- Track 39 LP Coverflow
- Track 58 Living Memory Pinboard
- Codex 14 v2 `개발본.html`
- 역할: 개인 감상 / 보관 / 정리 / 재방문

### 이야기
- Track 43 Memory Scene Recipe
- Track 70 selected V2.1
- 역할: Moment 구성 / 감정 리빌 / editorial narrative

### 가이드
- Codex 17 selected/root `최종본.html`
- 내부 전체 템플릿 지도
- 역할: global shell / cross-template navigation

## 경로 특이사항
- Codex 14는 루트 `최종본.html` 대신 자산 경로가 유지되는 `v2/개발본.html`을 사용.
- Track 58은 루트의 `★_최종_58_리빙메모리_핀보드.html` 사용.
- Track 70은 `선택-70_V2.1_LOVETREE_PORTAL_NAV_RETURN_FIX.html` 사용.

## Scrub 수정
V2의 delta 누적 + `seeked` 직렬 queue를 제거.
V3는 절대 pointer X → 영상 시간 매핑, `requestAnimationFrame`, 최신 pointer 우선, 1.65× gain을 사용.
