# Track 71 V2 — GATE A3 NOTES

## Status
- GATE A1: REJECT
- GATE A2: REJECT / geometry direction PASS
- GATE A3: SUBMITTED FOR STATIC MATERIAL REVIEW
- GATE B/C: NOT STARTED / FORBIDDEN UNTIL A3 APPROVAL
- V1: HOLD / FAILURE COMPARISON ONLY / unchanged

## A2 LOCKS PRESERVED
A3에서 아래는 다시 설계하지 않았다.
- broad annular band / flattened inflated loop geometry
- band thickness / face area
- 6-object X/Z/tilt placement
- MOMENT / MEMORY spacing
- left LoveTree / intro / circular CTA layout

## A3 CHANGES — ONLY THE APPROVED FIVE AREAS

### 1. Clear glass transparency
- broad white/frosted fill을 제거했다.
- glass fragment는 기본적으로 뒤의 background texture를 다시 샘플링한다.
- 흰 배경 위에서는 face 존재감이 낮고, typography 위에서 refraction/edge가 강하게 보이도록 했다.

### 2. Real background refraction
- A2의 CSS duplicate typography proxy를 제거했다.
- 실제 화면에 표시되는 giant typography를 `#bg` canvas에 동일 좌표로 렌더링한다.
- 그 동일 canvas를 WebGL texture `uBg`로 업로드한다.
- glass fragment shader가 screen UV + surface/radial normal 기반 offset으로 `uBg`를 직접 샘플링한다.
- R/G/B 각각 offset을 미세하게 달리해 optical RGB split을 만든다.
- 추가 center pull로 black letterform이 loop 내부에서 확대/압축/위치 이동되도록 했다.

### 3. Dark internal reflection
- full black outline은 사용하지 않았다.
- Fresnel + inner/outer curvature + loop별 local hotspot을 결합해 일부 edge/inner surface만 짙게 잠기도록 했다.

### 4. Local chromatic caustic
- 둘레 전체 RGB outline을 제거했다.
- 각 loop UV의 제한된 2~4개 지점에서만 blue / amber-orange / tiny red optical hotspot을 발생시킨다.

### 5. Keyword surface binding
- FIRST MOMENT / MOMENTS / CONNECTION / REPLAY / MY TREE / RETURN DOM labels를 제거했다.
- 각 keyword를 transparent texture로 생성하고 loop mesh UV에서 샘플링한다.
- mesh perspective/depth/rotation을 동일하게 받으며, front-facing surface에서만 나타나고 specular가 text 위를 다시 통과하도록 합성했다.

## STATIC ONLY CHECK
Source scan:
- requestAnimationFrame: 0
- pointer/mouse interaction listeners: 0
- click viewer: 0
- video: 0
- ESC/key interaction: 0
- light/dark transition: 0
- menu/index expansion: 0

## CAPTURE CONDITION
- Reference: `녹화_2026_08_15_20_58_10_135.mp4` exact 18.0s frame
- Reference size: 1920×1080
- Candidate browser viewport: 1920×1080
- Candidate: actual Chromium browser render
- WebGL2: enabled
- Renderer environment: SwiftShader software WebGL; performance is NOT evaluated in Gate A3
- Comparison PNG: exact-size left/right concatenation only; no retouch/filter/post-processing

## REVIEW QUESTION
A3의 판정 대상은 기능이 아니라 다음 5개뿐이다.
1. clear transparent glass read
2. real background typography refraction
3. dark optical depth
4. local chromatic caustic
5. keyword surface binding

A3 승인 전 GATE B/C로 진행하지 않는다.
