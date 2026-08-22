# LOVETREE · NEON HUMAN ANALYSIS PROMO GATE v1
## Implementation Note

## 작업 성격
- 기존 V4.2 / V4.2b overwrite 없음.
- 신규 병행 홍보 대문 HTML.
- Production 반영 없음.
- 기존 Neon Pilot 45초 시퀀스를 그대로 나열하지 않고 랜딩 구조로 재구성.

## 구현 기준
- V1 초기안의 neon-lime / scan / lens / route / logo burst 감성 참고.
- V4의 Biometric / Instrument / Dossier / White Profile / Face-Eye / Thermal / Connection 계열 시각 밀도 참고.
- 실제 인물 복제 없이 기존 프로젝트의 synthetic Core 5 자산만 사용.
- random cast 신규 난입 없음.
- aircraft asset 사용 0개.

## 기술 구조
- 단일 self-contained HTML.
- 외부 이미지 URL 없음.
- 핵심 synthetic cast 이미지는 HTML 내부 data URI로 내장.
- CSS + SVG + vanilla JS.
- 별도 프레임워크/네트워크 요청 없음.

## 주요 인터랙션
1. Hero pointer parallax
2. Hero lens / orbit hover response
3. Analysis scroll phase:
   - biometric/radar
   - white exhibition
   - face/eye lens
4. Dossier hover lift/glow
5. Connection node hover
6. Moment Saved CTA pulse
7. fixed scroll progress

## Desktop 검증
Viewport: 1440×900

- JS page errors: 0
- JS console errors: 0
- broken images: 0
- embedded image count: 19
- visible `48`: NO
- external aircraft showcase: 없음

## 실행영상
`desktop-execution-neon-human-analysis-v1.mp4`

- 24초 interactive landing walkthrough
- Chromium 1440×900
- 2fps deterministic visual sampling
- 24fps H.264 container encoding
- native 24fps realtime screen recording으로 주장하지 않음
- hero / analysis / thermal / connection / saved 순서 전체를 스크롤하며 검수 가능

## Contact Sheet
`desktop-contactsheet-neon-human-analysis-v1.jpg`

9개 검수 프레임:
1. Hero
2. Biometric/Radar
3. White Exhibition
4. Face/Eye Lens
5. Thermal City
6. Moment Connection
7. Moment Flow
8. Moment Saved
9. LOVETREE Close

## 현재 판정
`PROMO GATE v1 VISUAL REVIEW CANDIDATE`

제품 오너 승인 전:
- 기존 대문 채택본 대체 금지
- Production 반영 금지
- 공식 첫여정 기본 UI로 확정 금지
