# Track 71 V7 R2.4 — Replay / My Tree route fix

## Product-owner correction
R2.3에서 REPLAY와 MY TREE가 엑박/미표시 되는 문제를 수정했다.

## Root cause
- Track 65/67/68/70은 `03_디자인채택본` 아래에 있어 Track 71 V7에서 `../../` 계열로 접근 가능했다.
- Track 14/15는 그 위치가 아니라 `[26]/[[지피티 작업]]/코덱스/` 아래에 있다.
- R2.3은 두 Track도 `03_디자인채택본`의 형제로 잘못 가정했다.
- Track 14 루트 `최종본.html`은 `assets/...`를 참조하지만 루트에 assets가 없어 자체적으로 broken package다.
- Track 14 `v2` 폴더에는 `assets`와 같은 28,927-byte 실행 HTML(`개발본.html`)이 함께 있다.

## Correct routes from Track 71 V7 folder
Base:
`H:\내 드라이브\[26]\[[지피티 작업]]\[01_러브트리]\03_디자인채택본\71_러브트리_감정경로헬릭스_인터랙티브대문_V1\V7_FINAL_MOTION_INTERACTIVE_ACTIVATION`

REPLAY:
`../../../../코덱스/14_러브트리_로테이팅메모리인덱스_V1/v2/개발본.html`
→ `H:\내 드라이브\[26]\[[지피티 작업]]\코덱스\14_러브트리_로테이팅메모리인덱스_V1\v2\개발본.html`

MY TREE:
`../../../../코덱스/15_러브트리_메모리바이오스피어_인터랙티브대문_V1/버전2/최종본.html`
→ `H:\내 드라이브\[26]\[[지피티 작업]]\코덱스\15_러브트리_메모리바이오스피어_인터랙티브대문_V1\버전2\최종본.html`

## Preserved
R2.3 endless reel, drag/wheel/hold-key motion, typing copy, theme toggle, face-front transition, and all other routes are unchanged.
