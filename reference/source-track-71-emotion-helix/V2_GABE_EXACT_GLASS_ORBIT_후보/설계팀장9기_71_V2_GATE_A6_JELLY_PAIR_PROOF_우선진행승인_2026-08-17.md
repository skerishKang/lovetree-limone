# 설계팀장9기 — Track 71 V2 GATE A6 JELLY_PAIR_PROOF 우선 진행승인 및 실행지시

**작성일:** 2026-08-17  
**작성자:** 설계팀장 9기  
**수신:** LoveTree 디자인팀장  
**Track:** `71_러브트리_감정경로헬릭스_인터랙티브대문_V1`  
**현재 상태:** `GATE A5 = REJECT / GATE A6 = IN PROGRESS`  
**선행 MASTER:** `설계팀장9기_71_V2_GATE_A5_REJECT_A6_CLEAR_JELLY_DISC_IRREGULAR_OVERLAP_2026-08-17.md`  
**이 문서 성격:** A6 실행 승인 / Pair Proof 우선순위 재확인  
**GATE B/C:** 금지

---

# 0. 진행 승인

최신 A6 MASTER에 대한 디자인팀장의 이해를 승인한다.

현재 허용되는 작업은 다음뿐이다.

- `JELLY_PAIR_PROOF` 제작
- Pair Proof 자체 검수
- Pair Proof가 기준을 충족할 경우에만 전체 A6 정지 비교본 제작

아직 금지:

- GATE B
- GATE C
- idle motion
- parallax
- video under jelly
- click viewer
- light/dark transition
- menu/index
- advanced motion

---

# 1. A6의 절대 목표

이번 A6는 기능 추가가 아니다.

오직 다음 시각 목표만 검증한다.

> **투명한 젤리/유리 렌즈가 뒤의 giant typography를 실제로 휘게 만들며 존재하는가.**

실패 인상:

> 흰 반투명 타원 오브젝트

통과 후보 인상:

> 투명한 Jelly Lens / Glass Blob가 뒤 글자를 굴절시킨다

---

# 2. Body Material

중앙 body는 거의 무색·투명해야 한다.

- white fill 금지
- broad white body 금지
- center에서 background typography가 계속 보여야 함
- center에서도 mild refraction 존재
- edge에서 refraction / highlight / dark reflection / caustic 강화

`SOLID`는 중앙에 hole이 없다는 뜻이지,
흰색으로 채운다는 뜻이 아니다.

---

# 3. 6개 오브젝트 개별성

전체 화면으로 확장할 경우 6개는 각각 달라야 한다.

- shape
- width / height
- bulge
- rotation
- overlap
- depth order
- refraction character

동일 가로 타원 복제 금지.

---

# 4. JELLY_PAIR_PROOF 우선

전체 화면보다 먼저 아래 파일을 만든다.

`71_V2_GATE_A6_JELLY_PAIR_PROOF.png`

구성:

```text
REF 01 | CANDIDATE J1
REF 02 | CANDIDATE J2
REF 03 | CANDIDATE J3
```

조건:

- 각 Pair는 동일 bounding box
- 동일 scale 비교
- 유리하게 crop/확대하지 않음
- 별도 후처리 금지
- 실제 browser render 기준

---

# 5. Pair별 검수 항목

각 Pair에서 아래 8개를 확인한다.

1. silhouette
2. tilt
3. body transparency
4. visible background typography
5. center refraction
6. edge optical power
7. dark local reflection
8. local chromatic caustic

---

# 6. Pair Proof에서 즉시 FAIL

다음 중 하나라도 해당하면 전체 화면으로 넘어가지 않는다.

- 흰 캡슐처럼 보임
- 중앙 background type가 거의 안 보임
- center가 단순 transparent window처럼만 보임
- J1/J2/J3가 같은 타원 복제처럼 보임
- 모든 object가 거의 수평
- perimeter 전체에 white/rainbow outline
- edge optical effect가 장식처럼 보임

---

# 7. Pair Proof 통과 후보 조건

아래를 충족할 때만 전체 A6 화면으로 확장한다.

- 중앙 white fill 느낌 제거
- 3개 모두 solid transparent lens로 보임
- reference와 같은 object family로 인식됨
- 뒤 타이포가 렌즈 내부 전체에서 충분히 살아 있음
- center에서도 실제 굴절이 체감됨
- edge는 center보다 더 강한 optical power
- capsule 느낌이 사라짐

---

# 8. 전체 화면 확장 시

Pair Proof 통과 후 6개로 확장한다.

필수:

- 일부 overlap
- 일부 crop
- diagonal lens 포함
- round lens 포함
- wide squashed lens 포함
- small irregular blob 포함
- partial off-screen lens 포함

6개를 규칙적인 세로 적층으로 배치하지 않는다.

---

# 9. 전체 제출 순서

1. `71_V2_GATE_A6_JELLY_PAIR_PROOF.png`
2. Pair Proof 충족 후:
   - `71_V2_GATE_A6_REFERENCE_COMPARISON.png`
   - `71_V2_GATE_A6.html`
   - `71_V2_GATE_A6_NOTES.md`

---

# 10. Gate 상태

```text
GATE A1 = REJECT
GATE A2 = REJECT
GATE A3 = REJECT
GATE A4 = REJECT
GATE A5 = REJECT

GATE A6 = IN PROGRESS
GATE B = HOLD
GATE C = HOLD
```

---

# 11. 최종 지시

이번에는 Jelly Lens를 “그리는 것”보다
**배경을 굴절시켜 존재하게 만드는 것**이 우선이다.

> 거의 안 보이는 투명 몸체 + 내부에서 휘는 검정 타이포 + 일부 edge에서만 강한 광학효과

이 조합이 Reference와 맞아야 한다.

Pair Proof가 맞지 않으면 전체 화면으로 넘어가지 않는다.
