# LoveTree Product Document Hierarchy

## 1. Canonical product authority

### `LOVETREE_PRODUCT_SPEC.md`

LoveTree 제품 헌법이다.

다음을 규정한다.

- 제품의 한 문장 정의
- Moment와 Connection의 의미
- 감정의 인과관계
- 팬 전환과 파생 트리
- 입력·공개·휴식·회고 원칙
- 장기 데이터 모델
- 커뮤니티·기획사·수익화 방향
- 제품 단계와 금지사항

제품 동작의 본질이 바뀌는 경우 코드보다 먼저 이 문서를 갱신한다.

## 2. Version-specific implementation contracts

V1, V2, V3의 승인된 범위와 현재 단계에서 실제로 구현할 내용을 규정한다.

장기 제품 아이디어 전체를 한 PR에서 구현하라는 의미가 아니다.

## 3. Supporting analyses

### `../v3/V3_HTML_TSX_INTEGRATION_ANALYSIS.md`

16개 HTML과 현재 TSX의 역할, 기능, 화면 배치와 데이터 차이를 분석한 참고문서다.

이 문서는 다음을 제공한다.

- 각 HTML의 제품상 역할
- 공식 사용자 여정 후보
- 기능 비교
- 충돌 결정 근거
- 데이터 모델 보강안
- 구현 단계 제안

분석문 자체는 실행계약이 아니다.

## 4. Authority order

문서가 충돌하면 다음 순서로 판단한다.

1. `LOVETREE_PRODUCT_SPEC.md`
2. 별도로 승인된 제품 결정
3. 버전별 구현 계약
4. 개별 Issue·PR 실행계약
5. Supporting analysis
6. 독립 HTML prototype

단, 더 최신의 명시적인 승인 결정이 기존 원전을 변경한 경우
먼저 원전과 계층 문서를 함께 갱신해야 한다.

## 5. Current multi-version strategy

현재는 V1, V2, V3를 즉시 하나로 합치지 않는다.

- V1: 기존 기능·제품 기준선
- V2: Limone 디자인과 공유 core가 연결된 기능 후보
- V3: 16개 HTML의 역할을 통합하는 별도 제품 후보

각 버전은 별도 경로와 승인된 배포 대상에서 검증한다.
canonical 경로 통합은 별도 제품 결정으로 수행한다.
