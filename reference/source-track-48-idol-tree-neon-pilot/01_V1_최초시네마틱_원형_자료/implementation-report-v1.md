# LoveTree 48 · NEON PILOT · Cinematic Hero v1 구현 보고

## 1. 결과

주 산출물: `lovetree-48-neon-pilot-cinematic-hero-v1.html`

최신 19번 지시에 따라 **추가 아이돌 사진 생성보다 HTML을 먼저 완성**했다. 이번 v1은 기존 승인 자산을 유지하면서 참고영상의 약 45초 Motion Storyboard를 웹 레이어로 재구성한 Cinematic Hero / Background Prototype이다.

### 사용한 승인 계열 자산

- A–E 정면 Cardinal 5장
- A Cardinal `000 / 090 / 180 / 270` 4장
- 기존 `01_HUD_component_v1.svg`
- 참고영상 원본·1초 Contact Sheet·재분석 문서

신규 아이돌 이미지 생성: **0장**

## 2. 구현 구조

- `100vw × 100dvh`
- **45.395초 time-based scene engine**
- 페이지 로드 직후 muted autoplay
- DOM/SVG HUD
- 승인 PNG의 실시간 face / eye / costume crop
- circular lens / fisheye panel
- CSS false-color Thermal
- White Character Exhibition
- procedural neon city
- procedural SVG 3-ship flight
- CSS earth / sky / cloud / route
- 반복 CSS Cockpit POV
- 승인 얼굴 crop 기반 visor overlay
- Group Return
- Electric Lime End Card

## 3. 참고영상 전환 문법

구현 완료:

- Black → White = **White Iris**
- Member/analysis rapid change = **Lime Scan Wipe**
- Face → Eye = **Same-center Match Cut**
- Vehicle → Cockpit = **HUD Ring Push 계열**
- Group Return → End Card = **Lime Full-frame Flash**

Lime wipe는 화면 전체를 긴 시간 덮지 않도록 좁은 이동 blade로 축소하여 원본의 빠른 scan 감각을 유지했다.

## 4. 최종 타임라인 정렬

1초 Contact Sheet와 다시 대조하여 중간부를 재조정했다.

```text
00–01  5인 Group Hook
02–03  White Analysis / Exhibition
04     Thermal
05     White Snap
06–07  Member Scan
08     Face
09     Member Lock
10     Eye
11     Costume Detail
12     Vector Tunnel
13     Eye Reflection
14     Route City
15     Dual Lens
16     Lock Out
17     Pilot Signal
18–19  Formation Flight
20     Cockpit A
21     Red Route
22     Violet Route
23–24  Cockpit B
25     Blue Route
26–29  Repeated Cockpit / Pilot POV
30     Green Route
31     Cockpit HUD
32–33  Group Return
34     Blue Hold
35–45  Lime End Card
```

## 5. LoveTree 의미 치환

화면 형식은 가능한 한 참고영상 쪽을 유지하고 의미만 짧은 HUD label로 바꿨다.

- Scan → `MOMENT SCAN`
- Pilot dossier → `MEMBER DOSSIER`
- Mission Route → `MOMENT ROUTE`
- target → `NEXT SIGNAL`
- Squadron return → `GROUP TREE RETURN`
- End brand → `LOVETREE / FOLLOW THE MOMENT`

전투력·팬심 점수·생체 수치 같은 허위 지표는 사용하지 않았다.

## 6. 사용자 조작 및 접근성

- AUTO PLAY: 구현
- PLAY / PAUSE: 구현
- MUTE / SOUND: 구현, 기본 `Muted`
- RESTART: 구현
- 사운드: 원본 음원 미사용. 사용자 클릭 후 자체 WebAudio low drone만 활성화
- `prefers-reduced-motion`: 해당 사용자 설정에서는 자동정지 후 수동 재생 가능
- 데스크톱·390×844 모바일 런타임 검증 완료

## 7. 런타임 검증

- Desktop 1440×900: 로드 PASS / console error 0
- Mobile 390×844: 로드 PASS / console error 0
- 재생 길이: 45.395초
- Play/Pause: PASS
- Muted/Sound On 전환: PASS
- Restart: PASS
- 1초 `REFERENCE | RESULT` Contact Sheet 생성 완료

`desktop-execution-v1.mp4`, `mobile-execution-v1.mp4`는 실제 브라우저 타임라인을 **4fps로 샘플링한 뒤 24fps MP4로 패키징한 실행 증거**다. 따라서 네이티브 24fps 화면녹화가 아니라 기능·레이아웃·장면 순서 검증용 증거다.

## 8. 현재 판단

### 사실

- 핵심 장면 순서와 약 45초 구조는 구현됐다.
- Black/White/Lime 구조, Member Scan, Face/Eye, White Exhibition, Flight, Cockpit, Group Return, End Card가 모두 실제 HTML에서 재생된다.
- 원본 MP4와 원본 음원은 HTML에 삽입하지 않았다.

### 분석

1초 비교판 기준으로 **시간 구조와 장면 유형은 v1 목적에 맞게 정렬**됐지만, Flight/Cockpit은 procedural geometry이므로 참고영상의 사진/렌더 수준 질감과는 차이가 남는다. Thermal과 Route City도 원본의 실제 촬영·VFX 질감보다 추상적이다.

### 제안 — 아직 승인되지 않음

제품 오너가 HTML을 직접 본 뒤 특정 장면이 약하다고 판단할 경우에만 다음을 최소 추가한다.

- Cockpit 실사감 부족 → `clean cockpit plate` 1장
- Flight 실사감 부족 → `clean vehicle/flight plate` 1장
- Group Hook 약함 → `5인 clean group hero` 1장
- White Exhibition만 끊김 → 필요한 Intermediate angle만 선택 생성

## 9. 비범위 / 변경 없음

- Production 반영 없음
- 기존 승인 파일 덮어쓰기 없음
- B~E Intermediate 신규 생성 없음
- 새 얼굴 캐스팅 없음
- 원본 참고영상 MP4 삽입 없음
- 원본 음원 사용 없음

## 10. Gate 상태

**HTML V1 COMPLETE / PRODUCT OWNER REVIEW REQUIRED**

디자인팀 자체 판단으로 최종 PASS를 확정하지 않는다. 다음 결정은 제품 오너가 실제 HTML과 비교 Contact Sheet를 본 뒤 내린다.
