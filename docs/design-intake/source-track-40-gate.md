# Source Track 40 — 시네마틱황금열매 버전통합 (Cinematic Golden Fruit) Source Gate Record

Issue: #340 · Refs: #80 #287 #289
Classification basis: PARTIAL — motion-analysis notes exist; no 작업지시/design-lead instruction and no recorded product-owner decision in folder → adoption PENDING
Manifest: `design-intake/manifests/source-track-40-goldenfruit.json`
Provenance: `reference/source-track-40-goldenfruit/` (+ `SHA256SUMS`, selected set)

## Design authority

```text
SOURCE_FOLDER      = [[지피티 작업]]/[01_러브트리]/03_디자인채택본/40_시네마틱황금열매_버전통합
                     (Drive folder 12fTnrGHoBazU09y5Z5RBkZ6c3FBDJhPw)
CURRENT_REVISION   = UNVERSIONED_DRIVE_SNAPSHOT_2026-08-07 (files last modified 2026-08-06/07)
INSTRUCTION_DOC    = NOT FOUND — only motion-analysis notes (40_문서자료/01_모션분석.md,
                     05_…/15_모션분석.md)
OWNER_STATUS       = no written product-owner decision in folder
LINEAGE40          = HOLD (no repository lineage number allocated)
ADOPTION           = HOLD (IMPLEMENTATION_RELEASE=NO; CANONICAL_V4_ADOPTION=NO)
PRODUCTION SOURCE  = DO NOT MODIFY (Drive originals read-only)
```

Observed source surface: 16-scene cinematic scroll journey reproducing a reference
recording — orchard opening, question scene, constellation drawing, pruning/grafting,
golden fruit finale. Version-consolidated family:

```text
V1   초기황금하트 스크롤스토리        (02_초기황금하트_v1)
V2   성장모션증명                    (03_성장모션증명_v2)
V3   원본에셋 / 레퍼런스충실도        (top-level + 04_레퍼런스충실도_v3)
V5   레퍼런스모션재현 — folder name marks 버벅 (janky motion)  (05_…v5_버벅)
V5-1 레퍼런스모션 보정               (02_시네마틱황금열매_레퍼런스모션_v5-1.html)
V6   국제판 — AUTHORITY              (01_시네마틱황금열매_국제판_v6.html, top-level)
```

## Authoritative executable selection rationale

`01_시네마틱황금열매_국제판_v6.html` (7,451,922 B,
SHA-256 `9a97ce9ee0c0f00fea57add2dbbd55f5d7f50b7ea9cf7d663ca642c879f3d17b`,
Drive `1qUMW1mjvz9audoIy07_-3GraBQvzmYt7`) is the observed current candidate because:

1. highest version number in the consolidation folder, placed at top level;
2. HTML title "LoveTree — International cinematic edition" — consolidated edition;
3. a dedicated final recording exists (`02_녹화영상_시네마틱황금열매_v6.mp4`);
4. predecessor V5 is marked defective by its own folder name (버벅) and superseded by
   V5-1 per the motion re-analysis note;
5. top-level `30_검증자료/01_검증결과.json` records PASS (16 scenes, desktop/mobile
   clean) — caveat below.

Caveat: the PASS result carries **no target hash**, so it cannot be cryptographically
bound to V6 — pre-implementation re-verification against the pinned V6 fingerprint is
mandatory. All older version executables are committed as historical comparison evidence.

## Preservation & commit-cap selection (#287 standard)

69 files (~384.6 MB) observed in Drive were copied byte-exact with
`rclone copy --transfers 2`. Commit caps applied: videos fingerprint-only (lane rule),
total ≤50 MB, single file ≤10 MB, selection priority ★final 실행본 HTML → 작업지시 .md
(none exists) → 게이트자료.

```text
COMMITTED (12 files, 25.9 MB total, max 7.11 MB — pinned in SHA256SUMS):
  7 version-executable HTMLs (V6 authoritative + V5-1/V5/V3×2/V2/V1 historical)
  2 motion-analysis notes (.md)
  3 sibling QA results (.json)
WITHHELD (57 files, fingerprints fixed below and as PENDING manifest entries):
  8 video binaries (277.3 MB — video-fingerprint-only rule; one also >10 MB)
  49 image stills (~87 MB — dropped by the 50 MB total cap after priority selection)
No non-video single file exceeded 10 MB; no exception approval was required.
Local working copies of withheld binaries were removed after fingerprinting;
the untouched Drive originals remain the canonical preservation.
```

Committed key artifacts:

| File | Bytes | SHA-256 | Drive ID | Status |
|---|---|---|---|---|
| 01_시네마틱황금열매_국제판_v6.html | 7,451,922 | `9a97ce9ee0c0f00fea57add2dbbd55f5d7f50b7ea9cf7d663ca642c879f3d17b` | `1qUMW1mjvz9audoIy07_-3GraBQvzmYt7` | PINNED |
| 02_시네마틱황금열매_레퍼런스모션_v5-1.html | 7,443,862 | `cbc9b3651fe0ee63e67b5c05543b63d6a9851482244be51b3e6bb8ab4b6e6430` | `1mFCZ3oh92uNgKGQnXEVNw-5df5H7fQ8y` | PINNED |
| 05_레퍼런스모션재현_v5_버벅/01_레퍼런스모션재현_v5.html | 7,444,724 | `0a3b5920276389a62b38a48c01528505ea776eb6d0b142c7fd1a1c9f7555d0a7` | `1FzA9IJS3UkfxuUhAqcHh7QZkc2VoTqnT` | PINNED |
| 04_레퍼런스충실도_v3/01_레퍼런스충실도_v3.html | 3,030,255 | `a74511a211e6bb86dcadd76958faa194fe60f5bba89b5269aeafb0719f9a2ce6` | `14xoRwsEPWk6jOz9IHwsKQxivIKpGtYO_` | PINNED |
| 01_시네마틱황금열매_원본에셋_v3.html | 1,689,407 | `15e5086931807beb02a8e4da5b90255fea76a97eaccb4553dd7af8e9d90cf414` | `1yVahVrVvdoUxgTLP5PQyoeUZogo_mK6p` | PINNED |
| 03_성장모션증명_v2/01_성장모션증명_v2.html | 43,430 | `6d260bfefcedf5a9851687ec6e09e080566c84165210b90ecb03e315e5e1c1b1` | `15iTBrdWwB--SXzzaL2p1VAzL7Q8wmTFd` | PINNED |
| 02_초기황금하트_v1/01_초기황금하트_스크롤스토리_v1.html | 43,910 | `2adc32fdbdb081240aa44b94f869a5b1f381cd5cd7f98896c93d16178775398d` | `1JGptuS8MdMR_z6fEez8IFraMPl1_K_oC` | PINNED |
| 40_문서자료/01_모션분석.md | 2,014 | `42dfa10d20a2baefe0c0d4d73e746fbd858fbfec02926d105ca90db053e765fe` | `1Vovrgp3QAqtbGjVGsrPxi4_Aks1vvOxL` | PINNED |
| 05_레퍼런스모션재현_v5_버벅/15_모션분석.md | 3,361 | `af8fa54dff08ac47fb4db038f9313c697d8252b6b71d6b64a439105b6d48760c` | `1jaXIYwzY-EOs3uMzGNdWMnyksfQ38FFn` | PINNED |
| 30_검증자료/01_검증결과.json | 1,060 | `6c3fe2a7d1e4a30e457c97f9ceb7aa8a6155b6a4c4c39aff44b9edd5e73e8eb1` | `19ElVSD7ey7zCS4SvKCrfY_kO2Ky_vS1K` | PINNED |
| 05_레퍼런스모션재현_v5_버벅/16_검증결과.json | 525 | `e0bbc25f014b137f7f68ccc30df89bc874e9e2ceb2b89ea696cfe9508d63f55d` | `1R54QlDn0zBnsfHlaz6GF0MRtMH6yONcg` | PINNED |
| 04_레퍼런스충실도_v3/10_검증결과.json | 227 | `340b4ab9eae361cf4c21789fff0ed73dcafdaa21e6dc4307810f2a37d06db9fb` | `1mTyxaszs_JSOkofVDt1eai0sb6JqiSFr` | PINNED |

### Video binaries withheld from commit (fingerprints only)

| File | Bytes | SHA-256 | Drive ID |
|---|---|---|---|
| 01_녹화영상_초기_v3.mp4 | 36,156,765 | `ad5b6b7aa4e8c22a2da993c63f3402b943156e911de7a30af09e92faa02d7769` | `1EyC_8ybXAjkk1bh8E7-ol9QvZAwcq5RM` |
| 02_녹화영상_개선_v5.mp4 | 60,006,772 | `35a88a6a46b9d18fd86d6f52ce7743b046a03c42de4db6f6e29dc4e7cf4b200c` | `1C85ZV4-hLQJ5fMLpgfZUw4psuf8N_UYS` |
| 02_녹화영상_시네마틱황금열매_v6.mp4 | 78,302,072 | `258579803d72d77db3b2f6c3e1c6a4c014b39a4dc4ca9f5d0a65916233618366` | `1RtV2hQMS9IPGdJTkYc7f4kO0Ie4ODH9u` |
| 02_초기황금하트_v1/02_실행영상_초기황금하트_v1.mp4 | 18,829,785 | `5437eb97c01e0c0fb97521803b180d090ed902ba9cab866c3b4f85597c86602e` | `18wKrlWmx4YLPYFDT5zm_FTM0u9KGoOJe` |
| 03_성장모션증명_v2/02_실행영상_시네마틱사용자여정_v2.mp4 | 3,713,076 | `a13dde8ac162038f28f3694b40b43caadbf1fcd9cfd6bb55ae8ac39fa9604bd1` | `1YK5WMu-z2QLbvk_8tuqxhStcuSnFAXG2` |
| 03_참고영상_시네마틱황금열매_원본.mp4 | 82,612,558 | `b3d36577b3be1e538acdbcada4e7754a5ae248951ff6eb3a287e70470aaa205d` | `1SE-zY1Zjf5x9CsWfxI_-HjsqQUK6S5br` |
| 04_레퍼런스충실도_v3/02_실행영상_레퍼런스충실도_v3.webm | 3,727,158 | `69d341c94a04b6bf57a1b88091d24c016bcd5664422c2855cc2b57ff64b07450` | `1uwow_RVIs_B-2hLWp2bPOrhp83yubLCi` |
| 05_레퍼런스모션재현_v5_버벅/02_실행영상_레퍼런스모션재현_v5.mp4 | 7,397,713 | `cd6dd005195321fb58828f1f2f3867b9bf89d20a3e9ec989d25edd3cb63bc203` | `1Oeck5JLe3dpcYw4tK3fuePYkM5FGxM_x` |

### Image stills withheld by 50 MB total cap (fingerprints only)

| File | Bytes | SHA-256 | Drive ID |
|---|---|---|---|
| 02_초기황금하트_v1/00_대표미리보기.png | 515,566 | `29fa84545228c6bfd0fcdf7d3125a521193c66e3abf0f59082eb6be9379ed3cc` | `1Ma3RYC4fD3aan1-RJIdI11rCHFDReDv7` |
| 03_성장모션증명_v2/00_대표미리보기.png | 519,949 | `2d5892e8af5da6084401730a2628bedf2405a03c1f384a53af35630a8b029c0f` | `1o_Bfpd2vxvlRb3PeAqPfpFngoDD2BPlc` |
| 04_레퍼런스충실도_v3/00_대표미리보기.png | 1,516,572 | `e6be39e7e938316aa44757f24e29a77adecb693e4b83aae7349242b5f4d64f4a` | `1bRgEx2TxZP-x3ru_Q37TJa_0vLYKNjSD` |
| 04_레퍼런스충실도_v3/03_화면캡처_데스크톱_첫화면.png | 1,443,742 | `dbe1554c251a5bc5f41886f89923f7fdfb23c274d318a65ee4e4d4fcad7af644` | `13iciRItP6dxkk2bJgRwZ2KquTVZ-LaH6` |
| 04_레퍼런스충실도_v3/04_화면캡처_데스크톱_과수원장면.png | 1,671,241 | `ed853ca2dfbe1194369075800f805a85a07b8a984323cba19a099942dee0c999` | `1MxZgIAw30959R5fOruucclrjB1rldqUW` |
| 04_레퍼런스충실도_v3/05_화면캡처_데스크톱_질문장면.png | 1,383,203 | `839a6223bf5b540497bd2271cda93ad6b31a41cf8397b38de816e48d0c709ae5` | `1XZnRhDxqkRLNUW89wEVNEInb5FRzp75m` |
| 04_레퍼런스충실도_v3/06_화면캡처_데스크톱_별자리장면.png | 1,366,062 | `7a35b4200db4fdfc6bb490b009901cfac06d516884be8090b70139b0442af499` | `1rK7wS3PAYsowf_dFE182d-G4Myb32hC-` |
| 04_레퍼런스충실도_v3/07_화면캡처_데스크톱_최종장면.png | 1,516,572 | `e6be39e7e938316aa44757f24e29a77adecb693e4b83aae7349242b5f4d64f4a` | `1m_gJX34KqOhGAdqeqFhtbV_mSyPQfizE` |
| 04_레퍼런스충실도_v3/08_화면캡처_모바일_첫화면.png | 359,491 | `ea4df5cd1f15e168c54c1d774d98a00df1e32b1219c4054bea7ab549f7af3868` | `1_5bOa8ZCjlNE8J0mCLmu_WN0xrlClvVa` |
| 04_레퍼런스충실도_v3/09_화면캡처_모바일_최종장면.png | 416,167 | `5121a398b288332ac78527d2d9ed31d0921d9cd381985dbee1ae699c8ee336be` | `1LNfdGixjp03c2XhdxKvqtZus3rSUxm_q` |
| 05_레퍼런스모션재현_v5_버벅/00_대표미리보기.png | 1,657,913 | `78bd9555bca660dae406a2b196c808a48721a2bce04fb4dafc173a56a3d28b54` | `1zVITgtkbi36gkvenyTc-lglxWA0yEw_y` |
| 05_레퍼런스모션재현_v5_버벅/03_화면캡처_오프닝정밀보정.png | 1,442,225 | `a4399392686bfcc2fa5571317cd3c6013781d2b2dbc8a11ed6d6df6f31288115` | `1fHqvS94aeaksW4pmPmHcyjMGUVea2REB` |
| 05_레퍼런스모션재현_v5_버벅/04_화면캡처_황금열매_클로즈업.png | 948,198 | `fd29d74b26e07d61196525fc26f93d0540d66b4dc31166f125cde9a36d87ac3e` | `1b3nCCYRjo5uMhu8ilEgAd4M08WP_6fvb` |
| 05_레퍼런스모션재현_v5_버벅/05_화면캡처_가지접목장면.png | 1,322,329 | `733ccc2acc78d6e8b90592f47899e4a2a3a91e18128817bc53f035873f808aa0` | `1wTJ1VsTQRR4Wu8ZnjZoTnQf2icDHNvlg` |
| 05_레퍼런스모션재현_v5_버벅/06_화면캡처_가지자르기장면.png | 1,423,019 | `7ea8852219cff2f0e500d037c627acf6fd5648eea22bfb84682baa43092950a2` | `1BV4u4dHjFpqNrz88pgRwdMrpEATm14Qy` |
| 05_레퍼런스모션재현_v5_버벅/07_화면캡처_하늘스크롤장면.png | 773,009 | `61d7388cdbc501d01931ce6294fe9862f4983fc3356b6ab1cea2b045a44607ec` | `1oocy_M5INmWvdoZn-NpbsHpL_Q9X2qtW` |
| 05_레퍼런스모션재현_v5_버벅/08_화면캡처_설계도장면.png | 1,296,317 | `0562b310454cc5dc8f9def0e543978f77cc2afd3649f5d49760ae8ccb885386c` | `1HUjGKipUohIztZZPUWL2aPgdo-HvIUv4` |
| 05_레퍼런스모션재현_v5_버벅/09_화면캡처_워크숍장면.png | 1,762,409 | `5ba4e8ca8775e783e19984e11fd751be79c7dc9f3dbf54a6d22f9cb4c0611e53` | `1RdIIO23OZKD6TygqEObLso7oiCSHGMZc` |
| 05_레퍼런스모션재현_v5_버벅/10_화면캡처_가지치기장면.png | 1,643,205 | `69405f9e72062fb895956a1052764b509dae8e882b8c66331e84287b74a36b62` | `1zE4sWrhTMIfkbe3jBepuNrBXiav9ZV3S` |
| 05_레퍼런스모션재현_v5_버벅/11_화면캡처_궤도메뉴.png | 1,457,348 | `5994675683160e1811cb8962e9d3e0003e1435998129a318f1dabf687ba3f3a5` | `16AugRrHzRFdMKXRbwcmVCjQK8W7hH4P3` |
| 05_레퍼런스모션재현_v5_버벅/12_화면캡처_별자리입력폼.png | 1,308,350 | `3e0ad1caf8af6f8b90ba033879ca05644ff0d9d0434aa542dd0445a632461b24` | `1WoP-formUY77TQAKWW1NoIgRc9mXGXHf` |
| 05_레퍼런스모션재현_v5_버벅/13_화면캡처_최종장면.png | 1,657,913 | `78bd9555bca660dae406a2b196c808a48721a2bce04fb4dafc173a56a3d28b54` | `1ayuYVRpXcDW-H_-aWS9PCKCgYdRmUnoH` |
| 05_레퍼런스모션재현_v5_버벅/14_화면캡처_메뉴오버레이.png | 1,351,084 | `9af8703a855b2fd6940a70f2ee8084d2204c52864333ee1cf02d1556ffc14306` | `1aSaKwrPHh_Cthd0KIA6zGjGmGz2zlS5u` |
| 10_이미지/048f836a-6fdc-44c8-808b-5c151814f173.png | 2,010,932 | `85215091a77d35a4884e63981c493142393d8ade6d74ab4844ef7a8bc15bba1f` | `1y1EwGMl-sjp5nJ-Yf0rqinP7osLgAqon` |
| 10_이미지/06_질문장면.png | 1,454,114 | `d05be69e48947d1bc9cf4a98ae285c1cbd49bb83d8fd60dd5a9a3c8e08b34799` | `1JefdfyK380jhUbhDu5CxZwsciVOxDo7Z` |
| 10_이미지/07_별자리장면.png | 1,390,332 | `9074fe10ab82f8b8f752291ec3acd35291210a6d452cb0c7f29cae418df56719` | `1QyFtzXlyJNFPm6c06FzV9XMhed-ZI27-` |
| 10_이미지/08_최종장면.png | 1,653,322 | `9e2400283a27c5dfca222cfd14c0fc84b2e5e3a41afccf9e0d55173ea3b5f9a5` | `1DbE9qEZR_osMa_WvXtw5V7F-90322W3b` |
| 10_이미지/0cf94fd3-4f05-4540-abda-1981fd3c56f3.png | 2,208,182 | `e81ee01d1e852a69e5330c111382b6bb570c4b325154f64c7c440e7ef59f3a42` | `1j-QGaBDMCbydwWn2qj_mDkIBuCWnWDlI` |
| 10_이미지/3a1fedd0-7a54-4dd6-ade7-75c8548073a8.png | 2,409,534 | `0b0c3d8992fd6c3e28115e462d3ecf292c8a8deec7ababf38b2702c6bf02bca2` | `1vRps8L2dFJc2Bq9MjiZD8dkGKf5DGZ1F` |
| 10_이미지/5e7c7b49-bb7a-4e4c-93da-aec19cfb0e5b.png | 2,241,700 | `4cfb89f358039c0339133b74b8082e974b079c269b98198a98e25a8cb2e4b1e8` | `1amI3i4trLqDqfTV6p0BPLE7ve4_ZnBPx` |
| 10_이미지/609bcc0a-e0b8-4f7b-a7cb-498ba8efd8aa.png | 2,177,310 | `0ae4fa26e77c062b2faa4c63f10b680c8c64e5b08b207ad983d522a45c68852e` | `1YfI9GWqEUk_fJuxIDdfdJkAoubPwQXPc` |
| 10_이미지/6a47ba83-cae7-42ca-80bd-1cce2c4caee3.png | 2,364,234 | `5c66e39be2d71616183f274f296b98156e9cc9c7c9a4320006a9d13168843ce6` | `15dBdVhtWuqfqvsXHezbSmByuhfs2QX8G` |
| 10_이미지/719d373a-c087-456c-bddc-43a36eac3f9d.png | 2,208,121 | `9918dbf56bd41150e304a0e3a31c54428c99a32ccebb419e6998f726f34299fd` | `1FbxLBbh-hGGvREU_8jQAru2JyEvbuyd2` |
| 10_이미지/7d4e7ed2-eff8-4b57-9de0-c14b8a734fcc.png | 2,153,464 | `231a782e7c2d609524009d42c66725580ec9aa5349b0f3b6e95ad1cbf0a786af` | `1GfGbTTTmH2r57vf5bnrhCTvi0rOnVTeb` |
| 10_이미지/88594e2b-bc50-4cf6-8df0-600c1b2391ed.png | 2,220,887 | `f8e1812f98476b45925284dc8a9c2c74db0c157ef8b35dd24f8d2054f18890d0` | `14EXvEsGJxH8eobXaCXzbd5f8HkkE3muU` |
| 10_이미지/8fd790f8-df89-48d8-b982-adbb6b383a73.png | 2,192,175 | `0e3a30c5c9cb82d8ba05db9ee4f3a77e42e86013a802b821d9ee643c2487b77e` | `1b-UhbANeKWnBiV6_Q4IvTVPQGNfAGa-c` |
| 10_이미지/94763b33-955d-4929-8fa8-ed60bbebfe79.png | 2,292,996 | `56a25696f120eaea2d0625dd6acc72f61ba4dd0f80a64e0f8eba5745ad74e3db` | `15Mjz253WYphtC_SlkMZcfFmlc-GO0E27` |
| 10_이미지/a10b6009-94f3-4554-9f44-5160e8e15b65.png | 2,653,824 | `4020d878c7d7e1d0570d479ce80b70d0ca5ca13231c02b0af5df0cf6e42a4aa2` | `1nRszIQfTQNnG47LaVOaHNyt8skrVwtak` |
| 10_이미지/af9c75ec-5af0-47a9-9b27-5e043449d09d.png | 2,195,789 | `f9b6de29389bea175feabf48a51e002bc61605b0883be90896f1f2b12776a0b2` | `1jO7zu7Rkl6TebCaLeIw3L3o1O-uRfyfn` |
| 10_이미지/b7c763d5-56a5-454e-a0b7-13f43e489ab4.png | 2,335,610 | `bdf0e0d326f0364adf068b71306efb382724011130001d3c2f4626d3f5e0eadf` | `1m8JAR8L8UWR5XYgux551QZw1VkNKs7dh` |
| 10_이미지/bea58a5f-8be5-4df0-8a6d-d7c476f9ae44.png | 2,503,977 | `3ef6f2526c7d15c22c03c5b0981f335a32a7d01633488e45e8588262dc2812f6` | `1W8Y5i-GR7o3raFHCgM19czFF_O1MC97-` |
| 10_이미지/c70da424-6b0b-4697-b4de-fd34928e149d.png | 2,534,936 | `fa0d339924ba7eb32111b6db7b7616bd0ae2ceeb6daa010484ec2d55e482ae59` | `1wq6mvPgv_69yY_1TXYi7pjd-Jmew0a5t` |
| 10_이미지/d3570baa-aaaf-4b6e-87c0-f45ec2ff468f.png | 2,141,581 | `dda5b68376b9fa26b32a149141d22b1b03957b56e73f00208281065bf6f74304` | `1D8SmWUMTMC3NoiLZS_sXyX9kE_KWOnJf` |
| 10_이미지/d4a7c1eb-0bad-459a-a95a-6f949c61a23c.png | 1,776,405 | `6429a1623633b5800cb892b0faea958f8d40b6aa2d61c80faa80e5bd592a20f7` | `1E0EyzuQ54_dv5e5dULSFdZBJhvXyxFUl` |
| 10_이미지/dc4d8eae-bf6b-4cd5-8b27-8c06b1c41c09.png | 2,432,724 | `d1404afb0776364c0d44b1889c39214e0978233d90c0f2773d89e12752b0c9a4` | `1FeD5sLgkCOouIVM3DNg5Lf1OGmSBg4Au` |
| 10_이미지/de167842-f60a-4aef-b5ac-db1538d7652b.png | 2,384,878 | `a9c4413da6fcd4328f13084e24a0d5069f8e5167df4170d82f4d4885b1c0ef7c` | `1dDb3xf3qBC68gsdUPT51tpkP86zMiR0d` |
| 10_이미지/de174525-d07a-48a8-b2c1-a39d350c4543.png | 2,547,514 | `ea30c012a505d56fa6e88a7346dfd3a3ae8bc3dcf87ef34a013e10a721a5e74f` | `1XmwyABpp6MHQqahAVek5wi8Sgv1JaK-R` |
| 10_이미지/e3ed089a-03a5-465a-a6be-b60111434bcf.png | 1,956,931 | `ba83614404d406f766c23b5776b4945eeb6d5027c27d755ab1af871f57e4e21a` | `15F-oeN5DJ8jFo1v886s-ueZyvByTrFqv` |
| 10_이미지/f8a35ff6-b231-4a85-982f-a3b5b6029b82.png | 2,216,550 | `4746d255f886ddbd33e5b38d27072302cd006a3a3d68517e0d2165b118032769` | `1b_QgY4tXrfHfCoI-_D87ohbVA2vctxWy` |

## Historical pins

No internal SHA256SUMS or hash-pin records exist anywhere in this folder — there is
nothing to reconcile fresh hashes against. Consequently **no mismatch OPEN flag is
raised**, but the same absence means QA evidence is not fingerprint-bound: any future
implementation work must first re-verify the authoritative executable against the pinned
V6 SHA-256 above (구현 전 재검증 요건).

## Duplicate objects (minor, image-only)

Two byte-identical image groups exist inside version folders (`00_대표미리보기.png` =
최종장면 capture in `04_레퍼런스충실도_v3` and `05_레퍼런스모션재현_v5_버벅`). Both copies
are excluded from commit by the size policy and carry per-path fingerprints; no committed
artifact is affected, so this is recorded as an observation rather than a blocking flag.

## Open gates

| Gate | State | Blocking condition |
|---|---|---|
| Instruction / design-lead classification | PENDING | no 작업지시 in folder; motion-analysis notes only |
| Product-owner decision | PENDING | none recorded in folder |
| QA-to-fingerprint binding | OPEN | PASS result has no target hash — re-verify against pinned V6 before implementation |
| Lineage number | HOLD | requires closed classification + owner decision (#80) |
| Adoption / V4 placement | HOLD | requires closed classification |
| Withheld binary transfer | WITHHELD | 57 files under #287 cap; approved exception needed if ever required |
| Native intake | NOT STARTED | full sequence below |

Correct sequence (per #80 continuous-intake rules):

```text
design-lead classification/adoption decision
→ lineage-number review (explicit allocation only)
→ adoption decision
→ only then: re-run source QA bound to pinned V6 fingerprint
→ exact fingerprint → repository native intake/proving
```

## Repository disposition

```text
SOURCE_TRACK_40_INTAKE      = RECORDED (preservation gate complete)
PRESERVED_EVIDENCE          = reference/source-track-40-goldenfruit/
                              (12 committed files + SHA256SUMS; 57 withheld fingerprints
                               in this doc and as PENDING manifest entries)
LINEAGE40_RESERVATION       = HOLD (no repository lineage number allocated)
CANONICAL_V4_ADOPTION       = NO
BACKEND_SCOPE               = NONE (no DB/API/Auth/Firebase/Neon/Worker work implied)
IMPLEMENTATION_RELEASE      = NO
```

Registration-only lane: implementation start, inventory-file contact, lineage-number
reservation and Drive-original modification are forbidden for Issue #340.
