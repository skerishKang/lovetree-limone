# Source Track 73 — 메인프레임 마우스스크럽 러브트리히어로랜딩 V1 Gate Record

Issue: #313 · Refs: #80 · pattern: #236/#287/#289
Manifest: `design-intake/manifests/source-track-73-mainframe-hero.json`
Preservation: `reference/source-track-73-mainframe-hero/`
Drive folder: `73_메인프레임_마우스스크럽_러브트리히어로랜딩_V1` (`1_rflZqy4e1RsvlpRhTrcPrmy0wi0xyPE`) — 48 files / 44,351,231 B

## Source identity

Full-screen mouse-scrub cinematic hero landing. External origin brief `4.Retro-Futurist.txt`
("Mainframe" creative agency hero; React/TS/Vite/Tailwind, HelveticaNow webfonts) rebuilt as a
LoveTree first-screen candidate series:

```text
V1  React/Vite/Tailwind source project (zip + src)
V2  standalone direct-open fix
V3  fast-scrub template portal
V4  repeat typewriter sound clean portal
V4.1 pinned desktop menus
V4.2 dual typewriter sound selector (선택-V6; 끄기/합성형/실녹음형)
V5  orbit morph LoveTree poster portal — LOVETREE wordmark(LOVE white/TREE pink gradient),
    pinned menus 둘러보기·내 러브트리·이야기·가이드 linking existing adopted templates,
    첫 순간 심기 CTA, mobile scrim/frosted-sheet/ESC/Tab-trap/inert
```

## Preservation (caps: 50 MB total / 10 MB per file; videos fingerprint-only)

- All 45 non-video files preserved byte-exact: **2,342,689 B** + `SHA256SUMS.txt` (45 entries).
- Videos fingerprint-only in `FILE_INDEX.md` (48 files / 44,351,231 B total):
  - `73_메인프레임_마우스스크럽_러브트리히어로랜딩_V1.mp4` — 19,370,101 B (MD5 server-side)
  - `V3_.../녹화_2026_08_18_00_25_47_646.mp4` — 20,005,089 B
  - `V2_.../녹화_2026_08_17_23_47_54_535.mp4` — 2,633,352 B
- Dual-pin provenance: **45/45 Drive-MD5 == local-MD5** verified; no OPEN flag.
- Key fingerprints:
  - V5 portal `index.html` — 25,459 B, SHA256 `ee4a10eb…e52a`
  - V4.2 dual sound selector HTML — 61,463 B, SHA256 `b3a9ee25…cbb3`

## Gate state

```text
SOURCE_TRACK_73_INTAKE   = RECORDED
LIFECYCLE                = EXECUTABLE_AVAILABLE (source truth, dom-2d)
LATEST_REVISION          = V5 orbit morph LoveTree poster portal
LINEAGE_RESERVATION      = HOLD (no repository lineage number allocated)
ADOPTION                 = HOLD (CANONICAL_V4_ADOPTION = NO)
BACKEND_SCOPE            = NONE
IMPLEMENTATION           = FORBIDDEN at this gate (Issue #313)
```

Open items before any adoption decision:

1. External "Mainframe" design-origin rights not established by the sibling package.
2. HelveticaNow webfont licensing for product use not recorded (external CDN links).
3. Sibling QA covers sibling runs only — no repository-side fidelity/reduced-motion/
   keyboard-takeover/overflow gates run.

## MVP 첫화면(v2 확장 후보) 적합성 메모

Track73은 MVP 첫화면 v2 확장(히어로랜딩) 후보로서 구조적 적합성이 높다: LOVETREE 워드마크 +
4개 고정 메뉴가 기존 채택본 트랙(62, 35/39/58, 43/70, Codex 14/15/64 등)으로의 실제 탐색
지도를 제공하고, `첫 순간 심기` CTA가 첫 기억 생성 흐름으로 직결되며, 마우스스크럽/오빗모프
카메라는 첫인상 시네마틱 요구와 부합한다. 다만 채택 논의 전에 (a) 외부 디자인 출처·폰트
라이선스 정리, (b) scrub/카메라 모션의 reduced-motion 의미 연속성, (c) 320×720 모바일
오버플로 검증이 선행되어야 하며, 본 게이트는 이 판단을 위한 보존·지문 계약만 확정한다.

## Rules

- Drive originals are read-only reference; product code never executes sibling source HTML/JS.
- Native implementation must not start from this gate registration.
