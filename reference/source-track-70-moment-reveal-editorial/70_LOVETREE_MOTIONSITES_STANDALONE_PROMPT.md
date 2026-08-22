# Track 70 — LoveTree Moment Reveal / Future Editorial
# MotionSites Standalone Prompt

Build a pure-white, minimal, futuristic LoveTree emotional archive landing page titled:

`LoveTree — My Emotional Path Archive`

Stack:

- React 19
- Vite
- TypeScript
- Tailwind CSS v4
- lucide-react

The page must preserve the original MotionSites fashion-template composition, whitespace, monochrome visual authority, cursor-driven dual-image reveal, fluid typography, drawer behavior, and editorial atmosphere as faithfully as possible.

This is not a fashion store, generic photo gallery, dating page, scrapbook, or mood board.

The central LoveTree meaning is:

> A Moment is not a file.  
> It is the instant your feeling moved.  
> Moments become paths.  
> Paths become your LoveTree.

Do not make this a cute or conventionally romantic website.

Do not add:

- pink gradients
- purple
- cream scrapbook paper
- flower overload
- a giant literal tree
- glow effects
- floating decorative cards
- testimonials
- pricing
- fake social proof
- e-commerce language

The page should remain overwhelmingly white, black, and gray.

LoveTree identity must come from:

- the dual-portrait reveal metaphor
- Moment / Path / Journal / My Tree language
- the emotional-path interaction model
- real template portal navigation

---

## 1. VISUAL INTERPRETATION OF THE TWO PORTRAITS

Keep the portrait-led concept.

Do not treat the woman as a fashion model selling clothes.

Treat her as a fictional LoveTree Subject: someone the user first noticed and gradually came to see differently.

### BG_IMAGE_1 — FIRST IMPRESSION

Meaning:

`I noticed her.`

Emotion:

distance / curiosity / first recognition

### BG_IMAGE_2 — EMOTIONAL AFTERIMAGE

Meaning:

`I looked again, and she no longer felt like a stranger.`

Emotion:

curiosity → recognition → attachment → afterglow

The mouse spotlight does not simply reveal another photograph.

It reveals how the same person became different in memory after the user's feeling changed.

This reveal is the central LoveTree metaphor.

Use the original supplied image URLs:

### BG_IMAGE_1

```text
https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260802_074534_f0d9d476-3f86-4c67-9b12-dfc63d99da41.png&w=1920&q=85
```

### BG_IMAGE_2

```text
https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260802_075145_1b557479-775b-43af-8270-f45d79d97d5a.png&w=1920&q=85
```

Both layers:

```text
absolute inset-0
background-size: cover
background-position: center
background-repeat: no-repeat
```

Do not put the portraits inside cards.

---

## 2. FONTS

Load:

```text
https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Michroma&family=Orbitron:wght@600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap
```

Usage:

- Orbitron: hero headline, drawer titles, work titles
- Plus Jakarta Sans: LoveTree wordmark, navigation, body UI, descriptions, buttons
- Michroma and Chakra Petch may remain loaded but should not dominate

CSS:

```css
.font-orbitron { font-family: 'Orbitron', sans-serif; }
.font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
```

Body:

```text
bg-white text-black antialiased
selection:bg-black selection:text-white
```

---

## 3. FLUID SIZE SYSTEM

Use this exact fluid size system:

```css
:root {
  --pad-x: clamp(1.25rem, 4.5vw, 5rem);
  --pad-y: clamp(1rem, 3vh, 4rem);
  --header-pt: clamp(1.25rem, 2.5vh, 2.5rem);
  --gap-nav: clamp(1rem, 2.2vw, 2.25rem);
  --logo: clamp(1.35rem, 1.2vw + 0.9rem, 2.1rem);
  --logo-deg: clamp(0.65rem, 0.4vw + 0.45rem, 0.9rem);
  --nav: clamp(0.65rem, 0.35vw + 0.5rem, 0.875rem);
  --headline: clamp(2.15rem, 4.5vw + 0.75rem, 5.25rem);
  --body: clamp(0.7rem, 0.35vw + 0.55rem, 0.9rem);
  --micro: clamp(0.55rem, 0.25vw + 0.45rem, 0.7rem);
  --btn-px: clamp(1.15rem, 1.4vw, 1.75rem);
  --btn-py: clamp(0.6rem, 0.9vh, 0.85rem);
  --btn-gap: clamp(0.75rem, 1vw, 1.1rem);
  --feature-pad: clamp(1rem, 1.5vw, 1.75rem);
  --feature-min: clamp(13rem, 18vw, 20rem);
  --globe: clamp(2.25rem, 2.5vw + 1rem, 3.25rem);
  --checker-w: clamp(2.75rem, 4.5vw, 6.5rem);
  --checker-h: clamp(1.35rem, 2.2vw, 3rem);
  --corner: clamp(0.65rem, 0.4vw + 0.4rem, 0.95rem);
  --icon: clamp(1rem, 0.6vw + 0.7rem, 1.35rem);
  --drawer-pad: clamp(1.25rem, 2.5vw, 2.25rem);
  --drawer-max: clamp(18rem, 28vw, 28rem);
  --section-gap: clamp(0.75rem, 1.5vh, 1.5rem);
  --main-py: clamp(1.25rem, 4vh, 4rem);
}
```

Do not replace this with rigid breakpoint-heavy sizing.

---

## 4. ROOT STRUCTURE

```text
min-h-screen
bg-white
text-black
font-jakarta
flex flex-col justify-between
relative
overflow-hidden
```

---

## 5. DESKTOP MEMORY REVEAL

Component:

`MemoryRevealBackground`

Desktop only:

```text
hidden lg:block fixed inset-0 pointer-events-none z-0 overflow-hidden
```

Layers:

1. BG_IMAGE_1
2. BG_IMAGE_2 clipped by a moving mask
3. subtle SVG coordinate grid

Mouse easing:

```js
smooth.x += (mouse.x - smooth.x) * 0.1
smooth.y += (mouse.y - smooth.y) * 0.1
```

Spotlight radius:

```js
Math.round(
  Math.min(
    420,
    Math.max(160, window.innerWidth * 0.16)
  )
)
```

Radial gradient stops:

```text
0     rgba(255,255,255,1)
0.4   rgba(255,255,255,1)
0.6   rgba(255,255,255,0.75)
0.75  rgba(255,255,255,0.4)
0.88  rgba(255,255,255,0.12)
1     rgba(255,255,255,0)
```

Export the offscreen canvas each frame and apply it to BG_IMAGE_2:

```css
mask-image: url(dataUrl);
-webkit-mask-image: url(dataUrl);
mask-size: 100% 100%;
```

Do not simplify this into a basic opacity fade.

---

## 6. PARALLAX MEMORY GRID

Grid cell size:

```js
Math.round(
  Math.min(
    64,
    Math.max(36, window.innerWidth * 0.028)
  )
)
```

SVG path:

```text
M {cell} 0 L 0 0 0 {cell}
```

Stroke:

```text
#64748b
```

Opacity:

```text
0.10
```

Normalize the smoothed cursor into cx / cy from -0.5 to +0.5.

Target offsets:

```text
cx * 16
cy * 16
```

Ease:

```text
0.06
```

The grid should feel like a subtle memory-coordinate field, not a literal network diagram.

---

## 7. MOBILE

Below `lg`, disable the animated reveal.

Show BG_IMAGE_1 as a static editorial image beneath the hero.

```text
aspect-[4/5]
sm:aspect-[16/9]
border border-gray-200
```

Caption:

`FIRST IMPRESSION · MOMENT 01`

---

## 8. HEADER

### Left wordmark

Primary:

`LoveTree˚`

Use Plus Jakarta Sans bold.

Do not use all caps.

Letter spacing:

```text
-0.04em
```

Small descriptor:

`MY EMOTIONAL PATH ARCHIVE`

Uppercase, wide tracking, reduced opacity.

### Right navigation

```text
MOMENTS | PATHS | JOURNAL | ♥
```

The Heart represents `MY TREE`.

If Moments have been planted, show a small black count badge.

All menu buttons must work.

MOMENTS / PATHS / JOURNAL / MY TREE open right-side drawers.

The browser Back button must close the current drawer and return to the untouched hero screen.

---

## 9. HERO

### Main headline

Use Orbitron extrabold.

Three lines:

```text
MOMENTS
BECOME
PATHS
```

Tracking:

```text
0.08em
```

Leading:

```text
1.05
```

After `PATHS`, place a monochrome abstract Moment Path Matrix.

It should contain:

- 7–9 tiny nodes
- thin connecting lines
- one larger origin node
- asymmetrical branching
- no color

Keep approximately the same size and inline position as the source checkerboard.

### CTA

```text
OPEN ARCHIVE
```

Use lucide `ArrowUpRight`.

Hover:

- black fill
- white text
- black border
- arrow nudges up-right

CTA opens the MOMENTS drawer.

### Right feature

Use a wireframe emotional-path sphere with several tiny connected nodes.

Tagline:

```text
A MOMENT MOVES.
A PATH REMAINS.
```

Optional microcopy:

```text
MOVE ACROSS A MEMORY
```

---

## 10. DRAWER INTERACTION

Use a white right-side drawer.

Backdrop:

```text
bg-black/20
backdrop-blur-xs
```

The drawer must support:

- X close
- backdrop close
- ESC close
- browser Back close
- focus-visible states

Do not replace the current page when opening a template.

All template links must be real anchors:

```html
<a target="_blank" rel="noopener noreferrer">
```

Do not use a `location.href` fallback.

---

## 11. MOMENTS DRAWER

Title:

`Moment Archive`

Subtitle:

`Saved Moments`

### 01

Tag:

`FIRST SPARK`

Title:

`THE FIRST LOOK`

Metadata:

`00:17 · FIRST IMPRESSION`

Description:

`I did not know why I stopped here yet.`

Template:

Track 65 FIRST CLUE

### 02

Tag:

`CURIOSITY`

Title:

`LOOK AGAIN`

Metadata:

`00:42 · CURIOSITY`

Description:

`That expression stayed with me, so I came back.`

Template:

Track 68 MOTION ARCHIVE

### 03

Tag:

`TURNING POINT`

Title:

`WHY IT STAYED`

Metadata:

`01:08 · RECOGNITION`

Description:

`A small detail changed the way I saw this person.`

Template:

Track 61 CONNECTION REVIEW

### 04

Tag:

`AFTERGLOW`

Title:

`THE MEMORY RETURNED`

Metadata:

`01:31 · AFTERGLOW`

Description:

`The screen went dark. The moment did not.`

Template:

Track 59 MEMORY SKETCHBOOK

Each row has:

- `PLANT`
- `OPEN`

PLANT adds the Moment to My Tree.

Toast:

```text
Planted "{title}" in My Tree.
```

OPEN opens the related template in a new tab.

---

## 12. PATHS DRAWER

Title:

`Emotional Paths`

Subtitle:

`Ways I Followed The Feeling`

### FIRST SPARK

Subtitle:

`THE FIRST THREE MOMENTS`

Description:

`First look → curiosity → looking again.`

Sequence:

`01 → 02 → 04`

Template:

Track 67 MEMORY TAPE

### WHY I KEPT SEARCHING

Subtitle:

`CURIOSITY PATH`

Description:

`A detail stayed in memory, leading to another clip, another expression, another question.`

Sequence:

`02 → 03 → 04`

Template:

Track 61 CONNECTION REVIEW

### FALLING IN

Subtitle:

`TURNING POINT PATH`

Description:

`The route where recognition became attachment.`

Sequence:

`03 → 04 → 07`

Template:

Track 60 MOMENT CLUSTER

Each path must have a working OPEN link that opens a new tab.

---

## 13. JOURNAL DRAWER

Title:

`Heart Journal`

Subtitle:

`Notes From The Path`

### Entry 1

```text
AUG 17 2026
I CAME BACK TO THE FIRST MOMENT
2 MIN READ
```

Template:

Track 59 MEMORY SKETCHBOOK

### Entry 2

```text
AUG 12 2026
WHY THAT EXPRESSION STAYED WITH ME
3 MIN READ
```

Template:

Track 58 LIVING MEMORY

### Entry 3

```text
AUG 04 2026
THE DAY CURIOSITY BECAME ATTACHMENT
4 MIN READ
```

Template:

Track 57 LIVING GLASS

Each entry must have a working OPEN link that opens a new tab.

---

## 14. MY TREE DRAWER

Title:

`My Tree`

Empty state:

```text
No moments planted yet.
Plant the moments that changed how you felt.
```

When populated, show:

- number
- Moment title
- emotional tag
- timestamp
- REMOVE

Footer CTA:

```text
OPEN MY TREE
```

Template:

Track 66 FIRST TREE

OPEN MY TREE opens a new tab and does not clear planted Moments.

---

## 15. WORKS_ INDEX

Place a restrained `WORKS_` trigger at the lower-right of the page.

It opens a full-screen dark WORKS index.

Rows:

```text
70 — MOMENT REVEAL — CURRENT
68 — MOTION ARCHIVE
67 — MEMORY TAPE
66 — FIRST TREE
65 — FIRST CLUE
64 — WELCOME ORBIT
63 — MOMENT FIELD
62 — MEMORY SCULPTURE
61 — CONNECTION REVIEW
60 — MOMENT CLUSTER
59 — MEMORY SKETCHBOOK
58 — LIVING MEMORY
57 — LIVING GLASS
```

Every non-current row must open the corresponding existing LoveTree HTML in a new tab.

The browser Back button must close the WORKS index and return to the hero.

---

## 16. RELATIVE TEMPLATE TARGETS

Assume this Track 70 HTML is stored inside:

```text
70_모먼트리빌_퓨처에디토리얼/V2.1_NAV_RETURN_FIX/
```

Use package-relative links such as:

```text
../../68_인물감정경로_모션아카이브/V7_C14_ASSET_PATH_FIX/68_V3.3.1_COMPARE_LAUNCHER.html

../../67_메모리테이프_인터랙티브롤/07_V2.4.2_WORKS_COMPARE_MENU/track67_v2.4.2_works_compare_menu.html

../../66_첫트리만들기_인터랙티브스크롤가이드/버전1.2_제품목적·실제Moment체험강화_후보/현재후보.html

../../65_입덕단서_시네마틱에디토리얼/V18_디자인팀장15기_H3_EXTENDED_MOTION_EDITING_후보_선택/★_현재후보_65_V2.2.5_H3_EXTENDED_MOTION_EDITING_CINEMATIC.html

../../64_부유모먼트_웰컴오빗_입장포털/현재후보.html

../../63_모먼트필드_3D뷰스튜디오/버전1.2_프리셋시인성·자동맞춤·실제동작보정_후보/현재후보.html

../../62_기억조각상_원형레일전시/62_기억조각상_원형레일전시.html

../../61_감정경로_연결검토실/현재후보.html

../../60_3D모먼트클러스터_심층탐색_55,56,59연결버전/버전1.2_실제트랙네비게이션_후보/★_현재후보_Track60_V1.2_REAL_NAVIGATION.html

../../59_메모리스케치북_페이지여정/버전5_스토리자동재생·인라인편집·시네마틱배경_최신후보/현재후보.html

../../58_리빙메모리_핀보드/★_최종_58_리빙메모리_핀보드.html

../../57_리빙글라스_모먼트카드/★_최종_버전1.2_리빙글라스_모먼트카드.html
```

---

## 17. VISUAL RULES

Use only:

- white
- black
- gray-200
- gray-300
- gray-400
- gray-500
- gray-600
- slate grid `#64748b`

Do not use LoveTree rose or sage in this candidate.

This Track 70 deliberately explores a monochrome editorial LoveTree world.

---

## 18. FIRST VIEWPORT

Only show:

1. LoveTree wordmark
2. MOMENTS / PATHS / JOURNAL / MY TREE navigation
3. MOMENTS / BECOME / PATHS
4. Moment Path Matrix
5. OPEN ARCHIVE
6. wireframe emotional-path sphere
7. A MOMENT MOVES. A PATH REMAINS.
8. the original two-image cursor reveal
9. small WORKS_ trigger

Do not add feature sections below the fold.

---

## 19. ACCESSIBILITY AND QUALITY

Support:

- keyboard navigation
- visible focus
- ESC
- browser Back for drawers and WORKS
- reduced motion
- mobile fallback
- no layout jump
- no dead buttons
- no fake links
- no current-tab replacement when opening templates

When reduced motion is enabled:

- stop parallax
- stop animated mask movement
- retain a usable static presentation
- keep drawers and portals functional

---

## FINAL ART DIRECTION

Make this feel like:

**a museum-grade personal archive for the exact moments through which one person became emotionally significant.**

The source MotionSites fashion template should remain recognizable in composition and motion.

But after reading the text and interacting with the page, nobody should think this is a fashion store.

They should understand:

> This is LoveTree.  
> I save the moment.  
> I remember why I looked again.  
> I follow the path of how my feeling changed.
