# Source Track 46 — 팝업시즌 기억책 Source Gate Record

Issue: #304 · Refs: #80 · pattern precedents #236 #287 #289
Classification: `NEW_LINEAGE_CANDIDATE + GROWTH_MILESTONES_SEASON_BOOK + SOURCE_REFERENCE_ONLY`
Manifest: `design-intake/manifests/source-track-46-popup-season.json`
Preservation: `old/reference/source-track-46-popup-season/` (full local tree) · `PROVENANCE.md` · `SHA256SUMS`

## Design authority

```text
STATUS             = INDEPENDENT NEW CANDIDATE / DESIGN REVIEW (구현보고.md; source-side work no. 43.팝업시즌기억책)
EXECUTABLE         = 01_팝업시즌_기억책.html (55,960 B single HTML — CSS 3D transforms + inline SVG paper-cut,
                     JS state machine, localStorage, Web Audio, runtime YouTube iframe)
REFERENCE          = external paper-cut popup-book screen recording; motion grammar only, valid range 1.0–13.2s
                     of 14.98s clip; frames NEVER used as background/texture (contract rule, QA-verified)
INTEGRATION        = NONE — 기존 LoveTree HTML 미수정, 사람별 기억책장·Season Archive 미통합 (by design)
QA                 = 04_검증결과.json — console/page errors 0 (desktop+mobile), 390×844 readable, a11y keys,
                     reduced-motion fallback; performance NOT independently certified (headless rAF throttled)
OWNER_REVIEW       = PENDING — adoption + integration stance vs Season Archive / bookshelf family
IMPLEMENTATION     = MUST NOT START (gate registration only)
PRODUCTION SOURCE  = DO NOT MODIFY (Drive originals read-only)
```

## Provenance & integrity

- Drive folder `[[지피티 작업]]/[01_러브트리]/03_디자인채택본/46_팝업시즌_기억책`, observed 2026-08-21.
- Full-tree read-only transport via rclone (`copy --transfers 2`, WSL-native ext4 worktree):
  **13 files / 24.9 MiB**, no duplicate same-name Drive objects.
- `SHA256SUMS` pins all 13 transported files from the fresh local copy.
- Integrity: **all 13 files verified OK against Drive-native MD5** (full-tree check).
- Fresh hash vs Drive history pin: executable SHA256 `8537502c867191b821535ced8a658d985eeb78ca75baf447762b3def51f5cbb7`
  is byte-identical across (1) this fresh transport, (2) Drive-native MD5, and (3) the merged #287 snapshot copy
  `old/reference/source-tracks-snapshot/46_팝업시즌_기억책/01_팝업시즌_기억책.html` incl. its own `SHA256SUMS.txt`.
  No mismatch — no OPEN flag required for identity.

## Repository commit selection (guardrail ≤50MB total / ≤10MB per file / videos fingerprint-only)

Committed (≈1.31MB): executable HTML, execution contract txt, 구현보고·종이장면구조·레퍼런스분석 md,
검증결과 json, 비교이미지 jpg, 화면캡처 jpg, 대표미리보기 png, `SHA256SUMS`, `PROVENANCE.md`.

Fingerprint-only (video guardrail, no pre-approved exception): all four mp4s
(데스크톱 1,567,266B · 모바일 448,361B · 팝업시즌기억책 7,196,639B · 참고영상 원본 15,592,414B) —
recorded as `PENDING` artifacts with full Drive ID + bytes + SHA256 in the manifest and listed below.

No dual-candidate or dual-object state found in this track.

## Open gates

| Gate | State | Blocking condition |
|---|---|---|
| Owner adoption decision | PENDING | independent candidate vs integration with Season Archive / bookshelf family |
| Integration overlap review | PENDING | deliberate non-integration must be reconciled with existing families |
| Media policy | PENDING | moment playback depends on external YouTube |
| Performance certification | PENDING | headless-only observation; real-hardware certification absent |
| Native intake | NOT STARTED | requires authority close → source QA → exact fingerprint |
| Lineage reservation | HOLD | no repository lineage number allocated |

Correct sequence: owner adoption/integration decision → media policy → performance certification →
executable/source QA → exact fingerprint → repository native intake/proving.

## Repository disposition

```text
SOURCE_TRACK_46_INTAKE      = RECORDED
LINEAGE46_RESERVATION       = HOLD (no repository lineage number allocated)
CANONICAL_V4_ADOPTION       = NO
BACKEND_SCOPE               = NONE (no DB/API/Auth/Firebase/Neon/Worker work implied)
IMPLEMENTATION_RELEASE      = NO
```

## FILE_INDEX (full preserved tree, 13 files)

```text
1kpMnwzZCBhunk-68ozgTYqqNeruIHMYS	1567266	01_녹화영상_데스크톱.mp4
1VtI5Vj1aVpKmtwoLQtoj-vFYEih2hRtD	55960	01_팝업시즌_기억책.html
15bY-cH_9sSE36DT02NuJkui3kL0svES8	448361	02_녹화영상_모바일.mp4
1VLRtAHJX-U6UyW9RzRU_ShXJQU_xoVGb	7196639	02_녹화영상_팝업시즌기억책.mp4
1RUErhqCUYBNJEBbRqRTN8a-GRi3JOTX2	15592414	03_참고영상_팝업시즌기억책_원본.mp4
1kHLZbcFuu-Is5arQXVlp3ijG0GFW4ZQ9	59776	10_이미지/01_화면캡처.jpg
1cTp72J_wsJzFOwPDztovVuZSFZpafkWs	568424	10_이미지/90_자동생성_대표미리보기.png
1O6uplRgdixXMEZnCaro0TFCpRjYeyrwc	37341	40_문서자료/01_실행계약_팝업시즌기억책_v1.txt
14aReBAY6rWwA1wNkkjRyam1EzyC-IaWs	5908	50_검증및제출자료/01_구현보고.md
1F0Y2WYgELe_P9OTIUlw-aQHkTVAG9Hhk	6213	50_검증및제출자료/02_종이장면구조.md
1XHBfPuf0R0oYAFWphUqsQOxHICXRjzLU	5275	50_검증및제출자료/03_레퍼런스분석.md
1VQYFwCVLB7vnIIi1PpbdMvP_-gElmNU-	5442	50_검증및제출자료/04_검증결과.json
18JtbKqCcpFaymtRCQgnVqRzbncrCxAdN	584852	50_검증및제출자료/05_비교이미지_레퍼런스대비결과.jpg
```

## SHA256SUMS (fresh local copy, 2026-08-21)

```text
1eeb0f0c3b9884a2abcfdb91b5c98beaae7684c664089915bf7fcc18e8891df0  ./01_녹화영상_데스크톱.mp4
ce9a697134bf1d8e1f0305a5881b82c94b4b37f195565794eb8ea37154112639  ./40_문서자료/01_실행계약_팝업시즌기억책_v1.txt
9fa4878b411109b62e3ec75f9be43db549afb55e3365b830af1cb4edef351aea  ./03_참고영상_팝업시즌기억책_원본.mp4
8537502c867191b821535ced8a658d985eeb78ca75baf447762b3def51f5cbb7  ./01_팝업시즌_기억책.html
e691f376b19ca00f6b7b7f76f44add87ee6364a0e792adbc1534292d5f5a56fa  ./02_녹화영상_팝업시즌기억책.mp4
6f636a50dafd4b9fe253abf036daf32972656fb4c9460a0d130ce4c0e1bc62da  ./02_녹화영상_모바일.mp4
cff0631200f04c0d2f1268fa5a5673b0427fbf3c0c4f30fb1633f148f3d0b65b  ./10_이미지/90_자동생성_대표미리보기.png
360bc49c085008649778e275e9fe72c7102ed7cf0e5d242dae07668faa05bf77  ./10_이미지/01_화면캡처.jpg
f41fe3a5905f8cdb8a87f84fc514b31199cec2c54c4044887c5b9f7b6bd13c5d  ./50_검증및제출자료/02_종이장면구조.md
a008315ae09dcebf9ffa760fbed366ff06caa8e784a48c43180bf47c8fc73003  ./50_검증및제출자료/03_레퍼런스분석.md
5827ec594fb890f3cdee6befd5b37d0e9b64615165291dc7bdfa57abe6c61ae8  ./50_검증및제출자료/05_비교이미지_레퍼런스대비결과.jpg
5f750eb0aeb5d831736cdfe0d6c124ab07215c70a1db0b796479d88f43008a30  ./50_검증및제출자료/01_구현보고.md
aaa81b4c15e24a4a98ce980d9f7fba07c023c830679ae51279437e0c5a1b6f1a  ./50_검증및제출자료/04_검증결과.json
```
