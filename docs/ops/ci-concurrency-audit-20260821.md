# CI 병목 정량 감사 — concurrency / 큐 대기 실측 (Issue #292)

- 작성일: 2026-08-21
- 범위: `.github/workflows/*.yml` 전수(13개) + GitHub Actions 실행 이력 실측
- 성격: 분석 보고서 전용 Lane. 워크플로우 파일 수정 없음(제안만 포함).
- 데이터 소스: `gh run list --json`(최근 300건) + `gh api actions/runs?created=2026-08-18..2026-08-20`(366건) + 워크플로우 YAML 전문.
- 측정 정의: **대기(wait)** = `run_started_at − created_at`(큐 구간), **실행(run)** = `updated_at − run_started_at`.

---

## 1. 현재 직렬화 지점 지도

### 1.1 workflow-level `concurrency:` 블록 보유 현황 (전수 13개)

| 워크플로우 | 트리거 | concurrency 블록 | 그룹명 |
|---|---|---|---|
| production-auto-deploy.yml | push main + dispatch | **있음** (`cancel-in-progress: false`) | `lovetree-production-deploy` |
| a-track-p0-validation.yml | PR→main | 없음¹ | — |
| design-fidelity-validation.yml | PR→main | 없음 | — |
| design-source-freshness-observer.yml | PR→main + dispatch | 없음 | — |
| lineage52-phase2-native-browser-qa.yml | PR→main + dispatch | 없음 | — |
| lineage60-v12-native-browser-qa.yml | PR→main + dispatch | 없음 | — |
| living-media-sphere-v3-hold-browser-qa.yml | PR→main + dispatch | 없음 | — |
| source-track18-v2-browser-qa.yml | PR→main + dispatch | 없음 | — |
| source-track47-v425-browser-qa.yml | PR→main + dispatch | 없음 | — |
| source-track68-v332-browser-qa.yml | PR→main + dispatch | 없음 | — |
| track62-v11-continuous-exhibition-qa.yml | PR→main + dispatch | 없음 | — |
| track66-native-browser-qa.yml | PR→main + dispatch | 없음 | — |
| track67-native-browser-qa.yml | PR→main + dispatch | 없음 | — |

¹ a-track 내 `concurrency` 문자열은 전부 Node test runner의 `--test-concurrency=1`(브라우저 테스트 파일 직렬화)이며 workflow-level 블록이 아님.

**핵심 구조적 사실**: PR 1회 push마다 **11~12개 워크플로우가 무조건 동시 기동**된다(path 필터 없음). main 브랜치는 브랜치 보호 미설정(required checks 없음), self-hosted runner 없음(전부 GitHub-hosted `ubuntu-latest`, 공개 repo).

### 1.2 큐 지도 — 어떤 job이 어디서 기다리는가

```text
[큐 Q1] Production deploy 직렬 큐
  group: lovetree-production-deploy, cancel-in-progress: false
  → main push들이 이 그룹에서 순차 대기. 실측 대기 0초(병목 미발생),
    실배포 실행 p90≈5m46s / max 7m44s. (vars 게이트로 skip 시 ≈1s)

[큐 Q2] PR fanout 암묵 큐 (GitHub-hosted 공유 용량)
  concurrency 그룹 없음 → 12개 워크플로우 × push 수만큼 즉시 요구 발생
  → burst 시 GitHub 호스팅 용량 상회분이 암묵적으로 queued
  → 실측 최대 대기 78m20s (8/18), 66m40s~66m47s·44m~48m (8/19 사고)

[직렬 S1] A-track P0 validation 내부 (단일 job, ≈10m46s p50)
  lint → typecheck → build → contract tests → PG gate
  → npm start #1 (L53 QA) → npm start #2 (표준 테스트, 브라우저는 --test-concurrency=1)
  → npm start #3 (Orbit QA) → build 재실행 → db:check
  ※ build 2회 + 서버 기동 3회로 job 자체가 길어 Q2 점유시간 최장(단일 기준 track68 다음)

[직렬 S2] Track68 browser QA 단일 job (p50 19m21s, timeout-minutes: 20)
  → 타임아웃 마진 p50 기준 <40초. 별도 위험 항목(§5).
```

### 1.3 브라우저 QA 워크플로우 실행 방식 비교

| 워크플로우 | 서버 포트 | Playwright 설치 | matrix |
|---|---|---|---|
| a-track-p0-validation | 3000 (`npm start`) | pin 1.55.0 + `--with-deps` | 없음 |
| design-fidelity-validation | (target runner 내부) | pin 1.55.0 + `--with-deps` | **있음**(동적 plan→matrix) |
| lineage52-phase2-native | 3000 | pin 1.55.0 + `--with-deps` | 없음 |
| lineage60-v12-native | 3000 | pin 1.55.0 (deps 생략) | 없음 |
| living-media-sphere-v3-hold | 3000 | pin 1.55.0 (deps 생략) | 없음 |
| source-track18-v2 | 3000 | pin 1.55.0 + `--with-deps` | 없음 |
| source-track47-v425-hold | 3000 | pin 1.55.0 (deps 생략) | 없음 |
| source-track68-v332 | 3000 | pin 1.55.0 (deps 생략) | 없음 |
| track62-v11 | 3000 | pin 1.55.0 (deps 생략) | 없음 |
| track66-native | 3000 | pin 1.55.0 (deps 생략) | 없음 |
| track67-native | 3000 | pin 1.55.0 (deps 생략) | 없음 |

- 전부 runner 격리 환경에서 `npm start`(vinext start) → `127.0.0.1:3000` 헬스체크(curl 폴링 60~120회×1s) → QA 스크립트 실행. 포트 충돌은 없음(runner별 격리).
- 공통 오버헤드: 워크플로우마다 `npm ci` + `npm run build` + Playwright 설치를 반복(약 4~6분 × 9개 standalone QA 워크플로우).
- `--with-deps` 유무 불일치(5개 vs 6개): OS 의존성 설치 비용이 절반만 부담됨. 현재 실패 차이는 관측되지 않으나 일관성 없음.

---

## 2. 대기시간 실측 통계 (gh run list)

### 2.1 워크플로우별 대기/실행 분포 (최근 이력, 2026-08-21 기준)

| 워크플로우 | n | 대기 p50 | 대기 p90 | 대기 max | 실행 p50 | 실행 max |
|---|---|---|---|---|---|---|
| A-track P0 validation | 29 | 0s | 0s | 0s | 10m46s | 14m34s |
| Track68 V3.3.2 browser QA | 35 | 0s | 0s | **0s** | 19m21s | 20m04s |
| Track67 V2.4.2 native QA | 100 | 0s | 0s | **48m21s** | 5m53s | 37m31s* |
| Track47 V4.2.5 hold QA | 28 | 0s | 0s | **66m47s** | 2m14s | 20m22s* |
| Living Media Sphere V3 hold | 28 | 0s | 0s | **66m40s** | 2m04s | 20m23s* |
| Track66 V1.2 native QA | 29 | 0s | 0s | **44m02s** | 2m16s | 7m29s |
| Lineage60 V1.2 native QA | 29 | 0s | 0s | 0s | 2m11s | 4m30s |
| Lineage52 Phase2 native QA | 24 | 0s | 0s | 0s | 3m04s | 3m39s |
| Design Fidelity Validation | 28 | 0s | 0s | 0s | 24s† | 10m12s |
| Design Source Freshness Observer | 22 | 0s | 0s | 0s | 53s | 2m02s |
| Guarded Production deploy | 17 | 0s | 0s | 0s | 1s‡ | 7m44s |

\* 대기+실행 겹침 사고 구간의 이상치(재시도/지연 포함). † 대부분 no-target 스킵(plan+result만). ‡ vars 게이트 skip.

### 2.2 대기 60초 초과 사례 전수 (8/18~8/21 관측 창)

| run id | 워크플로우 | 대기 | 생성시각(UTC) | 비고 |
|---|---|---|---|---|
| 32090430283 | Track18 fail-closed HOLD QA | **78m20s** | 08-18 02:03 | 역대 최대 |
| 32224912451 | Track47 hold QA | 66m47s | 08-19 06:47 | 8/19 사고 |
| 32224912522 | Living Media Sphere hold | 66m40s | 08-19 06:47 | 8/19 사고 |
| 32227316497 | Track67 native QA | 48m21s | 08-19 07:19 | 8/19 사고 (이후 실행 37m31s) |
| 32224912462 | Track67 native QA | 47m29s | 08-19 06:47 | 8/19 사고 |
| 32227316476 | Track47 hold QA | 44m10s | 08-19 07:19 | 8/19 사고 |
| 32227316460 | Track66 native QA | 44m02s | 08-19 07:19 | 8/19 사고 |
| 32090161662 | Living Media Sphere hold | 24m11s | 08-18 01:59 | |
| 32084947855 | Living Media Sphere hold | 23m16s | 08-18 00:33 | |
| 32315497228 | Track67 native QA | 7m03s | 08-19 23:59 | |
| 32324933702 | Track67 native QA | 31m39s | 08-20 02:31 | |

### 2.3 「track68-browser-qa 11분+ 대기」 주장에 대한 검증 결과

- Track68 워크플로우 **전체 이력 35건 전수 확인 결과 큐 대기 > 60초 사례 0건**(전부 0초 시작).
- 11분± 대기 사례는 run 이력상 재현 불가. 근접 사례는 track67의 7m03s뿐이며, 11분 이상은 23m16s(8/18 LMS)부터 존재.
- 추정 원인: (a) 당시 PR 배치에서 선행 체크 pending을 track68 pending으로 관측했거나, (b) 해당 워크플로우 존재(~8/20 신설) 이전 사고의 기억 혼동, (c) 보존기한 지난 로그. **본 보고서는 run 데이터에 근거해 track68 자체 큐 대기는 '미발생'으로 정량화한다.**
- 단, track68은 **대기가 아니라 실행 길이**(p50 19m21s vs timeout 20m)가 실제 병목 리스크이다(§5).

### 2.4 8/19 사고 재구성 (06:47–07:35 UTC)

- 중첩 run 68건, 수요 피크(queued+running) **36 동시**, ≥9개 PR 배치가 겹침.
- push 버스트 패턴: 01:44/01:48/01:49/01:52(8분 내 4회 push), 22:57/22:58 등 — push마다 12워크플로우가 즉시 기동되므로 4회 버스트 = **~48 run / 55+ job-min 수요가 수 분 내 발생**.
- 실측 최대 병렬 실행: **24 동시 run**(8/21 01:49 UTC) — GitHub-hosted 용량이 상시 5슬롯급은 아니며, **버스트 흡산 지연**이 병목의 실체.

---

## 3. Worker 5→8 병렬 확장 시 대기시간 시뮬레이션 (단순 모델)

> 「Worker」 = CI를 유발하는 에이전트 작업 레인(WORKER-N). 레인 수 증가 → 동시 push 버스트 k 증가.

### 3.1 모델 가정 (측정값 기반)

- push 1회당 평균 작업량 **W₁ ≈ 55 job-min**(§1.2 각 워크플로우 실행 p50 합, DF matrix 제외 — 보수적 하한)
- 유효 병렬 처리 용량 **C**(worker 슬롯 환산), 임계경로 = 최장 단일 job = track68 **19.4분**
- 버스트 k개 push가 동시 도착(관측된 최악 패턴: 8분 내 4회)
- 배출시간 `T(k,C) = max(k·W₁/C, 19.4분)`, 소형 job 중위 대기 `≈ (k−1)/2 · W₁/C`

### 3.2 결과표 (분)

| 버스트 k (동시 push) | T @C=5 | T @C=8 | 중위 job 대기 @C=5 | 중위 job 대기 @C=8 |
|---|---|---|---|---|
| 1 | 19.4 (임계경로) | 19.4 | ~0 | ~0 |
| 2 | 22.0 | 19.4 | 5.5 | 3.4 |
| 3 | 33.0 | 20.6 | 11.0 | 6.9 |
| 4 | 44.0 | 27.5 | 16.5 | 10.3 |
| 5 | 55.0 | 34.4 | 22.0 | 13.8 |
| 6 | 66.0 | 41.3 | 27.5 | 17.3 |

### 3.3 모델 검증 및 해석

- 검증: 8/19 사고 ≈ k≈9, C≈5~8 가정 → 예상 배출 62~99분 vs 실측 최대 대기 78m20s — **모델이 실측과 일관**.
- Worker 5→8은 버스트 k를 ~1.6배로 확대. 현재(5레인) 관측 대기(7m03s 사례, k≈2~3 구간)와 모델이 정합.
- **결론**: worker를 8로 늘리기만 하면 중위 대기 1.6배(예: k=4에서 16.5→10.3분이 아니라, 같은 push 밀도에서 k가 4→6.4로 이동해 대기 16.5→27.5분급 악화). **CI 중복 제거(§4 옵션 A) 병행 없이는 확장 이득이 상쇄된다.** 반대로 옵션 A 적용 시 W₁ 실효치가 감소해 C 증설 없이도 대기가 k=2~3 구간에서 ~0에 수렴.

---

## 4. 분리 방안 옵션 비교

| 옵션 | 내용 | 기대효과(측정 근거) | 비용/리스크 | 판정 |
|---|---|---|---|---|
| **A. PR-ref scoped concurrency 그룹 추가** | PR 트리거 12개 워크플로우에 `concurrency: group: ${{ github.workflow }}-${{ github.ref }}` + `cancel-in-progress: true`. production 그룹은 현행 유지 | 같은 PR 재push 시 구 SHA run 즉시 취소 → 관측된 버스트(8분 4회 push)의 중복 ~48 run 소거. 최종 SHA 체크는 항상 완주(fail-closed 문화와 정합) | 낮음. YAML 수준 변경, 되돌리기 쉬움. evidence 이력은 최종 SHA 기준 유지 | **1순위 권안** |
| B. path-scoped 트리거 | lineage/source-track evidence 워크플로우에 `paths:` 또는 paths-filter plan job | docs-only PR도 현재 12개 전부 기동 → 루틴 run 50~80% 절감 추정 | 중간. required checks 미설정이라 게이트 파손은 없으나, evidence 완결성 문화상 디자인 오너 결정 필요. native `paths:`는 첫 push diff 미확인 한계 | 2순위(오너 승인 후) |
| C. matrix 재구성(통합) | 9개 standalone browser-QA 워크플로우를 design-fidelity-validation 방식(plan→matrix→result)으로 통합 | push당 `npm ci`+build+Playwright 설치 9회 중복(≈40 job-min) 제거 | 높음. 9개 파일 리팩터링 + fail-closed 인벤토리 계약 재검증 필요 | 중기 과제 |
| D. runner 증설(self-hosted/larger) | 상시 용량 확대 | 버스트성 수요에는 비효율(피크 24 동시는 이미 관측, 상시 여유) | 운영/보안 부담(WSL 정책, 유지보수), 공개 repo hosted 무료와 역방향 | **비권장** |

---

## 5. 권안 1순위 + 근거

**권안: 옵션 A — PR-triggered 12개 워크플로우에 `${{ github.workflow }}-${{ github.ref }}` concurrency 그룹(cancel-in-progress: true) 추가. production-auto-deploy의 `lovetree-production-deploy` 그룹은 건드리지 않음.**

근거(모두 실측):

1. **병목의 실체는 용량 부족이 아니라 중복 수요**: 대기 사례 11건 전부가 multi-PR 버스트 구간(8/18~19)에 집중. 같은 PR의 재push가 구 SHA run을 끝까지 돌려 수요를 부풀림(8분 4회 push × 12워크플로우).
2. **무비용·무다운사이드**: hosted runner 추가 비용 없음, main 배포 경로(Q1) 불변, 최종 SHA 기준 체크는 항상 완주하므로 fail-closed 계약(A-track 인벤토리 가드 등) 훼손 없음.
3. **Worker 5→8 확장의 선행조건**: §3 시뮬레이션대로 레인 증가는 버스트를 키운다. A 적용으로 W₁ 실효치를 낮춘 뒤 확장해야 대기 개선이 보존됨.
4. **즉각 체감 효과**: k=4 버스트에서 중위 job 대기 16.5분 → 재push분 소거로 ~0 수렴(모델), 8/19급 사고 재발 시 최악 대기 78분 → 최종 SHA 1세트 분(≈19.4분 임계경로)으로 상한 억제.

### 부수 발견(권안과 별도 트래킹 권장)

- **Track68 타임아웃 마진**: 실행 p50 19m21s vs `timeout-minutes: 20` — 마진 <40초. 다음 수정 시 25~30분 상향 또는 QA 분할 제안.
- **A-track 내부 중복**: `npm run build` 2회 + `npm start` 3회 사이클 — job 길이(p50 10m46s) 단축 여지.
- **Playwright `--with-deps` 불일치**: 5개 워크플로우만 적용. 일관화 시 오버헤드 편차 제거.
- **브랜치 보호 미설정**: required checks 없음 — 옵션 B 도입 시 게이트 파손 리스크는 현재 없으나, 게이트 의미는 규약(convention)에 의존 중.

---

## 부록: 측정 방법

```bash
# 최근 300건
gh run list --limit 300 --json databaseId,workflowName,event,status,conclusion,createdAt,startedAt,updatedAt,headBranch
# 워크플로우별 전수
gh run list --workflow=<wf>.yml --limit 100 --json ...
# 8/18~8/20 사고 창
gh api --paginate "repos/skerishKang/lovetree-limone/actions/runs?created=2026-08-18T00:00:00Z..2026-08-20T00:30:00Z&per_page=100"
# 대기 = startedAt - createdAt / 실행 = updatedAt - startedAt (node 스크립트로 분포 산출)
```

- 환경: WSL 네이티브 worktree(`/root/worktrees/kilo9-issue292`, ext4), branch `feat/292-ci-concurrency-audit`, base `origin/main@d2aa254d`.
- 본 문서 외 코드/워크플로우 변경 없음.
