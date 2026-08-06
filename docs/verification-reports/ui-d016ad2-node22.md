# UI 브랜치 Node 22 검증 보고서 (컴3)

- **대상**: `feat/moment-ui-connectivity` @ `d016ad2a55a1d4ec537448ce321e2d275cef864c` (지시된 exact head)
- **검증 worktree**: `../lovetree-wt-verify-ui-comp3` (detached HEAD)
- **환경**: Node.js v22.23.1 (nvm), npm v10.9.8 / `npm ci` 실시
- **참고**: 검증 중 UI 브랜치가 `ca4ddde`(shared data layer, view switcher, moment detail modal), `f740cc7`(docs+screenshots)로 추가 이동 — 컴1 진행 중. 본 보고서는 지시된 `d016ad2` 기준.

**marker: `LOVETREE_MOMENT_UI_SLICE1_VERIFICATION_PASS`**

---

## 1. 검증 파이프라인 (Node 22.23.1)

| 단계 | 명령 | 결과 |
|---|---|---|
| 의존성 설치 | `npm ci` | 성공 (423 패키지) |
| lint | `npm run lint` | **0 errors / 64 warnings** |
| typecheck | `npm run typecheck` | **exit 0, 0 오류** |
| build | `npm run build` | **성공** (`vinext build` + prune-rsc-assets 완료) |
| test | `npm test` | 551 테스트, **520 pass / 31 fail** |

- Node 20에서는 빌드 불가였으나 (`node:fs/promises`의 `glob` 미존재) **Node 22에서 빌드 정상** — 기존 빌드 실패는 순수 환경 문제로 확인.
- `npm test`의 31건 실패는 **모두 V4 레거시 브라우저 테스트**(cinematic/first journey/100 moments/additional source/community)로, 라이브 서버가 없어서 실패. main/기존 head와 **이름 100% 동일한 사전 실패**이며 moment UI Slice와 무관. 빌드/asset 의존 테스트는 Node 22 빌드 성공으로 전부 통과.
- lint 경고 64건 중 이번 커밋 관련: 신규 페이지의 `<img>` 사용 경고 3건 (album:120, tree:244, timeline:131). 기타는 기존 코드/테스트 경고.

## 2. 소스 검토 (d016ad2)

| 체크 항목 | 결과 |
|---|---|
| 3페이지 같은 canonical selector | ✓ Tree=서버 정렬 raw, Timeline=`selectTimelineMoments`, Album=`selectAlbumMoments`. 셀렉터 3종 모두 `toCanonicalMoment`→`sortMoments`(sortOrder→timestamp→createdAt→id) 공통 체인 |
| 같은 Moment ID 유지 | ✓ 모든 뷰가 API 레코드에서 파생된 `moment.id`/`memory.id`를 `key`로 사용 |
| 홈 요청에서 sortOrder 제거 | ✓ `plantMoment()`가 `memo`/`clientKey`/`timestamp`만 전송 (sortOrder 없음) |
| 네비게이션 링크 실제 경로 일치 | ✓ Home→`/trees/:id`, 트리→`/timeline`·`/album`, 타임라인↔앨범 상호 링크, "← 트리로 돌아가기" 모두 실제 라우트와 일치 |
| 데이터 복사본 / mock 제품 데이터 | ✓ 없음 (모든 페이지가 API에서 fetch) |
| 수정·삭제 동기화 | d016ad2 기준 Tree 페이지만 수정/삭제 제공, Timeline/Album은 읽기 전용 → **`NOT_IMPLEMENTED_IN_SLICE1`** (Slice 1 범위, 결함 아님) |

- 경미 노트: 3개 페이지가 동일한 `loadTree` 로직을 각자 보유(코드 중복, 데이터 복사 아님). 이후 커밋 `ca4ddde`의 `useTreeMoments` 공유 훅으로 해소됨.

## 3. 브라우저 검증 (playwright chromium + API 라우트 모킹, `vinext start` 서버)

| 항목 | 결과 |
|---|---|
| Tree → Timeline → Album → Tree 내비게이션 | ✓ 통과 |
| 새로고침 (트리 페이지) | ✓ 데이터 유지 |
| 뒤로 가기 | ✓ |
| 뷰포트 1536×960 / 390×844 / 320×720 (3페이지 × 3뷰포트) | ✓ 수평 overflow 없음 |
| 콘솔/페이지 오류 | ✓ 0건 (하이드레이션 오류 패턴 포함 0건) |
| 하이드레이션 오류 | ✓ 없음 |
| 이미지 실패 상태 | ✓ 페이지 비크래시, 렌더링 유지 (브라우저의 예상 404 리소스 로그만 발생) |
| 빈 Moment 상태 | ✓ 3개 뷰 모두 "아직 기록된 순간이 없어요." 표시 |
| 404 트리 | ✓ "러브트리를 찾을 수 없어요" 상태 표시 |

결과: **브라우저 검증 5/5 통과.**

## 4. 결론

- 지시된 exact head `d016ad2`의 moment UI Slice는 Node 22에서 빌드/타입체크/린트 통과, 브라우저 검증 5/5, 소스 계약(셀렉터/Moment ID/sortOrder 제거/네비게이션) 충족.
- 발견 사항 없음(결함 없음). lint `<img>` 경고 3건(성능 지표), 3페이지 `loadTree` 중복(코드 품질) — 모두 비차단.
- `npm test`의 31건 V4 실패는 main 대비 신규가 아닌 사전 실패.
- **Slice 1 미구현 사항**(크로스뷰 수정/삭제 동기화)은 `NOT_IMPLEMENTED_IN_SLICE1`로 분류.

**결과 표식: `LOVETREE_MOMENT_UI_SLICE1_VERIFICATION_PASS`**
