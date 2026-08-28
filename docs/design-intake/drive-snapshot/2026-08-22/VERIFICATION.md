# Drive 채택본 스냅샷 무결성 재검증 — 2026-08-22

- Refs: #284 (기준 스냅샷: `2026-08-21/`, 병합 PR #287) · #80 · #173
- 성격: **읽기 전용 재검증 기록**. 신규 보존 파일 0건, 기존 베이스라인 수정 0건.
- 검증 기준 HEAD: `0f4b53a2` (origin/main) · 실행 환경: WSL 네이티브 워크트리 (ext4, `$HOME/worktrees/**`)

## 1. 검증 방법

- Drive 원본: `padiemipu:[[지피티 작업]]/[01_러브트리]/03_디자인채택본` (Google Drive)
- 도구: rclone v1.60.1 (WSL 네이티브), 서버사이드 네이티브 MD5 (`rclone hashsum MD5`)
- 다운로드 없는 메타데이터·해시 조회만 수행 — Drive 원본 불변 (read-only)
- 비교 대상: `docs/design-intake/drive-snapshot/2026-08-21/MD5SUMS-full-tree.txt` (병합 베이스라인)

## 2. 결과

| 항목 | 결과 |
|---|---|
| Drive 전체 트리 재스캔 | **5,334파일** — 정렬 매니페스트 diff 0행 |
| 드리프트 | **제로** (추가 0 / 삭제 0 / 변경 0) |
| 레포 보존분 SHA256 (`sha256sum -c`, 기준 `2026-08-21/SHA256SUMS.txt`) | **70/70 통과** |

결론: 2026-08-21 병합 스냅샷(PR #287)은 2026-08-22 기준으로도 유효한 삭제·변조 감지 기준선이다.
이슈 #284의 산출물(경량 인덱스 + HTML 선별 보존)은 이미 main에 존재하며 본 재검증으로 무결성이 확인되었다.

## 3. 제약 준수 (본 재검증 실행 기준)

| 제약 | 준수 |
|---|---|
| Drive 원본 read-only 절대 불변 | 예 — 조회 전용 |
| 영상·대형 미디어(>5MB) 제외 | 예 — 신규 저장 0건 |
| 기존 수입 계열(Track18·47·55·56·59~64·66~68) 중복 저장 회피 | 예 — 본 실행 신규 저장 0건 |
| Lineage 63 / #191 접촉 금지 | 예 — 63 관련 파일의 개별 열람·보존·출력 없음. 트리 일치 판정은 병합 베이스라인 매니페스트와의 범위 동일 비교로만 수행 |

## 4. 관찰 — CTO 결정 필요 (본 PR에서 조치하지 않음)

PR #287은 기존 수입 계열 중 일부를 `old/reference/source-tracks-snapshot/`에 물리 중복 저장했다.
이번 실행 제약("중복 저장 회피")과 충돌하나, **이미 병합된 콘텐츠의 제거는 본 PR 범위가 아니며,
제거 시 `2026-08-21/SHA256SUMS.txt` 정합성(70파일 기준선)이 깨지므로 별도 결정·설계가 필요하다.**

| 트랙 | 중복 저장 dir (합계 7,473,005 bytes ≈ 7.1 MiB) | 기존 수입 위치 |
|---|---|---|
| 18 | `old/reference/source-tracks-snapshot/18_메모리코어_전기오로라/` (39,680 B) | `public/design-lab-assets/source-tracks/18/` |
| 55 | `old/reference/source-tracks-snapshot/55_자유연결_경로편집/` (55,456 B) | `old/reference/lineage-55-moonlit-blossom-v1/` |
| 56 | `old/reference/source-tracks-snapshot/56_세로형_모먼트관계망_전체조망/` (45,893 B) | `old/reference/lineage-56-crystal-memory-atelier-v3/` |
| 59 | `old/reference/source-tracks-snapshot/59_메모리스케치북_페이지여정/` (120,740 B) | `docs/lineage-59/` |
| 60 | `old/reference/source-tracks-snapshot/60_3D모먼트클러스터_심층탐색_55,56,59연결버전/` (55,424 B) | `design-intake/manifests/track-60-3d-moment-cluster.json` |
| 61 | `old/reference/source-tracks-snapshot/61_감정경로_연결검토실/` (509,149 B) | `old/reference/design-intake/track-61-guided-next-moment-builder/` |
| 64 | `old/reference/source-tracks-snapshot/64_부유모먼트_웰컴오빗_입장포털O/` (1,565,399 B) | `design-intake/manifests/track-64-floating-moment-entry-portal.json` |
| 66 | `old/reference/source-tracks-snapshot/66_첫트리만들기_인터랙티브스크롤가이드/` (167,138 B) | `design-intake/manifests/track-66-first-journey-v1-2.json` |
| 67 | `old/reference/source-tracks-snapshot/67_메모리테이프_인터랙티브롤/` (4,914,126 B) | `public/design-lab-assets/lineages/67/v2-4/` |

비고: Track 47·68은 #287에서 이미 링크만 처리(중복 없음), Track 62는 >5MB로 index-only, Track 63은 보호구역(미보존).

## 5. 재현 방법

```bash
# WSL 네이티브 워크트리에서 (read-only)
rclone hashsum MD5 --output-file /tmp/rescan.md5 \
  "padiemipu:[[지피티 작업]]/[01_러브트리]/03_디자인채택본"
sort /tmp/rescan.md5 > /tmp/rescan.sorted
sort docs/design-intake/drive-snapshot/2026-08-21/MD5SUMS-full-tree.txt > /tmp/baseline.sorted
diff /tmp/baseline.sorted /tmp/rescan.sorted   # 0행 = 제로 드리프트

cd old/reference/source-tracks-snapshot
sha256sum -c ../../docs/design-intake/drive-snapshot/2026-08-21/SHA256SUMS.txt --quiet
```
