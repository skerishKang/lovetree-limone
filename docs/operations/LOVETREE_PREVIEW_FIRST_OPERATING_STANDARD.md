# LoveTree Preview-First 개발·배포 운영기준

> 구현 결과를 공개 Preview에서 먼저 검토한 뒤 수정·승인·병합·최종 배포하는 표준 절차

- 문서 상태: **적용 승인**
- 버전: **v1.0**
- 시행일: **2026-08-04**
- 적용 범위: LoveTree UI·UX·프론트엔드·백엔드 변경 중 사용자 화면 또는 공개 동작에 영향을 주는 작업

## 1. 핵심 원칙

**구현이 끝났다는 보고만으로 승인하지 않는다. 공개 Preview 주소에서 실제 결과를 확인한 뒤 수정·승인·병합·최종 배포한다.**

기존의 `구현 → 로컬 검증 → 승인·병합 → 필요 시 배포` 흐름을 폐기하고 다음을 표준으로 적용한다.

`구현 → 자동 검증 → Preview 배포 → CTO 직접 검토 → 수정 반복 → 사용자 승인·병합 → Production 검증`

### 필수 원칙

1. **Preview 선행**: 사용자 화면이나 공개 동작에 영향을 주는 변경은 병합 전에 공개 Preview로 배포한다.
2. **직접 검토**: ChatGPT CTO는 Preview URL, 정확한 head SHA, 테스트·스크린샷·로그를 함께 확인한다.
3. **SHA 고정**: Preview가 가리키는 커밋과 PR head가 일치해야 한다. head가 변경되면 기존 검토와 승인은 무효다.
4. **수정 반복**: 문제 발견 시 동일 Draft PR과 동일 Preview 환경에서 수정·재배포·재검토한다.
5. **명시적 승인**: CTO 검토 통과와 사용자 UI 승인 전에는 Ready 전환, merge, Production 배포를 하지 않는다.

## 2. 표준 단계와 승인 게이트

| 단계 | 필수 작업 | 완료 표식 | 제약 |
|---|---|---|---|
| S0. 계획 확정 | 범위·보호 대상·기준 SHA·담당 컴퓨터 확정 | `PLANNING_COMPLETE` | 코드 변경 전 |
| S1. 구현·로컬 검증 | lint/typecheck/test/build/browser 검증 | `LOCAL_VALIDATION_PASS` | Draft PR 유지 |
| S2. Preview 배포 | 검증된 exact head를 공개 URL에 배포 | `PREVIEW_READY` | 병합·Production 금지 |
| S3. CTO Preview 검토 | URL 직접 접속, 라우팅·콘텐츠·동작·반응형·증거 교차검증 | `CTO_PREVIEW_REVIEW_PASS` 또는 `CTO_PREVIEW_CHANGES_REQUIRED` | head 변경 시 재검토 |
| S4. 사용자 UI 승인 | 사용자가 Preview를 직접 보고 제품 결정을 내림 | `UI_APPROVED` + exact SHA | 사용자 작성 승인만 유효 |
| S5. 병합 | expected head 확인 후 squash merge | `MERGED_EXACT_HEAD` | 자동 병합 금지 |
| S6. Production 배포·검증 | 병합 main을 배포하고 실제 URL 재확인 | `PRODUCTION_VERIFIED` | 이상 시 롤백 또는 hotfix |

## 3. 역할과 책임

### 작업 컴퓨터 / 코딩 에이전트
- exact base SHA에서 구현하고 Draft PR을 만든다.
- 로컬 자동 검증과 브라우저 검증을 수행한다.
- 검증된 head를 Preview에 배포하고 공개 URL을 보고한다.
- 발견된 문제를 동일 PR에서 수정한다.
- 승인·병합·Production 배포를 임의로 수행하지 않는다.

### ChatGPT CTO
- PR head, base, 변경 파일, 테스트, 증거 ZIP을 확인한다.
- 공개 Preview URL에 직접 접속해 라우트와 콘텐츠를 검토한다.
- 스크린샷·브라우저 로그와 실제 Preview 결과를 교차검증한다.
- PASS 또는 CHANGES_REQUIRED를 명확히 판정한다.
- 사용자 승인 전 Ready·merge·Production을 승인하지 않는다.

### 사용자 / 제품 책임자
- Preview를 보고 시각적·제품적 최종 결정을 내린다.
- `UI_APPROVED`는 검토한 exact SHA와 함께 명시한다.
- 기능 채택 위치와 제품 역할을 결정한다.
- 최종 병합과 Production 배포의 승인권을 가진다.

## 4. Preview 배포 필수 요건

- 로그인 없이 검토 가능한 HTTPS URL
- PR exact head SHA와 배포 SHA 일치
- Production 데이터·비밀키·결제·실사용 메시지 발송과 분리
- 검토 시작 URL과 주요 하위 경로 명시
- Preview 환경임을 확인할 수 있는 표식
- 코드 변경 시 새 head로 재배포하고 기존 승인 폐기
- 검토 완료 전 Preview 주소와 증거 ZIP 보존

## 5. 완료 보고 필수 항목

1. Draft PR 번호와 URL
2. exact base SHA와 exact head SHA
3. 공개 Preview URL과 검토 경로
4. 변경 파일과 보호 범위 위반 여부
5. lint/typecheck/test/build/DB·계약 검증
6. viewport별 브라우저 검증
7. console/page/hydration 오류 결과
8. 접근성·reduced-motion·키보드·초점 이동
9. 스크린샷·JSON·로그 evidence ZIP
10. 알려진 제한과 미해결 항목
11. Preview/Production 배포 상태

## 6. 허용·금지

| 행위 | 판정 | 조건 |
|---|---|---|
| Draft PR 생성 | 허용 | 구현 시작 후 |
| Preview 배포 | 필수 | 로컬 검증 통과 후 |
| Preview 수정·재배포 | 허용 | 동일 Draft PR |
| Ready for Review | 금지 | CTO Preview PASS와 사용자 승인 전 |
| UI_APPROVED | 금지 | 사용자가 Preview를 확인하기 전 |
| main 병합 | 금지 | exact SHA 승인 전 |
| Production 배포 | 금지 | 병합 및 별도 배포 승인 전 |
| Preview 삭제 | 금지 | 검토·증거 보존 완료 전 |
| 강제 푸시 | 원칙적 금지 | SHA 추적성 훼손 |

## 7. 상태 표식

- `PREVIEW_READY`
- `CTO_PREVIEW_REVIEW_PASS`
- `CTO_PREVIEW_CHANGES_REQUIRED`
- `UI_APPROVED`
- `MERGED_EXACT_HEAD`
- `PRODUCTION_DEPLOYED`
- `PRODUCTION_VERIFIED`

## 8. 예외

- 문서·주석·테스트만 변경되고 화면·런타임에 영향이 없으면 Preview를 생략할 수 있다.
- 긴급 장애 복구는 최소 범위 hotfix로 진행할 수 있으나 가능한 한 임시 Preview 또는 로컬 재현 증거를 먼저 확보한다.
- 보안·개인정보·결제·메시지 발송 기능은 공개 Preview에서 운영 데이터를 사용하지 않는다.
- Preview 서비스 장애로 검토가 불가능하면 병합하지 않는다.

## 9. 현재 PR #35 적용

1. 최종 코드 수정
2. 공개 Preview 배포
3. Preview URL 및 exact SHA 보고
4. ChatGPT CTO 직접 검토
5. 사용자 직접 확인
6. 필요 시 수정·재배포
7. `UI_APPROVED` + exact SHA
8. squash merge
9. Production 배포
10. 실제 Production URL 재검증

> **Preview에서 보지 않은 화면은 승인하지 않고, 승인되지 않은 SHA는 병합하거나 Production에 배포하지 않는다.**
