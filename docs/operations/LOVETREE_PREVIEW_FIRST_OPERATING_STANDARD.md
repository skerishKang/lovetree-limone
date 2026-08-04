# LoveTree Preview-First 개발·검토·배포 운영기준

- 버전: **v1.1**
- 시행일: **2026-08-04**
- 변경 핵심: **구현 컴퓨터의 Preview 전 수동 캡처 의무 삭제**

## 핵심 결정

컴2는 **구현·자동검증·Preview 배포**까지만 담당한다.

시각 검토와 캡처는 공개 Preview 이후 다음 우선순위로 수행한다.

1. ChatGPT CTO
2. 컴1 독립 검증자
3. 컴2는 예외적 진단 상황에서만

`구현 → 자동검증 → Preview 배포 → CTO 직접 검토 → Preview 기반 캡처 → 수정 → 사용자 승인 → 병합 → Production 검증`

## 역할

### 컴2 — 구현자

- 기능 구현과 코드 수정
- lint, typecheck, test, build 및 최소 browser smoke test
- exact head push와 Draft PR 갱신
- 격리된 공개 Preview 배포
- Preview URL, 배포 SHA, 자동검증 결과 보고
- **Preview 전 장면별 수동 캡처 묶음과 대형 evidence ZIP은 만들지 않음**

### ChatGPT CTO — 검토 책임

- PR head와 Preview 배포 SHA 일치 확인
- 공개 Preview URL 직접 접속
- 기능, 콘텐츠, 반응형, 메뉴, CTA 등 실제 결과 검토
- 가능한 범위에서 직접 화면 캡처
- 직접 캡처가 제한되면 컴1에 공개 URL 기반 표준 캡처 지시
- `CTO_PREVIEW_REVIEW_PASS` 또는 `CTO_PREVIEW_CHANGES_REQUIRED` 판정

### 컴1 — 독립 검증자

- Preview 배포 전 대기
- CTO 요청 시 공개 Preview URL을 대상으로 검증
- 표준 viewport 캡처와 브라우저 측정 수행
- localhost 또는 구현자 작업환경을 최종 승인 근거로 사용하지 않음
- 코드 수정, 병합, Production 배포 금지

### 사용자 — 제품 책임자

- 공개 Preview 직접 확인
- 시각·제품 역할 최종 결정
- 확인한 exact SHA에 대해서만 `UI_APPROVED`
- 병합과 Production 배포 최종 승인

## 캡처 정책

| 항목 | 원칙 |
|---|---|
| Preview 전 수동 캡처 | 원칙적으로 금지 |
| 자동 테스트가 생성하는 최소 캡처 | 허용 |
| 최종 시각 캡처 기준 | 공개 Preview URL |
| 캡처 책임 우선순위 | CTO → 컴1 → 컴2 |
| head 변경 후 | 기존 캡처·검토·승인 무효 |
| 최종 evidence ZIP | Preview 검토 이후 필요할 때 생성 |

공개 URL은 CTO가 직접 접속해 검토한다. 다만 실행 환경에서 일반 HTML 캡처가 제한되면 컴1이 동일 공개 URL을 Playwright 등으로 캡처한다. 중요한 것은 **누가 캡처하느냐보다 실제 Preview를 캡처하느냐**이다.

## Preview 배포 전 최소 게이트

- PR head와 로컬 HEAD 일치
- clean worktree
- lint, typecheck, test, build 및 필수 검증 통과
- 보호 범위 위반 0
- 격리 Preview 사용
- 배포 SHA와 PR exact head 일치
- Production Worker·데이터·비밀키 무변경

## Preview 배포 전 필수가 아닌 것

- 장면별 12~14장 수동 스크린샷
- 최종 디자인 승인용 contact sheet
- 대형 시각 evidence ZIP
- 사용자 UI 승인
- Ready for Review 전환

## 상태 표식

- `LOCAL_VALIDATION_PASS`
- `PREVIEW_READY`
- `CTO_PREVIEW_REVIEW_PASS`
- `CTO_PREVIEW_CHANGES_REQUIRED`
- `UI_APPROVED`
- `MERGED_EXACT_HEAD`
- `PRODUCTION_VERIFIED`

## 현재 PR #35 적용

1. 컴2가 남은 코드 수정과 자동검증을 완료한다.
2. 수동 14장 캡처와 새 대형 ZIP은 Preview 전 필수에서 제외한다.
3. 컴2는 격리 Preview를 배포하고 URL과 exact SHA를 보고한다.
4. CTO가 공개 Preview를 직접 검토한다.
5. 필요한 캡처는 CTO가 수행하거나 컴1에 Preview URL 기반으로 지시한다.
6. 문제가 있으면 컴2가 수정하고 재배포한다.
7. 사용자가 Preview를 확인한 뒤에만 승인·병합한다.

> **구현자는 Preview를 빨리 만들고, 검토자는 실제 Preview를 보고 캡처하며, 사용자는 그 Preview를 승인한다.**
