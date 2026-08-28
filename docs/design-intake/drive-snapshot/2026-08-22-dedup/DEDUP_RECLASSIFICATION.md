# Drive 스냅샷 수입계열 중복 재분류 원장 — blob-OID 실측 (2026-08-22)

- Refs: #284 (기준 스냅샷 `2026-08-21/`, PR #287) · #344 판정안 ④ 정정 및 B안 승인 ([issuecomment-5377636882](https://github.com/skerishKang/lovetree-limone/issues/344#issuecomment-5377636882)) · `../2026-08-22/VERIFICATION.md` (kilo-2)
- Lane: kilo-8 (이중객체/provenance 정밀)
- 성격: **읽기 전용 분류 정정 문서.** 파일 삭제·수정·이동 0건. 기존 베이스라인(`2026-08-21/*`) 무접촉.
- 검증 기준 HEAD: `b072134e80d23b89ed94c021b820edc8466c934c` (origin/main)
- 실행 환경: Windows 네이티브 레인 워크트리 (docs-only, CTO 승인 하 — WSL/Windows dual-track regime 참조). 실측은 공유 루트에서 `git ls-tree`로 **origin/main 개체 데이터베이스를 직접 조회**한 것으로 작업트리 스캔 아님.

## 1. 목적

kilo-2 VERIFICATION.md §4가 보고한 "수입계열 9종 물리중복(~7.1 MiB)"은 **경로 기준** 분류였다.
본 원장은 동일 9종을 **바이트 수준(blob-OID)** 으로 재분류하여 B안(전량 유지) 결정의 근거를 고정하고,
향후 중복 판정 기준을 규정한다.

## 2. 방법

1. `old/reference/source-tracks-snapshot/` 대상 9 디렉터리(18파일)의 blob OID·바이트수를 `git ls-tree -r -l origin/main`으로 추출
2. origin/main **전체 트리**(2,320 엔트리)를 대상으로 동일 OID 조인 — git content-addressable 저장소 특성상 동일 OID = 바이트 완전 동일
3. SHA256은 마스터 기준선 `2026-08-21/SHA256SUMS.txt`(70엔트리)의 핀 값을 인용
4. "기존 수입 위치"의 페이로드 존재 여부는 해당 위치의 ls-tree 크기 분포로 실측

## 3. 재분류 결과

총계 실측: 9 디렉터리 · 18파일 · **7,473,005 B** (kilo-2 표의 7,473,005 B와 일치)

### 3.1 진짜 중복 4종 — 트리 내 쌍둥이 존재 (디렉터리 합계 777,636 B ≈ 0.74 MiB)

| 트랙 | 스냅샷 파일 | 크기(B) | SHA256 (마스터 핀) | blob OID | 동일 사본 위치 (전수 조인 실측) |
|---|---|---|---|---|---|
| 55 | `55_자유연결_경로편집/★_최종선택_55_LUPT_자유연결_V1.2_바로보기.html` | 55,327 | `768a49f64da8621fc357a90401baa8f870351a6d27e58dc4d43dab89e80094bd` ★ | `1a9dcc6c60d7ca92f37c85b6488ab8958409d775` | `old/reference/source-track-55-lupt/★_최종선택_55_LUPT_자유연결_V1.2_바로보기.html` 외 계열 2곳 + `old/reference/source-track-69-fullviewport-portfolio/선택-D_V3_EXACT_SOURCE_MULTI_TEMPLATE_PORTAL/works/05_free_connection.html` (계 4곳) |
| 56 | `56_세로형_모먼트관계망_전체조망/후보_버전1.2_세로형_모먼트관계망_전체조망.html` | 45,761 | `1828ef47acefd25f1f2b7cff0a3f58c74aa35e28bf127f41975491dcc156d909` | `c715695cfb56ad2472496bd3e33d633a06d042de` | `old/reference/source-track-56-vertical-moment-network/후보_버전1.2_세로형_모먼트관계망_전체조망.html` |
| 61 | `61_감정경로_연결검토실/현재후보.html` | 509,063 | `834fb634de5e039f95522a427f2ca20f0ed34d3c773bafbb51ced1ae14a43abe` | `1dd96291c9c1c108786b8cde4d5822d0b7fc89d0` | `old/reference/source-track-69-fullviewport-portfolio/선택-D_V3_EXACT_SOURCE_MULTI_TEMPLATE_PORTAL/works/04_connection_review.html` |
| 66 | `66_첫트리만들기_인터랙티브스크롤가이드/버전1.2_제품목적·실제Moment체험강화_후보/현재후보.html` | 166,996 | `b50e16984774f3284be38b2b8609fd0a6d7ca9f3d51e3ce5bcd910995911ffc6` | `02ab6bff18f14615d9c58ba853dcfab384318f80` | `old/reference/source-track-69-fullviewport-portfolio/선택-D_V3_EXACT_SOURCE_MULTI_TEMPLATE_PORTAL/works/03_first_tree.html`

콘텐츠 순합계 777,147 B + 상기 4개 디렉터리의 `SHA256SUMS.txt` 489 B = 777,636 B.

### 3.2 단일 물리사본 5종 — 쌍둥이 부재, 유일 보관처 (콘텐츠 합계 6,694,720 B ≈ 6.4 MiB)

| 트랙 | 스냅샷 파일 | 크기(B) | SHA256 (마스터 핀) | blob OID | "기존 수입 위치" 실측 결과 |
|---|---|---|---|---|---|
| 18 | `18_메모리코어_전기오로라/01_메모리코어_전기오로라_v1.html` | 39,569 | `8c46647d2d2a573d87484cbf2c3ad532f57a32c1742cf252be83029cf6025d7b` | `a845e309d660394ea1d898cb720a7ad5623b1154` | `public/design-lab-assets/source-tracks/18/`는 PNG 자산만 보유(cyber-01~06.png) — HTML 페이로드 없음 |
| 59 | `59_메모리스케치북_페이지여정/버전4_캐릭터실자산_최신후보/현재후보.html` | 120,614 | `85fecda2339f2e8287daf09bbd8572d8ca568bb2ff536a6e6599e30078c45916` | `2f14ad554f77a53e053c66aaa7a928cbd8859708` | `docs/lineage-59/`는 문서 위치 — HTML 없음 |
| 60 | `60_3D모먼트클러스터_심층탐색_55,56,59연결버전/버전1.2_실제트랙네비게이션_후보/★_현재후보_Track60_V1.2_REAL_NAVIGATION.html` | 55,260 | `c35b66fb46b57958f7f52c7506ce20e467302f4bcf43b55001428d5d525a7fdf` | `ccdeb66a1e582558e732d5f263f99cf21909eed5` | `design-intake/manifests/track-60-3d-moment-cluster.json` 메타데이터만 |
| 64 | `64_부유모먼트_웰컴오빗_입장포털O/현재후보.html` | 1,565,313 | `80886540bb8e3148a7336bf9999298897ac0ab921797a6534c89ea0029c6de5d` | `59d40da9708c0c88756f37d291f0de30633d1868` | `design-intake/manifests/track-64-floating-moment-entry-portal.json` 메타데이터만 |
| 67 | `67_메모리테이프_인터랙티브롤/05_V2.4_PERSISTENT_WORLD_WORKS_NAVIGATION/track67_v2.4_persistent_world_works_navigation.html` | 4,913,964 | `3733d39d18d86689f0fcea5fb4fe96388a938ca672b785281b69c368fb5463cd` | `cbf6f6948009f6598afdc74e53f166f5eab5367b` | `public/design-lab-assets/lineages/67/v2-4/`는 PNG 자산만 보유(M01~M06…) — 4.9MB HTML 없음 |

이 5종은 kilo-2 §4 표의 "기존 수입 위치"에 **동일 바이트가 존재하지 않는다**. 해당 위치는 제품 편입 자산(PNG) 또는 매니페스트 메타데이터만 보유하며, 실행 가능한 원본 HTML 페이로드의 라이브 트리 내 유일 보관처가 `old/reference/source-tracks-snapshot/`이다.

### 3.3 디렉터리별 `SHA256SUMS.txt` 9종 (합계 1,138 B)

고유 blob(자기 디렉터리 상대경로를 담아 구조적으로 유일)이나 재생성 가능한 메타데이터. 단, 게이트 문서가 스냅샷 사본 경로와 그 `SHA256SUMS.txt`를 증거 앵커로 핀하는 사례(#46·#51 게이트 — 본 9종 범위 밖)가 있으므로, 앵커 운반체로서의 가치는 존재한다.

## 4. 구속조건 (실측 확정)

1. 마스터 기준선 `2026-08-21/SHA256SUMS.txt`(70엔트리)가 9개 콘텐츠 파일 **전부**를 핀 — 어떤 제거도 `sha256sum -c` 70파일 검증 계약을 파손한다.
2. 55 핀 해시 `768a49f64da8621fc357a90401baa8f870351a6d27e58dc4d43dab89e80094bd`는 **#317/#285 Track55 LUPT 선택채택의 provenance 근거 해시 그 자체**다.
3. 참조자 스캔: `source-tracks-snapshot` 경로를 참조하는 코드·워크플로 소비자 0건(문서·매니페스트만).
4. git 이력상 blob은 제거 후에도 보존되나, 라이브 트리 상실은 위 1·2의 fail-closed 검증·앵커 체계를 즉시 깨뜨린다.

## 5. 결정 (CTO B안 승인, 2026-08-22)

- **전량 유지 — 제거 0건.** 6.4 MiB(89%)는 보존 계약상 삭제 불가한 유일 사본이고, 잔여 진짜 중복 0.74 MiB를 위해선 70엔트리 기준선 파손 + 매니페스트 세대 교체 + #317 앵커 리스크를 감수해야 하므로 손익이 성립하지 않는다.
- **향후 중복 판정 기준:** 경로 나열이 아닌 **blob-OID 전수 조인**을 원칙으로 한다. ("N종 물리중복" 표기 시 바이트 동일성 입증을 수반)
- 본 문서는 분류 정정만 수행하며, 신규 매니페스트 발행·기존 베이스라인 변경은 하지 않는다. 재판정 트리거가 될 경우에만 별도 이슈에서 A안(부분 정리, 55·56·61·66 한정 + 매니페스트 세대 교체 절차)을 재개할 수 있다.

## 6. 재현 방법 (read-only)

```bash
# 1) 대상 18파일의 OID·크기 추출
git ls-tree -r -l origin/main -- old/reference/source-tracks-snapshot/<9디렉터리>

# 2) 전체 트리 OID 맵과 조인 → 동일 OID 개수 집계
git ls-tree -r -l origin/main   # 전수 (2,320 엔트리)

# 3) 마스터 기준선 핀 값 대조
git show origin/main:docs/design-intake/drive-snapshot/2026-08-21/SHA256SUMS.txt

# 4) 기준선 유효성 (변경 없음을 재확인)
cd old/reference/source-tracks-snapshot && sha256sum -c ../../docs/design-intake/drive-snapshot/2026-08-21/SHA256SUMS.txt --quiet
```
