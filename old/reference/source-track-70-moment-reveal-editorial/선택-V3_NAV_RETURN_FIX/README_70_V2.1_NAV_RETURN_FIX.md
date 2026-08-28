# Track 70 V2.1 — NAV RETURN FIX

STATUS: DESIGN CANDIDATE / NOT OWNER-APPROVED
OWNER: 디자인팀장18기
DATE: 2026-08-17

## Reported failure
녹화에서 drawer의 OPEN 버튼을 누른 뒤 현재 Track70 탭까지 대상 HTML로 이동했고,
뒤로 가기 시 Track70 초기 상태가 안정적으로 복원되지 않았다.

## Root cause
V2 used:
`window.open(path, '_blank', 'noopener,noreferrer')`
and treated a falsy return value as popup failure, then executed:
`window.location.href = path`.

With `noopener`, browsers may return `null` even when a new tab was opened.
This could therefore navigate both the new tab and the current Track70 tab.

Drawer and WORKS overlay states also did not participate in browser history.

## Fix
1. Every visible template OPEN control is now a real anchor:
   - `target="_blank"`
   - `rel="noopener noreferrer"`
2. No `location.href` fallback remains.
3. Track70 current page is never replaced by template OPEN actions.
4. MOMENTS / PATHS / JOURNAL / MY TREE drawers push a history state.
5. Browser Back closes the open drawer and restores the hero.
6. WORKS_ also pushes history; Browser Back closes WORKS_.
7. ESC, close button, backdrop and logo use the same history-safe close flow.
8. Existing Track70 visual design, images, radial reveal, and relative template targets are preserved.

## Files
- `70_V2.1_LOVETREE_PORTAL_NAV_RETURN_FIX.html`
- `70_V2.1_COMPARE_WITH_V2.html`
