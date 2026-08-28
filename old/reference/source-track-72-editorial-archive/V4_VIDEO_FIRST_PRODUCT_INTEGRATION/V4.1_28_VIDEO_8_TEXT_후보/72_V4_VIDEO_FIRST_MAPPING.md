# Track 72 V4 — VIDEO FIRST MAPPING

- Base: V3 FINAL CANDIDATE / C1 PASS
- V3 original preserved; this is a separate product-integration revision.
- 36 Moment count preserved.
- Media Moments: 28 actual MP4
- Text Moments: 8 DOM Memo/Connection surfaces
- Photo/Object static card types in V4: 0
- All MP4 paths point to existing `결과물` files; no generated/fake motion.

## Mapping

| Moment | Previous type | V4 type | Actual MP4 |
|---|---|---|---|
| m01 | video | video | `65_입덕단서_시네마틱에디토리얼.mp4` |
| m02 | photo | video | `51_네온인간분석_홍보대문.mp4` |
| m03 | object | video | `48-2_아이돌러브트리_네온파일럿.mp4` |
| m04 | object | video | `코덱스-09_러브트리_꽃잎자동차_감정여정_V4.mp4` |
| m05 | photo | video | `49_아이돌모먼트_리빌포털.mp4` |
| m06 | object | video | `코덱스-07_러브트리_살아있는캐릭터월드_V2.mp4` |
| m07 | video | video | `52_글로벌모먼트오빗_3D네트워크.mp4` |
| m08 | photo | video | `47-3_시즌수채화블_통합개발.mp4` |
| m09 | photo | video | `코덱스-03_러브트리_에디토리얼_기억대문_여성_V1.mp4` |
| m10 | object | video | `코덱스-08_러브트리_크리스털기억_아틀리에_V3.mp4` |
| m11 | video | video | `59_메모리스케치북_페이지여정.mp4` |
| m12 | connection | connection | DOM text preserved |
| m13 | video | video | `67_메모리테이프_인터랙티브롤.mp4` |
| m14 | photo | video | `64_부유모먼트_웰컴오빗_입장포털.mp4` |
| m15 | photo | video | `68-3_물감정경로_모션아카이브_동양인.mp4` |
| m16 | memo | memo | DOM text preserved |
| m17 | photo | video | `70_모먼트리빌_퓨처에디토리얼.mp4` |
| m18 | connection | connection | DOM text preserved |
| m19 | photo | video | `코덱스-04_러브트리_최애아이돌_오빗아카이브_V1.mp4` |
| m20 | photo | video | `57_리빙글라스_모먼트카드.mp4` |
| m21 | photo | video | `50-1_드림메모리_시네마틱.mp4` |
| m22 | object | video | `코덱스-10_러브트리_최애아이돌_영상오빗캐러셀_V1.mp4` |
| m23 | memo | memo | DOM text preserved |
| m24 | photo | video | `27_모션기억아카이브_클릭재생_v1.mp4` |
| m25 | photo | video | `45_모먼트정밀보정도구.mp4` |
| m26 | memo | memo | DOM text preserved |
| m27 | photo | video | `68-2_인물감정경로_모션아카이브_혼혈.mp4` |
| m28 | object | video | `12_글로벌디스커버리_탐색홈.mp4` |
| m29 | connection | connection | DOM text preserved |
| m30 | photo | video | `43_기억장면레시피.mp4` |
| m31 | photo | video | `42_시즌기억카드.mp4` |
| m32 | connection | connection | DOM text preserved |
| m33 | photo | video | `50-2_드림메모리_시네마틱.mp4` |
| m34 | photo | video | `53_모먼트노드_라이트펄스_커넥션플로우.mp4` |
| m35 | memo | memo | DOM text preserved |
| m36 | photo | video | `39_LP커버플로우.mp4` |

## Runtime

- Inline videos remain `muted + loop + playsinline`.
- Existing IntersectionObserver playback policy is preserved: visible videos play; offscreen videos pause; re-entry resumes.
- Existing C1 viewer, Connection traversal and Replay are preserved.
- Filter surface in V4 is simplified to All / Video / Memo / Connection because Photo/Object media types are no longer present.
