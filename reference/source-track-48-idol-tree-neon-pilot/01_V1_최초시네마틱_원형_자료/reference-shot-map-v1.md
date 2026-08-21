# LoveTree 48 · NEON PILOT · Reference Shot Map v1

- 기준 참고영상: `01_참고영상_원본_네온파일럿.mp4`
- 실측: **640×360 / 24fps / 45.395초**
- 보조 기준: `03_참고영상_ContactSheet_1s.jpg`, `02_참고영상_재분석_v1.md`
- 구현물: `lovetree-48-neon-pilot-cinematic-hero-v1.html`
- 원본 프레임·원본 음원은 제품 HTML 자산으로 사용하지 않음

> 시간 범위는 1초 Contact Sheet와 장면 검출점을 함께 보고 HTML의 재생 단위로 정렬한 것이다. 시각 형식은 참고영상의 Motion Storyboard를 우선하고, LoveTree 치환은 HUD의 의미에 한정했다.

| REFERENCE TIME | REFERENCE SHOT | LOVETREE REPLACEMENT | TRANSITION | IMPLEMENTATION METHOD |
|---|---|---|---|---|
| 0.00–1.54 | Electric Lime / dark-lime 5인 팀 훅 | 승인 A–E 5인 `GROUP TREE` | Hard cut + lime exposure | 승인 정면 PNG 5장 레이어, reflective grid, technical beam |
| 1.54–3.90 | 흰 분석실의 전신 스캔·전시 | `WHITE CHARACTER EXHIBITION` | **White Iris** | A 000/090/180/270 Cardinal hard-frame sequence |
| 3.90–4.85 | Thermal circular scan | `THERMAL / MOMENT 01` | Same-center cut | A 정면 crop + grayscale/contrast + false-color circular overlay |
| 4.85–5.90 | White subject snap | White Cardinal snap | **White Iris** | A Cardinal 재사용, white/cool-gray exhibition |
| 5.90–7.90 | Green analysis / data split / equipment HUD | `MOMENT SCAN / MEMBER DOSSIER` | **Lime Scan Wipe** | A–E 승인 정면을 빠르게 교체, 기존 HUD SVG, scanline |
| 7.90–8.90 | 얼굴 extreme close | `FACE MATCH` | **Same-center Match Cut** | 승인 A 정면에서 face crop, 중앙 ring 좌표 고정 |
| 8.90–9.90 | full-body analysis return | `MEMBER LOCK` | Lime Scan Wipe | 승인 C 계열 정면 + DOM HUD |
| 9.90–10.90 | 눈 extreme close | `EYE MATCH` | Same-center Match Cut | 같은 정면 원본의 eye crop, 10.2× 확대 |
| 10.90–11.90 | 소품/의상 close detail | `COSTUME DETAIL / CONNECTION` | Hard match | 같은 PNG의 torso/belt detail crop |
| 11.90–12.90 | Green vector tunnel | `VECTOR TUNNEL` | Lime Scan Wipe | CSS concentric rings + scanline + perspective motion |
| 12.90–13.90 | Eye reflection / circular sensor | `EYE REFLECTION` | Same-center lens | A eye crop + circular sensor HUD |
| 13.90–14.90 | Neon aerial city / route acquisition | `ROUTE CITY` | Hard cut | CSS perspective city grid + cyan/red/yellow/lime procedural lights |
| 14.90–15.90 | dual circular face/HUD | `DUAL LENS / NEXT SIGNAL` | Same-center Match Cut | central face ring + secondary fisheye lenses |
| 15.90–16.90 | lockout/fullbody analysis | `LOCK OUT` | Lime Scan Wipe | approved member fullbody + dossier panel |
| 16.90–17.90 | helmet/face close | `PILOT SIGNAL` | HUD ring prep | approved face crop inside analysis ring |
| 17.90–19.90 | high-altitude / formation jets | `FORMATION ASCENT` | Hard cut | procedural SVG 3-ship formation + CSS earth/cloud/route |
| 19.90–20.90 | red pilot/cockpit close | `COCKPIT A` | **HUD Ring Push** | CSS cockpit frame + approved member face crop inside visor + red accent |
| 20.90–21.90 | red jet | `ROUTE A` | Ring release | same procedural craft + red route accent |
| 21.90–22.90 | violet jet/cloud | `ROUTE B` | Hard cut | same procedural craft + violet accent |
| 22.90–24.90 | cockpit / pilot POV | `COCKPIT B` | HUD Ring Push | CSS cockpit frame, route HUD, conditional pilot visor |
| 24.90–25.90 | blue jet | `ROUTE C` | Hard cut | procedural craft + blue accent |
| 25.90–27.90 | blue helmet / pilot close | `COCKPIT C` | HUD Ring Push | cockpit + approved face crop + blue visor accent |
| 27.90–29.90 | green cockpit / repeated POV | `COCKPIT D` | HUD Ring Push | repeated cockpit geometry + green route color |
| 29.90–30.90 | green vehicle | `ROUTE D` | Hard cut | procedural craft + green accent |
| 30.90–31.90 | cockpit HUD close | `COCKPIT E / NEXT SIGNAL` | HUD Ring Push | central radar / route / circular HUD |
| 31.90–33.90 | 5인 group return / trails | `GROUP TREE RETURN` | Hard cut | 승인 A–E 정면 5장 재조합 + lime grid |
| 33.90–34.90 | blue hold | `RETURN HOLD` | short hold | deep blue procedural field |
| 34.90–45.395 | Electric Lime brand/end sequence | `LOVETREE / FOLLOW THE MOMENT` | **Lime Full-frame Flash** → hold → loop | lime end card + geometric streaks + 45.395초 seamless restart |

## 구현상 의도적 한계

v1은 **현재 승인 자산으로 HTML을 먼저 본다**는 최신 지시에 따라 Flight/Cockpit의 실사 plate를 새로 생성하지 않았다. 따라서 장면 순서·색·HUD·카메라 리듬은 맞췄지만, 원본의 실제 기체·헬멧·콕핏 사진 수준의 질감 충실도는 이후 제품 오너 화면 검토 후 필요한 plate만 추가하는 보완 대상으로 남는다.
