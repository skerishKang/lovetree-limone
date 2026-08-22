# LoveTree Adapted Prompt — Track 74 Orbit Morph Template Portal

Build a **single-file** `index.html` full-viewport LoveTree poster and template portal. No scroll. No frameworks. Preserve the supplied Orbit poster’s layout, geometry, image placement, entrance choreography, mobile behavior, and organic mouse morph-reveal. Do not redesign the benchmark. Adapt only the brand wording, product copy, accessible labels, primary menu behavior, and destination links for LoveTree.

This is a new candidate named:

- Track: `74`
- Title: `74_오빗모프_러브트리_템플릿포털_V1`
- Output: one standalone `index.html`
- Placement: directly inside `03_디자인채택본/74_오빗모프_러브트리_템플릿포털_V1/`

The output is a candidate, not an approved replacement for Track 73.

---

## 0. Product meaning to preserve

Use these LoveTree principles in wording only. Do not add new screens or policy:

- The basic unit is a **Moment where the heart moved**, not generic content.
- A **Connection** is the emotional causality that triggers the next discovery.
- Saving a Moment must feel immediate; organization can happen later.
- A tree is a replayable emotional path, not a storage list.
- Another person can follow one person’s path and become a new fan or user.
- Keep fan-created emotional paths distinct from official agency or brand paths.
- Protect privacy and user control.

Visual adaptation should express “a Moment becomes a path” without replacing the supplied lily imagery.

---

## 1. Document shell

```html
<!doctype html>
<html lang="ko" class="anim">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#161616">
  <title>LoveTree — Moments become paths</title>
```

- `<html>` starts with `class="anim"`.
- `html, body`: full viewport, no margin, `overflow:hidden`, background `#161616`.
- Body font family name remains `"Orbit Sans", Arial, Helvetica, sans-serif`.
- Wordmark family name remains `"Orbit Display", "Times New Roman", Times, serif`.
- Preserve variables exactly:
  - `--ink:#ffffff`
  - `--surface:#161616`
  - `--orb-reveal:cubic-bezier(.16,1,.3,1)`
  - `--orb-soft:cubic-bezier(.25,.8,.28,1)`

Structure remains:

```
main.viewport
  section.stage
    brand mark
    click-pinned desktop template navigation
    first-Moment pill
    LOVETREE wordmark
    two-layer lily morph stack
    left and right LoveTree corner copy
    mobile burger/scrim/sheet
```

Z-order remains wordmark `1` → flower `2` → corner copy `3` → brand/nav/pill `4`; mobile scrim `9`, sheet `10`, burger `12`.

---

## 2. Fonts

Use the original Orbit base64 TTF data if an authoritative existing Orbit `index.html` is available:

1. `"Orbit Sans"` — navigation, pill, corner copy
2. `"Orbit Display"` — giant wordmark only

Both weight 400 and `font-display:block`.

Do not fabricate font bytes. If the original TTF data is unavailable, keep the requested family names and fall back explicitly to:

- `Orbit Sans` → Arial, Helvetica, sans-serif
- `Orbit Display` → Times New Roman, Times, serif

Record this limitation in QA. Do not use Inter, Roboto, system-ui, or Playfair.

---

## 3. Images — preserve exactly

Use no images other than these two supplied transparent pixel-art/halftone lilies.

### FRONT / default lily

```
https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260808_192942_e1086505-d7da-433b-a59b-8220f4e6c808.png&w=1280&q=85
```

Front `alt`: `Pixel-art pink and violet lily`.

### REVEAL / trail-only lily

```
https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260808_151324_bf318a5f-5525-4fc7-aab5-e9a341018828.png&w=1280&q=85
```

Reveal `alt=""` and `aria-hidden="true"`.

Do not replace, regenerate, recolor, or add images.

---

## 4. Desktop on-stage elements

### 4.1 Brand mark

Preserve the white four-stroke asterisk SVG and exact geometry:

- `viewBox="0 0 66 62"`
- stroke width `5px`, square caps
- lines `(33,1)→(33,61)`, `(3,31)→(63,31)`, `(11.8,9.8)→(54.2,52.2)`, `(54.2,9.8)→(11.8,52.2)`
- exact Orbit position and clamp width
- accessible label: `LoveTree connection mark`

### 4.2 Primary navigation — Track 73 click-pinned behavior

Replace Home / Resources / Benefits / Contact with four LoveTree template groups:

1. `둘러보기`
2. `내 러브트리`
3. `이야기`
4. `가이드`

Preserve the original four navigation anchor positions and optical `scaleX` values:

| Group | left | scaleX |
|---|---:|---:|
| 둘러보기 | `10.104167vw` | `1.165` |
| 내 러브트리 | `17.526042vw` | `1.052` |
| 이야기 | `27.578125vw` | `1.126` |
| 가이드 | `36.171875vw` | `1.168` |

The navigation must not depend on hover. Implement Track 73’s pinned desktop menu behavior:

- Clicking a group opens and pins its dropdown.
- Moving the pointer into the dropdown does not close it.
- Clicking the same group again closes it.
- Clicking a different group switches the open dropdown.
- Clicking outside closes it.
- Escape closes it.
- Selecting a real destination closes it and opens the destination in a new tab.
- Use `target="_blank" rel="noopener"` for every template route.
- Parent `.primary-nav` may remain `pointer-events:none`; the interactive group buttons and dropdowns opt back in.

Because Track 74’s `index.html` sits directly under the Track 74 root, use these exact relative routes:

#### 둘러보기

- `62 · 기억조각상 원형 레일`  
  `../62_기억조각상_원형레일전시/62_기억조각상_원형레일전시.html`
- `12-1 · 리빙 미디어 스피어 I`  
  `../../../코덱스/12-1_러브트리_리빙미디어스피어_인터랙티브대문_V1/최종본.html`

#### 내 러브트리

- `35 · LP 모먼트 플레이어`  
  `../35_LP플레이어/01_LP플레이어_영상기억.html`
- `39 · LP 커버플로우 갤러리`  
  `../39_LP커버플로우_미디어갤러리/01_LP커버플로우_영상갤러리.html`
- `58 · 리빙 메모리 핀보드`  
  `../58_리빙메모리_핀보드_시네마틱/★_최종_58_리빙메모리_핀보드.html`
- `14 · 로테이팅 메모리 인덱스`  
  `../../../코덱스/14_러브트리_로테이팅메모리인덱스_V1/v2/개발본.html`

#### 이야기

- `43 · 기억 장면 레시피`  
  `../43_기억장면_레시피도구/01_기억장면_레시피도구.html`
- `70 · 모먼트 리빌 퓨처 에디토리얼`  
  `../70_모먼트리빌_퓨처에디토리얼/선택-70_V2.1_LOVETREE_PORTAL_NAV_RETURN_FIX.html`

#### 가이드

- `15 · 메모리 바이오스피어`  
  `../../../코덱스/15_러브트리_메모리바이오스피어_인터랙티브대문_V1/버전2/최종본.html`
- `64 · 첫 순간 심기`  
  `../64_부유모먼트_웰컴오빗_입장포털O/현재후보.html`

Do not include the removed or failed candidates: Living Media Sphere II, 84 Moments, Liquid Glass Video Wall, or Global Shell Rolling Menu.

### 4.3 Pill

Preserve the original white pill geometry and position, but replace `Secure system` with:

`첫 순간 심기`

The pill opens Track 64 in a new tab using the exact Track 74-relative route above.

### 4.4 Giant wordmark

Replace ORBIT with LOVETREE while preserving the benchmark’s large single-line composition and reveal mask approach.

Use semantic structure equivalent to:

```html
<h1 class="orbit-word" id="orbit-title" aria-label="LoveTree">
  <span class="orbit-word__mask">
    <span class="orbit-word__inner">
      <span class="orbit-word__white">LOVE</span><span class="orbit-word__pink">TREE</span>
    </span>
  </span>
</h1>
```

- `LOVE`: solid white
- `TREE`: `linear-gradient(180deg,#ffc5dc 0%,#fd86db 100%)`
- Preserve the original top/left intent, responsive centering, serif display family, entrance mask, and overlap with the lily.
- Reduce font size only as necessary to fit `LOVETREE` in the same no-scroll viewport. Do not split it into multiple lines on desktop.

### 4.5 Flower stack

Preserve the original flower-stack markup, position, height, intrinsic-width sizer, and `translateX(-50%)`. The lily remains pointer-transparent. The top layer begins fully masked out.

### 4.6 Corner copy

Preserve original size, bottom offset, left positions, and optical scale parents. Animate only inner elements.

Replace the original business copy with:

Left:

```
A moment moves the heart.
The next path begins.
```

Right:

```
Your path becomes
someone else’s beginning.
```

Korean alternative is allowed only if it fits without altering the benchmark geometry:

Left: `마음이 움직인 순간. / 다음 경로가 시작됩니다.`  
Right: `당신의 경로가 / 누군가의 시작이 됩니다.`

Use one language consistently in the final HTML.

---

## 5. Organic mouse morph reveal — preserve exactly

This is not a CSS circle spotlight. Implement the canvas-generated organic trail using exactly these constants:

```js
TRAIL_MAX_POINTS  = 60
TRAIL_HEAD_R      = 140
TRAIL_NOISE_AMP   = 44
TRAIL_BLOB_PTS    = 24
TRAIL_FADE_SPEED  = 0.92
TRAIL_SAMPLE_DIST = 8
```

Use two synchronized `MorphTrailLayer` instances:

- FRONT layer: full white canvas, then `destination-out` blobs punch transparent holes.
- REVEAL layer: clear canvas, then white blobs show only the second lily.

Attach `mousemove`, `mouseenter`, and `mouseleave` to `.stage`. Convert stage pointer coordinates into flower canvas space from `getBoundingClientRect()`.

Per-frame logic:

```js
targetR = hovering ? 140 : 0
headRadius += (targetR - headRadius) * (hovering ? 0.14 : 0.04)
```

When hovering and `headRadius > 5`, sample only after movement greater than 8px. Push `{x,y,r:headRadius,alpha:1,seed:Math.random()*100}` and cap at 60. Each frame:

```js
alpha *= 0.92
r *= 0.995
```

Remove points under alpha `0.01`; increment `time` by `0.016`.

`drawMorphBlob()` must use 24 noisy points and the original three trigonometric noise terms, midpoint interpolation, and `quadraticCurveTo`. Do not replace with circles, gradients, clip-path polygons, SVG filters, or CSS radial masks.

Every active frame updates both masks via `canvas.toDataURL()` with `100% 100%`, no-repeat.

---

## 6. Entrance choreography — preserve once-only sequence

Keep `<html class="anim">` and remove `.anim` after the final `orb-*` animation, with a 6000ms safety timeout. Never replay the entrance.

Preserve keyframes and timing:

- brand: quiet 620ms / 100ms
- nav groups: dim 550ms / 180, 225, 270, 315ms
- first-Moment pill: quiet 620ms / 340ms
- word inner: word 1150ms / 300ms
- flower: subject 1150ms / 660ms
- both corner copies: corner 720ms / 980ms simultaneously

Word and flower use `--orb-reveal`; other elements use `--orb-soft`.

Do not animate transforms on optical-scale navigation parents, corner parents, or individual letter-shape corrections.

Reduced motion uses only a 280ms stage fade.

---

## 7. Mobile behavior

At `(max-width:900px), (max-aspect-ratio:4/5)`:

- hide desktop navigation and pill
- show a white circular burger
- open a frosted full menu sheet over a scrim
- include all four groups and all ten verified routes
- use Escape to close
- trap Tab and Shift+Tab within the sheet while open
- apply `inert` while closed
- restore focus to the burger after close
- prevent background pointer interaction while open

At portrait aspect ratio:

- smaller centered lily: `height:min(55dvh,110vw)`
- word size: approximately `min(27.5vw,18dvh)` while keeping LOVETREE readable
- allow corner copy to wrap without introducing page scroll

At width under 1200px or portrait, center the wordmark with `left:0;width:100%;text-align:center`.

---

## 8. Acceptance checklist

- Single standalone `index.html`; no framework and no page scroll
- Background remains `#161616`
- Original asterisk geometry and the four exact navigation anchor positions remain
- Desktop dropdowns are click-pinned, not hover-dependent
- White `첫 순간 심기` pill opens Track 64
- Giant `LOVE` white + `TREE` pink gradient wordmark
- Exact two Higgsfield lily URLs and no other images
- Original flower coordinates and overlap intent
- One-time entrance order remains frame → word → flower → both corners
- Organic trail uses 140px head, 24 noisy points, fade 0.92, 8px sampling, max 60
- FRONT is punched out while REVEAL is painted through the identical trail mask
- Ten verified template destinations only; every external route opens in a new tab
- Mobile burger, scrim, frosted sheet, Escape, Tab trap, and inert state work
- Original Orbit TTF data is embedded only when actually available; otherwise limitation is recorded rather than fabricated
