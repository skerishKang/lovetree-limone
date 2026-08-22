# WSL 워크트리 소진 대장 — 2026-08-22

- 원장: #344 (디스패치: [DISPATCH — kilo-2] WSL 워크트리 대장 소진 착수)
- 성격: **read-only 조사 산출**. worktree prune/remove, stash drop 등 상태 변경 일절 없음. 철거 실행은 별도 CTO 결재.
- 조사 기준: origin/main `531e12b` · 측정일 2026-08-22
- 범위: `/root/worktrees/**` 등록 워크트리 60건 + 메인 체크아웃 stash 2건 = **62건**
- 용량 열: du 실측(node_modules/.next 제외 base값). `보유(+~1.0GB)` 행은 철거 시 node_modules 추가 회전(전체실측 샘플 3건 기준 대표값 ~1.05GB).

## 분류 요약

| 분류 | 건수 | base 합계 | 비고 |
|---|---|---|---|
| HOLD-FROZEN (접촉 금지) | 3 | 0.18GB + stash@{1} | lovetree-258-pr263(#258) · lovetree-lineage-63(#164/#191) · stash@{1}(#258 WIP) |
| 폐기 보류(더티 — 산출물 확인 필요) | 3 | 1.34GB | kilo9-issue307은 Track50 소스 762MB 미추적 보유 |
| 폐기 후보(무손실 — 병합됨·archive 보존) | 24 | ~7.4GB | HEAD가 origin/main 흡수 또는 origin/archive·원격 브랜치 보존 확인 |
| 폐기 후보(원격 보존 — 푸시됨·미병합) | 29 | ~3.4GB | open PR 없음 전수 확인. salvage/forensics 계열은 origin 동명 브랜치로 증거 보존 중 |

## Frozen 접촉 금지 항목 (폐기 후보에서 제외)

1. `lovetree-258-pr263` (#258 관련) — local/258-remove-native-debug @ 4c993fb
2. `lovetree-lineage-63` (#164/#191 관련) — feat/lineage-63-native-proving-164 @ 4b0a854 (**PR #191 head**)
3. `stash@{1}` (#258 관련) — WIP on feat/258-lineage67-v242-package-transfer @ 505a89f (NativeRenderer.tsx +161행 등)

## 대장 (62행)

| 경로 | 브랜치·HEAD | node_modules | du(base) | 폐기 후보 분류 · 근거 |
|---|---|---|---|---|
| /root/worktrees/kilo9-issue307 | feat/307-track50-dream-memory-gate @ `22b811a` | 보유(+~1.0GB) | 1.23 GB | 폐기 보류(더티) — 미추적 120파일 = Track50 소스 762MB — 산출물 확인 필요 |
| /root/worktrees/lovetree-pr156 | feat/v4-orbit-canonical-selection-155 @ `9f62f48` | 보유(+~1.0GB) | 0.07 GB | 폐기 보류(더티) — dirty 1건 경미 — 확인 후 폐기 가능 |
| /root/worktrees/pr241-security | chore/67-runtime-e2e-current-main-closure @ `e3ba96f` | 보유(+~1.0GB) | 0.04 GB | 폐기 보류(더티) — dirty 1건 경미 — 확인 후 폐기 가능 |
| /root/worktrees/ab-main-be0536d | (detached) @ `be0536d` | 없음 | 1.08 GB | 폐기 후보(무손실) — detached — main 병합 조상 |
| /root/worktrees/diag-main-cf0ac9 | (detached) @ `cf0ac9f` | 없음 | 1.09 GB | 폐기 후보(무손실) — detached — main 병합 조상 |
| /root/worktrees/fix-mobile-gateway-design-lab-overflow | fix/mobile-gateway-design-lab-overflow @ `9bc2974` | 보유(+~1.0GB) | 0.29 GB | 폐기 후보(무손실) — HEAD가 origin/main에 흡수됨 |
| /root/worktrees/kilo-issue284-verify | feat/284-drive-snapshot-refresh @ `9375109` | 없음 | 0.49 GB | 폐기 후보(무손실) — HEAD가 origin/main에 흡수됨(PR #353 병합) |
| /root/worktrees/kilo10-issue293 | feat/293-legacy-archive-proposal @ `36705f1` | 보유(+~1.0GB) | 0.19 GB | 폐기 후보(무손실) — HEAD가 origin/main에 흡수됨 |
| /root/worktrees/kilo10-issue302 | feat/302-track44-handopen-memory-gate @ `f26b912` | 보유(+~1.0GB) | 0.42 GB | 폐기 후보(무손실) — HEAD가 origin/main에 흡수됨 |
| /root/worktrees/kilo10-issue310 | feat/310-track58-living-memory-pinboard-gate @ `146414a` | 보유(+~1.0GB) | 0.51 GB | 폐기 후보(무손실) — HEAD가 origin/main에 흡수됨 |
| /root/worktrees/kilo10-issue343b | feat/343b-entry-band-switcher @ `1a8be80` | 없음 | 0.45 GB | 폐기 후보(무손실) — HEAD가 origin/main에 흡수됨 |
| /root/worktrees/kilo9-issue292 | feat/292-ci-concurrency-audit @ `39f1781` | 보유(+~1.0GB) | 0.19 GB | 폐기 후보(무손실) — HEAD가 origin/main에 흡수됨 |
| /root/worktrees/kilo9-issue320 | fix/320-workflow-concurrency @ `d966f52` | 보유(+~1.0GB) | 0.45 GB | 폐기 후보(무손실) — HEAD가 origin/main에 흡수됨 |
| /root/worktrees/kilo9-issue328 | fix/328-track41-video-byte-removal @ `d30d740` | 보유(+~1.0GB) | 0.42 GB | 폐기 후보(무손실) — HEAD가 origin/main에 흡수됨 |
| /root/worktrees/lovetree-258-pr263 | local/258-remove-native-debug @ `4c993fb` | 보유(+~1.0GB) | 0.11 GB | **HOLD-FROZEN(#258)** — 폐기 후보 제외 |
| /root/worktrees/lovetree-claude-review | (detached) @ `d1ae566` | 보유(+~1.0GB) | 0.15 GB | 폐기 후보(무손실) — detached — HEAD 원격 보존 확인 |
| /root/worktrees/lovetree-gemini-forensic | (detached) @ `d1ae566` | 없음 | 0.15 GB | 폐기 후보(무손실) — detached — HEAD 원격 보존 확인 |
| /root/worktrees/lovetree-glm2-244-track68 | feat/244-track68-source-compare-glm2 @ `6f9e093` | 보유(+~1.0GB) | 0.16 GB | 폐기 후보(무손실) — HEAD가 origin/main에 흡수됨 |
| /root/worktrees/lovetree-limone-src65-v22 | feat/source-track-65-v2-2-ownerpick-storyreorder-gate @ `af8b279` | 없음 | 0.33 GB | 폐기 후보(무손실) — HEAD가 origin/main에 흡수됨 |
| /root/worktrees/lovetree-lineage-56-fast-closure | feat/lineage-56-fast-closure @ `e2ebed9` | 보유(+~1.0GB) | 0.04 GB | 폐기 후보(무손실) — HEAD가 origin/main에 흡수됨 |
| /root/worktrees/lovetree-lineage-57-fast-closure | (detached) @ `eb915bf` | 보유(+~1.0GB) | 0.04 GB | 폐기 후보(무손실) — detached — HEAD 원격 보존 확인 |
| /root/worktrees/lovetree-lineage-58-fast-closure | feat/lineage-58-fast-closure @ `cbe1997` | 보유(+~1.0GB) | 0.05 GB | 폐기 후보(무손실) — HEAD가 origin/main에 흡수됨 |
| /root/worktrees/lovetree-main-baseline-0617 | (detached) @ `06dfb7e` | 보유(+~1.0GB) | 0.03 GB | 폐기 후보(무손실) — detached — HEAD 원격 보존 확인 |
| /root/worktrees/lovetree-pr139-main | (detached) @ `06dfb7e` | 보유(+~1.0GB) | 0.03 GB | 폐기 후보(무손실) — detached — HEAD 원격 보존 확인 |
| /root/worktrees/lovetree-pr150 | ci/design-fidelity-validation-orchestration @ `42a943d` | 보유(+~1.0GB) | 0.02 GB | 폐기 후보(무손실) — HEAD가 origin/main에 흡수됨 |
| /root/worktrees/lovetree-t67-merge-239 | feat/231-lineage67-v24-current-source @ `6031c7c` | 보유(+~1.0GB) | 0.09 GB | 폐기 후보(무손실) — HEAD가 origin/main에 흡수됨 |
| /root/worktrees/lovetree-track47-comp1 | feat/234-track47-v425-entry-candidate @ `a0ae1c6` | 보유(+~1.0GB) | 0.12 GB | 폐기 후보(무손실) — HEAD가 origin/main에 흡수됨 |
| /root/worktrees/lovetree-track68-harness-stability | fix/track68-v332-harness-stability @ `78172a9` | 보유(+~1.0GB) | 0.29 GB | 폐기 후보(무손실) — HEAD가 origin/main에 흡수됨 |
| /root/worktrees/pr150-attr | pr150-attr @ `2c72c77` | 보유(+~1.0GB) | 0.03 GB | 폐기 후보(무손실) — HEAD가 origin/main에 흡수됨 |
| /root/worktrees/pr251-merge-forward | fix/67-runtime-e2e-runner-clean-replacement @ `554a370` | 보유(+~1.0GB) | 0.29 GB | 폐기 후보(무손실) — HEAD가 origin/main에 흡수됨 |
| /root/worktrees/ab-pr188-c63de4d | (detached) @ `c63de4d` | 없음 | 1.08 GB | 폐기 후보(무손실) — origin/archive/ab-pr188 보존 확인 |
| /root/worktrees/diag-pr-c15cd97 | (detached) @ `c15cd97` | 보유(+~1.0GB) | 0.07 GB | 폐기 후보(무손실) — origin/archive/diag-pr-c15cd97 보존 확인 |
| /root/worktrees/kilo2-issue67 | salvage/kilo2-issue67-evidence @ `4f8f8a9` | 보유(+~1.0GB) | 0.30 GB | 폐기 후보(원격 보존) — origin/salvage/kilo2-issue67-evidence 존재, 커밋 무손실 |
| /root/worktrees/lovetree-193-network-stub | ci/193-v4-moments-100-network-stub @ `ad4846f` | 보유(+~1.0GB) | 0.07 GB | 폐기 후보(원격 보존) — 원격 브랜치 존재·open PR 없음 |
| /root/worktrees/lovetree-263-post272-synthetic | (detached) @ `2f0a7b4` | 보유(+~1.0GB) | 0.22 GB | 폐기 후보(무손실) — detached — HEAD 원격 보존 확인(origin/salvage/263-post272-workflow-wip 계열) |
| /root/worktrees/lovetree-a-track-20260814 | salvage/a-track-p0-wip @ `afba4ed` | 보유(+~1.0GB) | 0.07 GB | 폐기 후보(원격 보존) — origin/salvage/a-track-p0-wip 존재, 커밋 무손실 |
| /root/worktrees/lovetree-first-create-204 | feat/204-first-create-client-seam @ `d8f5587` | 보유(+~1.0GB) | 0.07 GB | 폐기 후보(원격 보존) — 원격 브랜치 존재·open PR 없음 |
| /root/worktrees/lovetree-graph-whynext-208 | feat/mvp-workspace-graph-why-next-208 @ `6f34b98` | 보유(+~1.0GB) | 0.07 GB | 폐기 후보(원격 보존) — 원격 브랜치 존재·open PR 없음 |
| /root/worktrees/lovetree-lineage-56-crystal-memory-atelier-v3 | salvage/l56-crystal-qa-script @ `ef0b9ae` | 보유(+~1.0GB) | 0.03 GB | 폐기 후보(원격 보존) — origin/salvage/l56-crystal-qa-script 존재, 커밋 무손실 |
| /root/worktrees/lovetree-lineage-61-v1-7 | feat/lineage-61-v1-7-native-proving-158 @ `b1cb078` | 보유(+~1.0GB) | 0.07 GB | 폐기 후보(원격 보존) — 원격 브랜치 존재·open PR 없음 |
| /root/worktrees/lovetree-lineage-63 | feat/lineage-63-native-proving-164 @ `4b0a854` | 보유(+~1.0GB) | 0.07 GB | **HOLD-FROZEN(#164/#191)** — PR #191 head, 접촉 금지 |
| /root/worktrees/lovetree-local2-279-track68 | salvage/local2-279-track68-forensics @ `3dc8aba` | 보유(+~1.0GB) | 0.29 GB | 폐기 후보(원격 보존) — origin/salvage/local2-279-track68-forensics 존재, 커밋 무손실 |
| /root/worktrees/lovetree-mvp-audit-201 | feat/67-runtime-e2e-journey-runner @ `5393a4d` | 보유(+~1.0GB) | 0.09 GB | 폐기 후보(원격 보존) — 원격 브랜치 존재·open PR 없음 |
| /root/worktrees/lovetree-overview-truth-222 | salvage/overview-truth-222-firstcreate @ `cc7c50b` | 보유(+~1.0GB) | 0.07 GB | 폐기 후보(원격 보존) — origin/salvage/overview-truth-222-firstcreate 존재, 커밋 무손실 |
| /root/worktrees/lovetree-p0-backend-202 | test/backend-p0-first-memory-atomic-202-clean @ `1616b9b` | 보유(+~1.0GB) | 0.07 GB | 폐기 후보(원격 보존) — 원격 브랜치 존재·open PR 없음 |
| /root/worktrees/lovetree-p2-ordered-frame-183 | feat/p2-ordered-frame-core-183 @ `4f8425f` | 보유(+~1.0GB) | 0.07 GB | 폐기 후보(원격 보존) — 원격 브랜치 존재·open PR 없음 |
| /root/worktrees/lovetree-p2-videofigure-187 | feat/p2-videofigure-consumer-wiring-187 @ `3ac8c52` | 보유(+~1.0GB) | 0.07 GB | 폐기 후보(원격 보존) — 원격 브랜치 존재·open PR 없음 |
| /root/worktrees/lovetree-p3-transport | feat/p3-transport-authority-core-185 @ `f1be25e` | 보유(+~1.0GB) | 0.07 GB | 폐기 후보(원격 보존) — 원격 브랜치 존재·open PR 없음 |
| /root/worktrees/lovetree-p4-orbit-wiring | feat/p4-orbit-consumer-wiring-181 @ `6d7c856` | 보유(+~1.0GB) | 0.07 GB | 폐기 후보(원격 보존) — 원격 브랜치 존재·open PR 없음 |
| /root/worktrees/lovetree-p8-exact-asset-200 | test/p8-exact-asset-consumer-selection-200 @ `6c3b798` | 보유(+~1.0GB) | 0.04 GB | 폐기 후보(원격 보존) — 원격 브랜치 존재·open PR 없음 |
| /root/worktrees/lovetree-pr139-candidate | (detached) @ `0007a2f` | 보유(+~1.0GB) | 0.03 GB | 폐기 후보(무손실) — detached — HEAD 원격 보존 확인 |
| /root/worktrees/lovetree-pr212-forensic | forensics/pr212-red-extraction-20260815 @ `393a213` | 보유(+~1.0GB) | 0.07 GB | 폐기 후보(원격 보존) — origin/forensics 동명 브랜치 존재, 커밋 무손실 |
| /root/worktrees/lovetree-timeline-whynext-208 | feat/mvp-workspace-timeline-why-next-208 @ `0a90710` | 보유(+~1.0GB) | 0.07 GB | 폐기 후보(원격 보존) — 원격 브랜치 존재·open PR 없음 |
| /root/worktrees/lovetree-track47-v425 | salvage/track47-v425-wip @ `374754b` | 보유(+~1.0GB) | 0.07 GB | 폐기 후보(원격 보존) — origin/salvage/track47-v425-wip 존재, 커밋 무손실 |
| /root/worktrees/lovetree-track59-truth | fix/track59-manifest-truth-p0-correction @ `350cf37` | 보유(+~1.0GB) | 0.07 GB | 폐기 후보(원격 보존) — 원격 브랜치 존재·open PR 없음 |
| /root/worktrees/lovetree-track62-truth | fix/track62-manifest-truth-p0 @ `af6fe2e` | 보유(+~1.0GB) | 0.07 GB | 폐기 후보(원격 보존) — 원격 브랜치 존재·open PR 없음 |
| /root/worktrees/lovetree-track63-truth | fix/track63-manifest-truth-p0 @ `7ed6b01` | 보유(+~1.0GB) | 0.07 GB | 폐기 후보(원격 보존) — 원격 브랜치 존재·open PR 없음 |
| /root/worktrees/lovetree-track64-165 | feat/lineage-64-v1-2-1-native-proving-165 @ `c4dd700` | 보유(+~1.0GB) | 0.07 GB | 폐기 후보(원격 보존) — 원격 브랜치 존재·open PR 없음 |
| /root/worktrees/lovetree-track64-reintake | chore/track64-v1-2-1-current-reintake @ `83ee0a2` | 보유(+~1.0GB) | 0.07 GB | 폐기 후보(원격 보존) — 원격 브랜치 존재·open PR 없음 |
| /root/worktrees/lovetree-track66-journey-v12 | feat/204-first-journey-client-wiring @ `d18e687` | 보유(+~1.0GB) | 0.07 GB | 폐기 후보(원격 보존) — 원격 브랜치 존재·open PR 없음 |
| (메인 체크아웃 stash) | stash@{1} — WIP on feat/258-lineage67-v242-package-transfer @ `505a89f` | - | - | **HOLD-FROZEN(stash)** — #258 관련 WIP(NativeRenderer.tsx +161행), 폐기 후보 제외 |
| (메인 체크아웃 stash) | stash@{0} — WIP on (no branch) @ `c46135e` | - | - | 참고(비Frozen) — #173 shadow 관련 tests 1파일 WIP. Frozen 미지정이나 보존 권고 |

## 문서화 방식 택일 및 근거

**선택: Draft PR(본 문서) + #344 요약 링크 게시**

근거:
1. 62행 전문 표는 단일 원장 이슈 코멘트에 부적합한 길이 — 원장 가독성 훼손 방지
2. 본 대장은 향후 순차 철거 실행 시 체크리스트·증거 문서로 재사용됨 — 레포 영속 보관이 운영상 적절
3. #344에는 요약+링크만 귀결 게시하여 "단일 원장" 원칙과 추적성을 동시 충족

## 방법론

- 워크트리 목록/브랜치/HEAD: `git worktree list --porcelain` 실측
- 더티: `git status --porcelain` 건수 실측
- 병합 여부: `git merge-base --is-ancestor <HEAD> origin/main`
- 푸시 여부: `git branch -r --contains <HEAD>`
- open PR: `gh pr list --state open --head <branch>` 전수 조회 — 열린 PR은 **#191 단 1건**
- salvage·archive 보존: `git branch -r` 대조 (origin/salvage/* 10종, origin/archive/* 2종 존재 확인)
- stash: `git stash list` + `git stash show --stat` (drop 없음)

Refs #344 #287 #191 #164 #258
