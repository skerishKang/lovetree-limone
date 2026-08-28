# 설계팀장9기 — Track 72 A3.5 PASS / GATE B 재승인 및 First-View Asset Lock 유지지시

**작성일:** 2026-08-17  
**작성자:** 설계팀장 9기  
**수신:** LoveTree 디자인팀장  
**Track:** `72_러브트리_에디토리얼모먼트아카이브_디스커버리월_V1`  
**판정:** `A3 STRUCTURE = PASS / A3.5 PRODUCT-OWNER ASSET LOCK = PASS`  
**다음 단계:** `GATE B = AUTHORIZED`  
**GATE C:** HOLD  
**선행 MASTER:** `MASTER_설계팀장9기_72_A3.5_제품오너지정_정밀자산큐레이션_LOCK_2026-08-17.md`

---

# 0. 판정

A3.5는 PASS한다.

이번에는 자산을 먼저 LOCK한 뒤,
LOCK Board와 실제 화면을 동일 자산으로 구성했다.

따라서 더 이상 자산 큐레이션 때문에 Gate A를 반복하지 않는다.

---

# 1. 첫 Viewport 12 Asset — LOCK

Desktop first viewport의 아래 12개 자산은 GATE B에서도 유지한다.

1. Track 65 `FIRST CLUE` saturated video frame
2. `sphere-final.png`
3. `04_lovetree-sculpture.png`
4. `ride-side.png`
5. `신규조각상_06_마이크퍼포먼스_블랙실버.png`
6. `lubt-bloom.png`
7. Track 52 dark network video frame
8. `07_키프레임_시즌개화.png`
9. `H_000.png`
10. `crystal-awake-02.png`
11. Track 59 Memory Sketchbook light/pink frame
12. DOM Connection text

임의 교체 금지.

---

# 2. 허용되는 변경

GATE B 기능 구현 과정에서 다음만 허용한다.

- crop 5~15% 미세 조정
- object scale 미세 조정
- responsive에 따른 tile span 조정
- video currentTime 미세 조정
- typography size/spacing 미세 조정
- layout stability를 위한 technical wrapper 추가

---

# 3. 금지되는 변경

- 다른 얼굴로 교체
- 다른 자동차로 교체
- LoveBot 삭제
- LoveTree sculpture 삭제
- 블랙실버 남성 삭제
- floral slot 삭제
- `H_000.png` 임의 교체
- crystal 임의 교체
- 새 이미지 생성
- first viewport 콘셉트 재해석

변경이 불가피하면 제품오너/설계팀 승인 전 실행하지 않는다.

---

# 4. 한국어 Typography LOCK

한국어 명조/Serif 금지 계속 유지.

허용:

- Pretendard
- Noto Sans KR
- SUIT
- Apple SD Gothic Neo
- Malgun Gothic
- sans-serif

---

# 5. GATE B 구현 범위

GATE B에서는 다음만 구현한다.

## 5-1. Archive 확장
- 36 Moment 전체
- vertical scroll
- deterministic masonry order

## 5-2. Filter
최소:
- All
- Video
- Photo / Scene
- Object
- Memo
- Connection

실제 동작.

## 5-3. Responsive
- Desktop: 4 columns
- Small desktop / landscape tablet: 3 columns
- Tablet / mobile: 2 columns

## 5-4. Stability
- lazy loading
- layout jump 최소화
- scroll position preservation
- filter → All 복귀 시 이전 위치 복원
- horizontal overflow 0

## 5-5. Accessibility
- 실제 button
- keyboard focus visible
- aria-label
- reduced-motion 대응

---

# 6. GATE B에서 아직 금지

- hover autoplay
- hover video preview
- click detail viewer
- full video viewer
- exact timestamp playback
- previous/next Connection detail
- ESC viewer return
- fancy 3D transition
- advanced motion

위 기능은 GATE C.

---

# 7. GATE B 제출물

필수:

1. `72_V1_GATE_B.html`
2. `72_V1_GATE_B_DESKTOP_SCROLL.mp4`
3. `72_V1_GATE_B_FILTER.mp4`
4. `72_V1_GATE_B_MOBILE.mp4`
5. `72_V1_GATE_B_QA.md`
6. `72_V1_GATE_B_FIRST_VIEW_LOCK_CHECK.md`

---

# 8. FIRST_VIEW_LOCK_CHECK 필수 항목

`72_V1_GATE_B_FIRST_VIEW_LOCK_CHECK.md`에 반드시 기록:

- SLOT 01~12 실제 filename
- A3.5와 동일 여부
- crop/scale 변경 여부
- video frame 변경 여부
- asset replacement 여부
- 변경이 있다면 승인자와 근거

승인 없는 asset replacement가 1건이라도 있으면 FAIL.

---

# 9. GATE B PASS 기준

- A3.5 first-view visual 유지
- 36 Moment 전체 scroll 가능
- filter 실제 동작
- native ratio 유지
- Desktop/Tablet/Mobile 자연스러운 masonry
- layout jump 눈에 띄지 않음
- scroll restoration 작동
- horizontal overflow 0
- 한국어 serif 0건
- first viewport 12 asset lock 유지

---

# 10. 현재 상태

```text
A3 STRUCTURE = PASS
A3.5 PRODUCT-OWNER ASSET LOCK = PASS

GATE B = AUTHORIZED
GATE C = HOLD
```

이제 자산 선정은 다시 열지 않는다.

GATE B는 A3.5의 세련된 첫 화면을 그대로 유지하면서
**실제로 사용할 수 있는 Archive로 만드는 기능 단계**에만 집중한다.
