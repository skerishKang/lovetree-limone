# V3 HTML Integration Audit

Reference branch: `origin/ui/sample-html-upload-20260801` (read-only, `[샘플]/` 폴더)

본 문서는 16개 HTML 프로토타입을 모두 실제로 읽고 정리한 V3 배치 감사입니다.
각 HTML은 경쟁 시안이 아니라 랜딩·온보딩·작업공간·보기 모드·커뮤니티·마일스톤으로
나뉜 **모듈**로 해석하며, 하나의 V3 사이트의 사용자 여정으로 연결합니다.

공통 시각 토큰(원본 HTML에서 확인):

- 종이 질감: `#f7f0e8` / `#fffdf8`, 잉크 `#3f3535`
- 장미 `#c86e79` / 세이지 `#8a9a75` / 라벤더 `#a980d1` / 골드 `#e5c650`
- Gowun Batang(serif) + Gowun Dodum + Manrope
- 노이즈 그레인, 폴라로이드 카드, 타원 궤도, `✦`/`❦` 성장 은유

---

## 1. lovetree-complete-manga-refinement.html

| 항목 | 내용 |
| --- | --- |
| 제품 단계 | 랜딩 + 첫 순간 심기 (트리 시작) |
| 핵심 사용자 목적 | 사랑에 빠진 순간을 러브트리로 이어보자는 브랜드 랜딩, 트리 이름을 짓고 첫 발견 콘텐츠를 심기 |
| 주요 입력 | 러브트리 이름, 콘텐츠 URL, 마음 메모, 발견 날짜 |
| 주요 버튼 | `첫 순간 심기`, `러브트리 둘러보기`, `이 순간 심기`, `이 이름으로 시작하기`, 로그인 |
| 주요 인터랙션 | URL 파싱 → YouTube 썸네일 라이브 미리보기, 모달 열기/닫기(Escape), 발견→기록→연결→성장 설명 |
| V3 사용 위치 | `/v3` 랜딩, `/v3/trees/new` 트리 시작 |
| V3에서 버릴 요소 | 하드코딩 YouTube ID 쇼케이스, 실제 저장 없는 toast 제출, 인물 특정 문구 |
| 서버 연결 시 데이터 | tree(id, title, visibility), content(url, youtubeId, oEmbed title/thumbnail, note, date) |
| 모바일 위험 | 내비게이션 링크 숨김, 카드 축소·재배열, 폰트 14vw |
| 접근성 위험 | 닫기 버튼 aria-label 없음, dialog role/focus trap 없음, toast 비공지 |

## 2. lovetree-step2-emotion-refined.html

| 항목 | 내용 |
| --- | --- |
| 제품 단계 | 마음 남기기 (온보딩 02) |
| 핵심 사용자 목적 | 첫 발견 콘텐츠에 대표 감정·타임스탬프·메모·공개 범위를 붙여 "마음 카드"로 완성 |
| 주요 입력 | 감정 프리셋/직접 입력, 기억할 시간(mm:ss), ±5초, 메모(140자), 발견 날짜, 메모 공개 범위 |
| 주요 버튼 | 감정 칩, `−5초`/`＋5초`, `이 시간으로 맞추기`, 미리보기 재생, 공개 스위치, `첫 마음 카드 피우기`, `다시 다듬기`, `첫 여정 보기` |
| 주요 인터랙션 | 감정 단일 선택 + 직접 태그, 시간 동기화, 카드 리캡 미리보기, 성공 뷰 전환 |
| V3 사용 위치 | `/v3/trees/demo/onboarding/heart` |
| V3에서 버릴 요소 | localStorage 단계 전달, 하드코딩 폴백 영상, 이중 라벨(FIRST ROOT 등) |
| 서버 연결 시 데이터 | memory(emotion, emotionTags, memo, memoVisibility, recordDate, startSeconds/endSeconds) |
| 모바일 위험 | 뒤로가기 버튼 숨김, 진행 라벨 축소, 시간 행 축소 |
| 접근성 위험 | 감정 칩 aria-pressed 없음, 공개 스위치 접근 이름 없음, toast 미공지 |

## 3. lovetree-step3-connect-next-video.html

| 항목 | 내용 |
| --- | --- |
| 제품 단계 | 다음 순간 연결 (온보딩 03) |
| 핵심 사용자 목적 | 다음 영상 링크를 붙이고 "왜 이어졌는지" 관계 이유를 정해 두 카드를 가지로 연결 |
| 주요 입력 | 다음 영상 URL, 제목, 기억할 시간, 관계 프리셋, 두 장면 사이 마음 메모 |
| 주요 버튼 | 관계 칩, `두 순간을 가지로 잇기`, `이 영상에서 또 이어보기`, `내 러브트리 보기` |
| 주요 인터랙션 | 두 번째 카드 실시간 미리보기, 관계 문구 변경, dashed→solid 가지 애니메이션, 01→02 경로 요약 |
| V3 사용 위치 | `/v3/trees/demo/onboarding/connect` |
| V3에서 버릴 요소 | localStorage 연결, 가짜 `relovetree-canvas` 목적지, 장식 SVG |
| 서버 연결 시 데이터 | connection(parentId, relationType, relationLabel, nextUrl, nextTitle, bridgeMemo, timestamps) |
| 모바일 위험 | 보드 세로 재배열, 가지 SVG 90° 회전, 뒤로가기 숨김 |
| 접근성 위험 | 관계 칩 aria-pressed 없음, 미리보기 교체 미공지, 색·애니메이션 단독 큐 |

## 4. lovetree-growing-tree-v5-draggable-notes.html

| 항목 | 내용 |
| --- | --- |
| 제품 단계 | 작업공간 / 성장 트리 보기 |
| 핵심 사용자 목적 | 트리 캔버스에서 카드를 드래그 배치하고, 줌·팬·전체화면으로 전체 가지를 탐색 |
| 주요 입력 | 영상 링크, 기억할 시각, 기록 날짜, 관계 칩, 전체 감상 메모 |
| 주요 버튼 | 줌 −/＋/맞춤/전체화면, `＋` 추가, 일기 항목 포커스, 노드 삭제 |
| 주요 인터랙션 | 포인터 드래그(setPointerCapture), 패닝, 줌, 전체화면, 가지 성장 애니메이션, 일기→노드 연동 |
| V3 사용 위치 | `/v3/trees/demo` 보조 기준 (배치 편집 토글 시에만 드래그) |
| V3에서 버릴 요소 | localStorage 영속, `confirm()` 삭제, 샘플 되돌리기 버튼, 카피 임계값 하드코딩 |
| 서버 연결 시 데이터 | node(x, y, order), counts, milestone(꽃/열매) 서버 설정 |
| 모바일 위험 | 캔버스 축소 배율, 터치 드래그 취약, 3열 단일 컬럼 전환 |
| 접근성 위험 | 드래그 키보드 대안 없음, `span role=button`, 포커스 관리 없음 |

## 5. lovetree-growing-tree-v6-fullscreen-add.html

| 항목 | 내용 |
| --- | --- |
| 제품 단계 | V3 기본 작업공간 (성장 트리 + 전체화면 추가) |
| 핵심 사용자 목적 | 카드가 가지에 매달린 트리를 보고, 새 순간을 추가하며 트리를 성장시키고, 마음 일기를 옆에 유지 |
| 주요 입력 | 영상 링크, 기억할 시각, 기록 날짜, 관계 칩, 감상 메모 (일반/전체화면 드로어 공통) |
| 주요 버튼 | 줌 −/＋/맞춤/전체화면/추가창, `새 가지를 피워내기`, `전체 화면에서 바로 이어 쓰기`, 삭제 |
| 주요 인터랙션 | 3열(왼쪽 날짜·감정·출처·일기 / 가운데 트리 / 오른쪽 추가·편집), 전체화면 드로어, 꽃·열매 마일스톤 |
| V3 사용 위치 | `/v3/trees/demo` 주 기준 (작업공간) |
| V3에서 버릴 요소 | 폼 중복(일반/드로어), `confirm()` 삭제, 샘플 되돌리기 |
| 서버 연결 시 데이터 | moments(url, time, date, relation, memo, x, y), counts, thumbnail |
| 모바일 위험 | 3열 억지 축소 금지 → 단계형 전환(트리/기록/추가/상세), 전체화면 높이 |
| 접근성 위험 | 드래그 포인터 전용, 노드 `<article>` JS 클릭, aria-live 없음, 대비 낮음 |

## 6. lovetree-node-graph-prototype.html

| 항목 | 내용 |
| --- | --- |
| 제품 단계 | 연결 지도 (보기 모드) |
| 핵심 사용자 목적 | 노드(루트/장면/감정/열매)와 연결선을 그래프로 편집·탐색하고 구간 영상을 타임드 재생 |
| 주요 입력 | 순간 이름, 영상 링크, 시작/끝 시간, 마음의 결, 키워드 태그 |
| 주요 버튼 | 레이아웃 탭(마음 연결/성장 트리/원형/격자), 줌, `순간 카드 추가하기`, 노드 삭제, 구간 재생 |
| 주요 인터랙션 | 포트 드래그로 간선 생성, 노드 선택→inspector, 타임드 임베드, 미니맵, 라이크/태그 투표 |
| V3 사용 위치 | `/v3/trees/demo` 연결 지도 주 기준 (`V3ConnectionMap`) |
| V3에서 버릴 요소 | 섹시/큐트 등 팬 감정 분류, 4포트 UX, 인메모리 전용 상태, 릭롤 샘플 |
| 서버 연결 시 데이터 | nodes(kind, url, start/end, tags, likes, x, y), edges(source, target, label, order) |
| 모바일 위험 | 대형 월드 팬·줌 의존, 13px 핸들, 핀치 없음 |
| 접근성 위험 | 간선 생성 포인터 전용, focus trap 없음, 캔버스 비노출, reduced-motion 없음 |

## 7. lovetree-obsidian-graph1.html

| 항목 | 내용 |
| --- | --- |
| 제품 단계 | 연결 지도 (Obsidian형) |
| 핵심 사용자 목적 | 흩어진 북마크를 루트→감정 클러스터→순간 노드 그래프로 정리 |
| 주요 입력 | 검색(제목·계정), 새 X 영상(제목/링크/감정) |
| 주요 버튼 | 모드 탭, `＋ 연결 모드`, 줌, 감정 필터, `이 카드 추가하기`, `X에서 영상 보기` |
| 주요 인터랙션 | 두 번 클릭 연결 모드, 감정 필터(비매칭 흐리게), 배치 초기화, 미니맵 |
| V3 사용 위치 | `/v3/trees/demo` 연결 지도 보조 기준 |
| V3에서 버릴 요소 | 비기능 탭, 가짜 xPosts, 감정 분류 불일치 |
| 서버 연결 시 데이터 | bookmarks(handle, postId, mood, image, x, y), edges, 필터/검색 상태 |
| 모바일 위험 | 그래프 패널 고정 높이, 노드 축소, 필터 가로 스크롤 |
| 접근성 위험 | 필터 흐림 미공지, 캔버스 비노출, 연결 모드 키보드 없음 |

## 8. lovetree-love-nebula.html

| 항목 | 내용 |
| --- | --- |
| 제품 단계 | 성운 요약 보기 (대규모 트리) |
| 핵심 사용자 목적 | 100개 이상 순간을 별로 표현해 감정 성운·꽃·나선 요약으로 성장 환상을 보여줌 |
| 주요 입력 | 새 순간 추가(제목/감정) |
| 주요 버튼 | 밀도(100/300/1,000), 패턴(성운/꽃망울/나선), 감정 클러스터 칩, `이 마음을 별로 피우기`, 한눈에 |
| 주요 인터랙션 | 캔버스 rAF 파티클, 드래그 배치, 줌/팬, 별 선택 상세, 지표 그리드 |
| V3 사용 위치 | `/v3/trees/demo` 성운 보기 (`V3NebulaView`, 요약 전용) |
| V3에서 버릴 요소 | 가짜 밀도 스위치(실제 데이터 수로 대체), 프로시저 제목, 연속 재생 |
| 서버 연결 시 데이터 | moments(title, mood, url, memo), cluster counts, edge count, 총 순간 수 |
| 모바일 위험 | GPU 부하, 배터리, 별 히트 타깃 미세, 핀치 없음 |
| 접근성 위험 | 순수 캔버스 비노출, 포커스 관리 없음, reduced-motion 없음 |

## 9. lovetree-juyeon-timeline.html

| 항목 | 내용 |
| --- | --- |
| 제품 단계 | 연혁 보기 (타임라인) |
| 핵심 사용자 목적 | 날짜별로 쌓인 순간을 시간순 연혁으로 읽고, 날짜 선택으로 해당 기록을 확인 |
| 주요 입력 | 연혁에 순간 추가(제목/링크) |
| 주요 버튼 | 연혁 트리/날짜 띠/영상 그래프 탭, 날짜 챕터, 트리 노드, `순간 추가하기` |
| 주요 인터랙션 | 날짜 선택 4뷰 동기화, 챕터→상세 카드, 카운트 그래프 |
| V3 사용 위치 | `/v3/trees/demo` 연혁 보기 (`V3TimelineView`) |
| V3에서 버릴 요소 | 하드코딩 events/통계, 깨진 링크, 데모 폼 |
| 서버 연결 시 데이터 | per-date records(day, title, mood, count, tags, video list), rollup stats |
| 모바일 위험 | 570px 스테이지 노드 중첩, 차트 가로 스크롤, 상세 카드 아래 배치 |
| 접근성 위험 | 탭 aria-selected 없음, 색 단독 감정 구분, 텍스트 과소 |

## 10. lovetree-person-albums.html

| 항목 | 내용 |
| --- | --- |
| 제품 단계 | 사람·주제 앨범 인덱스 |
| 핵심 사용자 목적 | 사람/그룹 앨범 그리드에서 트리를 선택해 감정 앵커 트리를 펼침 |
| 주요 입력 | 사람 이름 검색 |
| 주요 버튼 | 전체/여자/남자 필터, 앨범 카드(`트리 펼치기`), `사람 추가하기`, 트리 줌 툴 |
| 주요 인터랙션 | 카드 선택→트리 캔버스, 노드 드래그, 팬/줌, 감정 앵커 가지 |
| V3 사용 위치 | `/v3/my-trees`, `/v3/subjects/demo` 주 기준 |
| V3에서 버릴 요소 | mock people, 장식 캔버스, 자유 드래그 |
| 서버 연결 시 데이터 | person(id, name, group, type, moments, mood, accent, tags), per-person topology |
| 모바일 위험 | 캔버스 고정 높이, 터치 줌 없음 |
| 접근성 위험 | 캔버스 전무 접근성, 필터 색 단독, 줌 버튼 aria-label 없음 |

## 11. lovetree-vertical-person-album.html

| 항목 | 내용 |
| --- | --- |
| 제품 단계 | 사람 앨범 3D 선반 (선택형) |
| 핵심 사용자 목적 | 앨범을 3D 선반에서 넘기고, 가운데 앨범을 펼쳐 순간 트랙리스트로 재생 |
| 주요 입력 | 없음 |
| 주요 버튼 | 선반 ←/→, 앨범 커버(가운데로/펼치기), `← 사람 앨범 선반으로`, 재생/일시정지, 트랙 행 |
| 주요 인터랙션 | 3D 팬 넘김, 스프레드 펼침(회전 전환), 키보드 좌우/Enter/Escape, 트랙 선택 재생바 |
| V3 사용 위치 | `/v3/subjects/demo` 선반 보기 (`V3ShelfView`, 기본 아님) |
| V3에서 버릴 요소 | base64 이미지 블로트, 가짜 데이터, 장식 재생바 |
| 서버 연결 시 데이터 | people(name, group, color, cover, count), track list(title, provenance, duration, thumbnail, url) |
| 모바일 위험 | 3D transform 성능, 스프레드 세로 쌓임, 고정 재생바 가림 |
| 접근성 위험 | dialog role 없음, focus trap 없음, aria-current 없음, 텍스트 과소 |

## 12. lovetree-community-discovery-v2.html

| 항목 | 내용 |
| --- | --- |
| 제품 단계 | 커뮤니티 (공개 트리 발견) |
| 핵심 사용자 목적 | 공개 트리를 검색·필터·정렬해 발견하고, 스크랩북 프리뷰와 전체 그래프로 탐색 |
| 주요 입력 | 검색(인물·트리 제목·감정), 정렬 select |
| 주요 버튼 | 감정 필터 칩, 찜(♥), 카드 썸네일, 미디어 버튼, `전체 러브트리 펼쳐보기`, 오버레이 툴바 |
| 주요 인터랙션 | 카드 선택→북 프리뷰, 찜 localStorage, 검색/필터/정렬, 오버레이 그래프 팬·줌, 노드 상세 패널 |
| V3 사용 위치 | `/v3/community`, `/v3/community/trees/demo` 주 기준 |
| V3에서 버릴 요소 | 하드코딩 트리/댓글, localStorage 찜(서버 전환), toast 미공지 |
| 서버 연결 시 데이터 | public trees(id, title, desc, emotions, moments, likes, comments, note, nodes), 검색 인덱스 |
| 모바일 위험 | 단일 컬럼, 프리뷰 높이, 오버레이 캔버스 팬 의존, 패널 숨김 |
| 접근성 위험 | article tabindex role 없음, dialog/focus trap 없음, aria-pressed 없음 |

## 13. lovetree-300-moments-finale.html

| 항목 | 내용 |
| --- | --- |
| 제품 단계 | 마일스톤 (300 순간 완성) |
| 핵심 사용자 목적 | 300번째 순간을 심으면 기억 입자가 나무/하트/꽃/은하로 모여 완성 의식을 보여줌 |
| 주요 입력 | 없음 (프로시저) |
| 주요 버튼 | 모양 탭(러브트리/심장/마음꽃/기억은하), 재생/일시정지, `300번째 순간 심기`, 순간 팝오버, 완성 모달 |
| 주요 인터랙션 | 12초 성장 애니메이션(4챕터), 진행 바 시크, 카메라 팬/줌, 노드 클릭 팝업 |
| V3 사용 위치 | `/v3/trees/demo/celebrate/300` 완성 트리 테마 |
| V3에서 버릴 요소 | 프로시저 제목 풀, 타이머 전용 모달 |
| 서버 연결 시 데이터 | total count, completion status, per-mood counts, per-moment(title, mood, date, offset, url) |
| 모바일 위험 | 300노드 밀집, 컨트롤 중첩, 터치 히트 |
| 접근성 위험 | 캔버스 비노출, 버튼 glyph 전용, 포커스 없음 |

## 14. lovetree-aurora-particle-heart.html

| 항목 | 내용 |
| --- | --- |
| 제품 단계 | 마일스톤 (오로라 하트) |
| 핵심 사용자 목적 | 하나의 마음을 청록 하트·금빛 궤도·산호 꽃·하늘 은하 입자로 표현 |
| 주요 입력 | 마음의 에너지 슬라이더(20–100) |
| 주요 버튼 | 4형태 버튼, 재생/일시정지, `처음부터`, 팔레트 스와치, `하트 입자 쏟아내기` |
| 주요 인터랙션 | 3D 카메라 드래그, 형태 자동 변신, 에너지/팔레트 조절, 입자 폭발 |
| V3 사용 위치 | `/v3/trees/demo/celebrate/300` 오로라 하트 테마 |
| V3에서 버릴 요소 | 스튜디오/장난감 프레이밍, 시드 데이터, 힌트 |
| 서버 연결 시 데이터 | moment aggregate counts, current feeling, palette/energy pref |
| 모바일 위험 | 입자 밀도, 드래그 vs 스크롤 충돌 |
| 접근성 위험 | 캔버스 비노출, 슬라이더 aria-label 없음, reduced-motion 없음 |

## 15. lovetree-rainbow-memory-canopy.html

| 항목 | 내용 |
| --- | --- |
| 제품 단계 | 마일스톤 (무지개 수관) |
| 핵심 사용자 목적 | 전체 기억을 8개 감정 가지로 분류한 수관을 자라고, 감정 선택으로 해당 가지를 밝힘 |
| 주요 입력 | 없음 |
| 주요 버튼 | 감정 범례 버튼, `기억수관 다시 자라기`, 전체 보기, 재생/일시정지, `처음부터`, 진행 바 |
| 주요 인터랙션 | 18초 성장 루프, 감정 선택→가지 하이라이트+줌, 입자 이동, 드래그 팬/휠 줌 |
| V3 사용 위치 | `/v3/trees/demo/celebrate/300` 무지개 수관 테마 |
| V3에서 버릴 요소 | 자동 선택 순환, 가짜 카운트, 노드 드릴다운 부재 |
| 서버 연결 시 데이터 | moment→emotion mapping, per-category counts, edge metadata |
| 모바일 위험 | 가지 노드 수 감소, 범례 축소, 탭 vs 팬 충돌 |
| 접근성 위험 | 캔버스 비노출, 재생/성장 버튼 aria-label 없음, reduced-motion 없음 |

## 16. lovetree-purple-bloom-graph.html

| 항목 | 내용 |
| --- | --- |
| 제품 단계 | 마일스톤 (마음꽃) |
| 핵심 사용자 목적 | 8개 감정 꽃잎이 심장 코어에서 피어나고, 꽃잎 선택 시 그 감정 기억을 보랏빛으로 강조 |
| 주요 입력 | 없음 |
| 주요 버튼 | 8개 꽃잎 버튼, `이 꽃잎을 보랏빛으로 피우기`, 전체 보기, 재생/일시정지, `처음부터`, 진행 바 |
| 주요 인터랙션 | 27초 개화 루프, 꽃잎 선택 줌, 하트 모티브 상승, 드래그 팬/휠 줌, 상세 패널 |
| V3 사용 위치 | `/v3/trees/demo/celebrate/300` 마음꽃 테마 |
| V3에서 버릴 요소 | 가짜 하트 카운트, 자동 순환, 중복 bloom 버튼 |
| 서버 연결 시 데이터 | per-emotion(title, desc, count, moment list), received hearts, edges |
| 모바일 위험 | 노드 축소, 패널 스택, 탭 vs 팬 임계값 |
| 접근성 위험 | 캔버스 비노출, hover 단독, 색 단독 선택 상태, reduced-motion 없음 |

---

## 요약: HTML → V3 배치 매핑

| V3 화면 | 기준 HTML |
| --- | --- |
| 랜딩 `/v3` | #1 complete-manga-refinement |
| 트리 시작 `/v3/trees/new` | #1 complete-manga-refinement |
| 첫 순간 발견 `/v3/trees/demo/onboarding/source` | #1, #2 step2-emotion-refined(리캡) |
| 마음 남기기 `/v3/trees/demo/onboarding/heart` | #2 step2-emotion-refined |
| 다음 순간 연결 `/v3/trees/demo/onboarding/connect` | #3 step3-connect-next-video |
| V3 작업공간 `/v3/trees/demo` | #5 growing-tree-v6(주), #4 growing-tree-v5(보조) |
| 연혁 보기 | #9 juyeon-timeline |
| 다이어리 보기 | #5 왼쪽 기록 목록 |
| 스토리 보기 | V2 개념 참고(수정 없음) |
| 앨범 보기 | V2 개념 + HTML 미디어 카드 표현 |
| 연결 지도 | #6 node-graph(주), #7 obsidian-graph(보조) |
| 성운 보기 | #8 love-nebula |
| 내 정원 `/v3/my-trees` | #10 person-albums |
| 사람·주제 앨범 `/v3/subjects/demo` | #10, #11 vertical-person-album(선반) |
| 커뮤니티 `/v3/community` | #12 community-discovery-v2 |
| 공개 트리 `/v3/community/trees/demo` | #12 |
| 마일스톤 `/v3/trees/demo/celebrate/300` | #13 finale, #14 aurora, #15 canopy, #16 bloom |

16개 파일 모두 위 표에 한 번씩 명시되었습니다.
