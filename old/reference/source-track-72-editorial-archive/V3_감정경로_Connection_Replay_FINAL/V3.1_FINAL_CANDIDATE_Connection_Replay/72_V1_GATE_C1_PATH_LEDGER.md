# Track 72 — GATE C1 PATH LEDGER

## 상태
- `GATE B1 = PASS / foundation LOCK`
- `GATE C = AUTHORIZED`
- `GATE C1 = CANDIDATE / 승인 대기`
- Prototype path only. Backend/DB 계약 확정 아님.

## 대표 Emotional Path

`path-first-fan`

C1에서는 36 Moment 전체를 억지로 graph화하지 않고, 현재 B1 metadata에서 감정 인과를 직접 읽을 수 있는 8 Moment만 대표 경로로 연결했다.

> Archive order는 `ITEMS`의 목록 순서다. 아래 `connectedFrom / connectedTo`는 감정의 인과관계이며 Archive order와 무관하다.

| order | Moment ID | emotion | connected from | connection reason | connected to |
|---:|---|---|---|---|---|
| 1 | `m14` | 설렘 | — | 이 표정이 계속 생각났다. | `m16` |
| 2 | `m16` | 궁금함 | `m14` | 그 표정이 계속 생각나서 다른 무대를 찾아봤다. | `m17` |
| 3 | `m17` | 궁금함 | `m16` | 다음 무대를 찾아보기 시작한 뒤, 처음으로 인터뷰를 끝까지 봤다. | `m22` |
| 4 | `m22` | 궁금함 | `m17` | 목소리가 생각보다 낮았다. | `m23` |
| 5 | `m23` | 놀람 | `m22` | 좋아서 저장한 게 아니라, 저장하고 나서 좋아졌다는 걸 알았다. | `m26` |
| 6 | `m26` | 호감 | `m23` | 이 순간 이후 다른 영상을 계속 찾아보기 시작했다. | `m33` |
| 7 | `m33` | 확신 | `m26` | 여기서부터는 그냥 팬이었다. | `m35` |
| 8 | `m35` | 확신 | `m33` | — | — |

## 기존 metadata 근거

### m14 → m16
- `m14`: `FIRST MOMENT 처음 멈춰 보게 된 장면`
- `m16`: `“이 표정이 계속 생각났다.” · 궁금함`
- `m18`: `설렘 → 궁금함`

따라서 C1에서 `m14=설렘`, `m16=궁금함`을 대표 path prototype으로 사용했다.

### m16 → m17
`m18`에 이미 다음 문장이 존재한다.

`그 표정이 계속 생각나서 다른 무대를 찾아봤다.`

이를 그대로 Connection reason으로 사용했다.

### m17 → m22
- `m17`: `다음 무대를 찾아보기 시작한 밤`
- `m22`: `처음으로 끝까지 본 인터뷰`, `말하는 방식까지 궁금해졌다.`

두 기존 title/note를 최소한으로 이어 대표 path의 bridge 문장을 구성했다.

### m22 → m23
- `m22`: 인터뷰 Source
- `m23`: `목소리가 생각보다 낮았다. · 놀람`

m23의 기존 memo를 Connection reason으로 사용했다.

### m23 → m26
`m26`의 기존 quote:

`좋아서 저장한 게 아니라, 저장하고 나서 좋아졌다는 걸 알았다.`

를 그대로 사용했다.

### m26 → m33
`m32` Turning Point Connection에 이미:

`호감 → 확신`

`이 순간 이후 다른 영상을 계속 찾아보기 시작했다.`

가 존재한다. m33은 `Turning Point의 인물 Moment`이므로 이를 대표 path의 전환 이유로 사용했다.

### m33 → m35
`m35` 기존 memo:

`여기서부터는 그냥 팬이었다. · 확신`

을 그대로 사용했다.

## C1 Prototype 필드

대표 path Moment에만 다음 필드를 runtime metadata로 추가했다.

```js
{
  emotion,
  connectedFrom,
  connectedTo,
  connectionReason,
  pathId,
  pathOrder
}
```

별도 backend/DB/schema는 만들지 않았다.

## Connection surface 처리

`m18 / m29 / m32`는 Archive 안의 기존 Connection surface로 그대로 보존한다.
C1 대표 path의 Moment로 강제 변환하지 않았다.
필요한 경우 그 안의 기존 relation sentence만 prototype Connection reason의 근거로 사용했다.

## DO_NOT_USE 정책

`m28 / m30 / m31`은 Moment 자체가 삭제된 것이 아니다.
B1과 동일하게 problem media만 `DO_NOT_USE` 상태이며 C1에서 broken media를 다시 노출하지 않는다.
