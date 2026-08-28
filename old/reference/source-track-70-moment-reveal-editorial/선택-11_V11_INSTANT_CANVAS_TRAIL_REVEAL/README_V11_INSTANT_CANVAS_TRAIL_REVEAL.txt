[V20_INSTANT_CANVAS_TRAIL_REVEAL]

STATUS: WORKING CANDIDATE
SOURCE OF CORRECTION: 사용자 녹화 2026-08-18 00:32

V19 문제:
1. 마우스/reveal이 실제 포인터보다 느리게 따라옴.
2. 같은 곳을 두 번 지나가야 CLEAN 얼굴이 충분히 보이는 구간 존재.

V20 수정:
- CSS mask dataURL 재인코딩 루프 제거.
- 실제 pointer 좌표를 즉시 사용. easing=0.
- pointerenter 첫 순간부터 CLEAN을 100%로 paint.
- coalesced pointer events를 사용해 빠른 움직임도 연속 paint.
- FACE 한 번 통과용 reveal stamp 확대.
- BODY는 더 세로로 긴 reveal stamp 사용.
- 지나간 CLEAN trail은 남되, 포인터 속도와 분리해서 천천히 복귀.
- 기존 4쌍 8장 / full-bleed / 배경 edge dissolve 유지.

검증:
- Node JS syntax PASS.
