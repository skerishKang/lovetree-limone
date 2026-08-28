# Track 74 QA

## 정적 검사

- 단일 HTML 구조: PASS
- JavaScript syntax: PASS
- 중복 ID: PASS
- 두 Higgsfield 이미지 URL: PASS
- Morph constants 60 / 140 / 44 / 24 / 0.92 / 8: PASS
- 디자인 Track 상대 경로가 Track 74 루트 기준 `../`: PASS
- Codex 상대 경로가 Track 74 루트 기준 `../../../코덱스`: PASS
- 데스크톱 클릭 고정 메뉴: 유지
- 모바일 burger / scrim / sheet / Escape / focus trap / inert: 유지
- 기존 Track 73 원본 변경 없음: PASS

## 제한

- 원본 Orbit base64 TTF 파일은 현재 프로젝트 자료에서 확인되지 않았으므로 실행본은 `Orbit Sans` 및 `Orbit Display` family 이름을 유지하되 Arial/Helvetica 및 Times 계열 fallback을 사용한다.
- 외부 Higgsfield 이미지 로딩과 실제 로컬 상대 경로 실행은 사용자의 Google Drive 동기화 상태 및 브라우저 네트워크 상태에 의존한다.
