# LoveTree 4-2기 시네마틱디자인팀장
## 4차 긴급 정정지시 · Female Batch 반려 / Pinterest 기준 Casting Face Approval Gate / Adobe 인물생성 금지 v1

- 발행: LoveTree 3기 설계팀장
- 대상: LoveTree 4-2기 시네마틱디자인팀장
- 적용 프로젝트: `50_드림메모리_시네마틱_분류대기_v1`
- 선행 기준: Dream Memory V1 / 2차 보완지시 / 3차 실사용 원본사진 생성 Gate / 공통 반복얼굴 금지 지시
- 상태: **여성 Batch 01 시각 반려 / 캐스팅 단계 재진입**
- 기존 Dream Memory V1 overwrite: 금지
- Production 반영: 금지

---

# 0. 제품 오너 최신 판정

현재 Adobe에서 생성한 여성 Batch 01의 자체 판정:

```text
7 PASS + 1 PASS-WITH-NOTE
```

은 제품 오너의 실제 시각 판정으로 **무효화한다.**

현재 여성 Batch 01의 최종 상태는:

```text
VISUAL CAST FAIL
REJECT FOR HTML
DO NOT USE IN V1.1
```

이다.

문제는 손, 피부, 조명, 해부학 같은 기술적 결함이 아니다.

핵심 문제는:

> **LoveTree가 요구하는 K-pop 아이돌 캐스팅 수준의 얼굴 매력, 스타성, 세련된 인상, 캐스트 다양성이 부족하다.**

현재 Adobe 결과는 일부 컷에서 일반적인 lifestyle/candid 인물 사진에 가까워졌고,
초기 Pinterest 무드보드를 참고해 만든 여성 캐스트 후보들보다
아이돌 캐스팅 품질이 명확히 낮아졌다.

따라서 현재 Adobe 여성 Batch 01은 HTML 자산으로 채택하지 않는다.

삭제하지는 말고 학습용 반려 자산으로 보존한다.

---

# 1. 가장 중요한 방향 정정

앞으로 순서를 다음처럼 바꾼다.

## 기존 잘못된 순서

```text
Scene 정의
→ 장면 사진 생성
→ 나온 얼굴이 괜찮으면 사용
```

이 방식은 매 생성마다 얼굴의 미감과 정체성이 흔들리고,
어느 순간에는 예쁜 아이돌 얼굴이 나오다가
다음 순간에는 일반인 lifestyle 모델처럼 내려가는 문제가 발생한다.

## 새 공식 순서

```text
Pinterest 기준 캐스팅
→ 얼굴 후보 생성
→ 제품 오너 얼굴 승인
→ Identity Lock
→ 승인 얼굴로 Scene 생성
```

즉:

> **장면보다 얼굴 캐스팅 승인이 먼저다.**

---

# 2. 현재 Pinterest 기반 초기 여성 캐스트 방향은 승인된 참고 기준

제품 오너가 직접 제공한 Pinterest 여자아이돌 / 여자아이돌 전신 무드보드를 참고해
초기에 만든 여성 캐스트 후보들의 방향은 좋다고 판정했다.

앞으로 여성 캐스트의 시각 기준은 그쪽이다.

필수 체감:

- 실제 K-pop 그룹 멤버로 있을 법함
- 예쁘고 세련됨
- 얼굴에 스타성이 있음
- 카메라 앞에서 존재감이 있음
- 자연스럽지만 평범한 일반인 느낌으로 내려가지 않음
- 각 인물이 서로 다른 매력을 가짐
- 동일한 AI 미인형 복제처럼 보이지 않음

Pinterest에서 참고할 것은:

- 얼굴형 다양성
- 눈매
- 헤어스타일
- 메이크업 강도
- 무대/사복 스타일링
- 전신 비율
- 아이돌 활동 사진의 camera-readiness
- 그룹 안에서 멤버별 캐릭터 차이

특정 실존 아이돌 한 명의 얼굴을 복제하지 않는다.

---

# 3. Adobe는 당분간 Main/Secondary 아이돌 얼굴 생성에 사용 금지

현재 LoveTree 작업에서 확인된 결과 기준으로 역할을 분리한다.

## Adobe 사용 우선 영역

- 자연 풍경
- 실내 공간
- 창문 / 커튼 / 도로 / 물 / 하늘
- 소품
- 환경 plate
- 항공기
- 배경
- 추상 공간
- atmosphere asset

## Adobe 사용 금지 영역

당분간 아래에는 Adobe를 주 생성기로 사용하지 않는다.

- 여성 Main Cast 얼굴
- 남성 Main Cast 얼굴
- 여성 Secondary Cast 얼굴
- 남성 Secondary Cast 얼굴
- 핵심 Hero portrait
- 동일 인물 Identity Lock용 기준 얼굴

즉:

> **Adobe로 사람 얼굴을 다시 만드는 작업을 중단한다.**

이번 정정은 Adobe 자체의 일반적 성능 평가가 아니라,
현재 LoveTree Dream Memory 캐스트에서 실제로 나온 결과를 기준으로 한 프로젝트 판단이다.

---

# 4. Scene 생성 중단 / Casting Face Approval Gate 먼저 수행

지금부터 여성 8컷을 다시 만드는 것이 아니다.

먼저 아래 **얼굴 후보만** 만든다.

## Female Main Cast

### F-MC01
서로 완전히 다른 얼굴 후보 4명

### F-MC02
서로 완전히 다른 얼굴 후보 4명

## Female Secondary Cast

### F-SC01
서로 다른 후보 3명

### F-SC02
서로 다른 후보 3명

총:

```text
14 FACE CANDIDATES
```

까지만 만든다.

제품 오너 승인 전에는:

- full-body
- pair
- group
- stage scene
- memory field
- save moment
- environment composite

를 만들지 않는다.

---

# 5. 14명은 “같은 미인 얼굴의 변형”이면 안 된다

14개 후보는 실제로 서로 다른 캐스트처럼 보여야 한다.

다음처럼 archetype 자체를 분산한다.

예시:

- 맑고 청순한 인상
- 세련된 냉미녀
- 고양이상
- 밝고 귀여운 인상
- 강한 무대형
- 자연스럽고 고급스러운 배우상
- 청량하고 활동적인 인상
- 몽환적이고 섬세한 인상

단 이것은 고정된 8분류를 기계적으로 하나씩 만드는 명령이 아니다.

목적은:

> **여러 명의 실제 아이돌 라인업을 보는 것처럼 서로 다른 매력을 확보하는 것**

이다.

---

# 6. 얼굴 후보 생성 기준

각 후보는 얼굴 자체를 검수하기 위한 이미지다.

권장:

```text
head-and-shoulders 또는 bust portrait
simple neutral / soft studio background
clean natural lighting
camera-ready K-pop styling
```

필수:

- 실제 K-pop 아이돌급 시각 매력
- 정돈된 헤어
- 세련된 메이크업
- 자연스러운 피부
- 명확한 눈매
- 깨끗한 얼굴 윤곽
- 고급스러운 camera presence
- distinct star quality
- believable age range for contemporary K-pop cast
- 서로 다른 identity

피해야 함:

- 평범한 회사원 / 일반인 lifestyle 모델 느낌
- 지나치게 수수한 광고 모델 느낌
- 똑같은 검은 긴 머리 + 똑같은 눈매
- 얼굴이 모두 자매처럼 비슷함
- 지나친 AI 인형 피부
- 과도하게 성숙한 패션 모델
- 미성년자로 오해될 지나치게 어린 표현
- 특정 실존 멤버 복제

---

# 7. 자연스러움의 의미를 잘못 해석하지 말 것

기존 지시의:

- natural skin
- candid
- natural light
- 과한 화보 포즈 금지

는

> **평범한 일반인을 만들라는 뜻이 아니다.**

정확한 의미는:

> **매력과 스타성을 유지한 아이돌이 자연스럽게 포착된 순간**

이다.

즉:

```text
K-pop idol visual quality
+
natural believable photography
```

둘 다 필요하다.

둘 중 하나를 버리지 않는다.

---

# 8. 후보 보드는 검토용으로만 허용

14명 얼굴 후보를 제품 오너가 선택하기 쉽게
검토용 Contact Sheet를 만드는 것은 허용한다.

예:

```text
female-casting-face-candidates-v1.jpg
```

그러나:

- 후보 원본은 개별 파일로 보존
- Contact Sheet를 HTML에 사용 금지
- 보드의 라벨이나 번호가 원본 이미지 안에 들어가면 안 됨

추천 표시:

```text
F-MC01-A
F-MC01-B
F-MC01-C
F-MC01-D

F-MC02-A
...
```

라벨은 검토 보드에만 넣는다.

---

# 9. 제품 오너 승인 전 Identity Lock 금지

4-2기가 임의로:

```text
F-MC01 = 이 얼굴 확정
```

이라고 정하지 않는다.

제품 오너가 얼굴 후보를 직접 보고 선택한다.

승인 예시:

```text
F-MC01 = 후보 C
F-MC02 = 후보 A
F-SC01 = 후보 B
F-SC02 = 후보 C
```

승인된 뒤에만:

```text
IDENTITY LOCK
```

을 선언한다.

---

# 10. Identity Lock 후 Scene 생성

얼굴 승인 후에는 동일 인물 기준으로 장면을 만든다.

예:

## F-MC01
- First Moment
- Person Reveal
- 필요 시 Memory Field

## F-MC02
- Save Moment
- 다른 Moment 1~2개

중요:

> 동일 인물은 얼굴을 유지하되 장면은 달라야 한다.

달라질 수 있는 것:

- 표정
- 시선
- 의상
- 머리 연출의 작은 변화
- 장소
- 조명
- 시간대
- camera distance
- 행동

유지해야 하는 것:

- 얼굴 골격
- 눈
- 코
- 입
- 턱
- 전체 identity

---

# 11. 캐스트 다양성 공통지시와 동시 적용

이번 작업은 “예쁜 얼굴을 다시 찾기”만 하는 것이 아니다.

앞서 발행된 공통 지시:

> 반복 얼굴 금지 / 캐스트 다양화 / 데이트앱화 방지

를 그대로 적용한다.

따라서 최종 Dream Memory 세계에서는:

- 여성 Main 2명
- 남성 Main 2명
- 여성 Secondary
- 남성 Secondary
- Pair
- Group
- Ambient

가 서로 다른 캐스트로 체감되어야 한다.

화면 전체가 특정 한 명의 프로필 모음처럼 보이면 FAIL이다.

---

# 12. 현재 Adobe Female Batch 처리

현재 만들어진 Adobe Female Batch 01은:

```text
90_Rejected/
또는
Rejected_Cast/
```

계열에 보존한다.

권장 표기:

```text
Adobe_FemaleBatch01_VISUAL_CAST_FAIL
```

보존 목적:

- 어떤 생성 방식이 LoveTree 캐스팅 목표에서 실패했는지 학습
- 동일한 일반인 lifestyle 방향 반복 방지

금지:

- V1.1 HTML 삽입
- Main/Secondary Identity reference로 재사용
- 다른 팀에서 “이미 만들어진 인물”이라는 이유로 재활용

---

# 13. 지금 당장 하지 말 것

제품 오너 승인 전:

- Male Batch 시작 금지
- 여성 8 Scene 재생성 금지
- HTML V1.1 인물 교체 금지
- Pair/Group 대량 생성 금지
- Adobe로 다른 예쁜 여자 찾기 반복 금지
- 환경 asset 작업 확대 금지

지금 할 일은 단 하나다.

> **여성 캐스트 얼굴 후보 14명 생성 및 제품 오너 캐스팅 승인 요청**

---

# 14. 제출물

이번 Gate 제출:

```text
female-casting-face-candidates-v1.jpg
female-casting-face-manifest-v1.md
```

그리고 각 개별 원본.

Manifest 필수:

- candidate ID
- role target
- generation source
- visual archetype
- major distinguishing features
- similarity warning
- recommended/not-recommended는 가능하지만 최종 선택은 제품 오너가 함

---

# 15. 자동 반려 기준

다음 중 하나라도 해당하면 Gate FAIL.

1. Adobe로 Main/Secondary 얼굴을 다시 생성
2. 14명이 서로 비슷해 보임
3. Pinterest 참고보다 일반인 lifestyle 쪽으로 내려감
4. 스타성 없는 평범한 프로필 사진 느낌
5. 같은 긴 검은 머리 AI 미인형 반복
6. 특정 실제 아이돌 복제
7. 제품 오너 승인 전에 Identity Lock 선언
8. 얼굴 승인 전에 Scene Batch 제작
9. Male Batch 선행
10. HTML V1.1 적용 선행

---

# 16. 최종 목표

Dream Memory의 인물은:

> **화보 모델을 보여주기 위한 장식이 아니라, 좋아하게 된 여러 아이돌 Moment의 주체다.**

따라서 우리는:

- 한 명의 완벽한 얼굴 반복

이 아니라,

- 여러 명의 매력적인 아이돌
- 서로 다른 표정과 분위기
- 관계
- 활동
- 기억
- Moment

가 함께 존재하는 세계를 만들어야 한다.

Pinterest 무드보드에서 느껴졌던:

> **“여러 명의 예쁜 아이돌을 한꺼번에 보는 즐거움”**

을 캐스팅 단계부터 살린다.

---

# 최종 명령

현재 Adobe Female Batch 01은 **VISUAL CAST FAIL**로 반려한다.

Adobe를 여성/남성 Main·Secondary 얼굴 생성에 사용하지 않는다.

Scene 생성도 중단한다.

먼저 Pinterest 기반으로:

```text
F-MC01 후보 4명
F-MC02 후보 4명
F-SC01 후보 3명
F-SC02 후보 3명
= 총 14명
```

의 서로 다른 K-pop 여성 캐스트 얼굴 후보를 만든다.

제품 오너가 얼굴을 선택한 뒤 Identity Lock을 걸고,
그 다음에만 Dream Memory Scene 원본 제작을 재개한다.
