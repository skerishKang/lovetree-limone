import type { Track63Connection, Track63Moment, Track63SeedSet } from "./types";

/**
 * 54 Canonical Moments:
 * - 24 Photo (m1..m24)
 * - 12 Video (m25..m36)
 * - 10 Memo (m37..m46)
 * - 8 Link (m47..m54)
 */
export const TRACK63_MOMENTS: readonly Track63Moment[] = [
  // 24 Photo Moments
  { id: "m1", title: "첫 만남의 벤치", mediaType: "photo", subject: "하린", theme: "first-meet", date: "2024-03-12", caption: "봄 햇살 아래 나란히 앉아 처음 이름을 건넸던 오후.", aspectRatio: "4:3", accentColor: "#ff7597", isMainPath: true },
  { id: "m2", title: "벚꽃길 첫 산책", mediaType: "photo", subject: "민서", theme: "first-meet", date: "2024-03-18", caption: "흩날리는 꽃잎 사이로 걸음을 맞추던 순간.", aspectRatio: "1:1", accentColor: "#ff9bb2" },
  { id: "m3", title: "카페 창가 눈맞춤", mediaType: "photo", subject: "하린", theme: "daily", date: "2024-03-25", caption: "창가로 비치는 오후 3시의 커피 잔과 미소.", aspectRatio: "4:3", accentColor: "#fca5a5" },
  { id: "m4", title: "현관 앞 짧은 인사", mediaType: "photo", subject: "지우", theme: "daily", date: "2024-04-02", caption: "헤어지기 아쉬워 문고리를 쥐고 나눈 눈인사.", aspectRatio: "3:4" as any, accentColor: "#fdba74" },
  { id: "m5", title: "비 내리는 버스 정류장", mediaType: "photo", subject: "서윤", theme: "daily", date: "2024-04-10", caption: "투명 우산 아래 맺힌 빗방울과 따뜻한 체온.", aspectRatio: "16:9", accentColor: "#67e8f9" },
  { id: "m6", title: "비밀의 옥상 정원", mediaType: "photo", subject: "민서", theme: "intimate", date: "2024-04-22", caption: "도심의 소음이 아득해지는 우리만의 작은 하늘.", aspectRatio: "4:3", accentColor: "#a7f3d0", isMainPath: true },
  { id: "m7", title: "작은 화분 심던 날", mediaType: "photo", subject: "지우", theme: "growth", date: "2024-05-01", caption: "함께 고른 바질 씨앗을 화분에 묻으며 웃던 날.", aspectRatio: "1:1", accentColor: "#86efac" },
  { id: "m8", title: "서점 골목의 오후", mediaType: "photo", subject: "하린", theme: "daily", date: "2024-05-15", caption: "좋아하는 시집을 꺼내 서로에게 읽어주던 시간.", aspectRatio: "4:3", accentColor: "#93c5fd" },
  { id: "m9", title: "자전거 탄 강변길", mediaType: "photo", subject: "민서", theme: "travel", date: "2024-05-28", caption: "바람을 가르며 달린 한강변의 주황빛 일몰.", aspectRatio: "16:9", accentColor: "#c084fc" },
  { id: "m10", title: "손끝에 닿은 온기", mediaType: "photo", subject: "서윤", theme: "confession", date: "2024-06-05", caption: "밤공기 속 조심스레 맞잡은 두 손.", aspectRatio: "1:1", accentColor: "#f472b6" },
  { id: "m11", title: "빗속 우산 속 고백", mediaType: "photo", subject: "하린", theme: "confession", date: "2024-06-18", caption: "장대비 소리에 숨겨 낮게 속삭인 진심.", aspectRatio: "4:3", accentColor: "#fb7185", isMainPath: true },
  { id: "m12", title: "첫 여행 티켓", mediaType: "photo", subject: "지우", theme: "travel", date: "2024-07-01", caption: "바다로 향하는 기차표를 들고 들뜬 아침.", aspectRatio: "16:9", accentColor: "#38bdf8" },
  { id: "m13", title: "푸른 새벽 동해안", mediaType: "photo", subject: "서윤", theme: "travel", date: "2024-07-14", caption: "수평선 너머 붉게 번져오는 첫 여명.", aspectRatio: "16:9", accentColor: "#818cf8" },
  { id: "m14", title: "해변의 발자국 둘", mediaType: "photo", subject: "민서", theme: "travel", date: "2024-07-22", caption: "파도가 지우지 못하도록 깊게 새긴 발자취.", aspectRatio: "4:3", accentColor: "#a855f7" },
  { id: "m15", title: "여름밤 불꽃놀이", mediaType: "photo", subject: "하린", theme: "celebration", date: "2024-08-04", caption: "밤하늘에 번진 작은 스파클라와 반짝이던 눈.", aspectRatio: "1:1", accentColor: "#e879f9" },
  { id: "m16", title: "야경 속 소원 빌기", mediaType: "photo", subject: "지우", theme: "celebration", date: "2024-08-18", caption: "타워 전망대에서 손을 모으고 나눈 약속.", aspectRatio: "4:3", accentColor: "#f43f5e", isMainPath: true },
  { id: "m17", title: "가을빛 머금은 골목", mediaType: "photo", subject: "서윤", theme: "daily", date: "2024-09-02", caption: "노랗게 물든 은행나무 잎을 손바닥에 얹고.", aspectRatio: "4:3", accentColor: "#f59e0b" },
  { id: "m18", title: "따뜻한 니트와 라떼", mediaType: "photo", subject: "민서", theme: "daily", date: "2024-09-19", caption: "계절이 바뀌어도 변함없는 테이블 맞은편.", aspectRatio: "1:1", accentColor: "#d97706" },
  { id: "m19", title: "100일 기념 저녁", mediaType: "photo", subject: "하린", theme: "anniversary", date: "2024-10-05", caption: "작은 촛불 하나 켜두고 함께 맞이한 첫 백일.", aspectRatio: "4:3", accentColor: "#ec4899", isMainPath: true },
  { id: "m20", title: "단풍 숲 벤치 데이트", mediaType: "photo", subject: "지우", theme: "travel", date: "2024-10-21", caption: "붉은 단풍잎이 떨어지는 고요한 오후.", aspectRatio: "16:9", accentColor: "#ef4444" },
  { id: "m21", title: "첫눈 내리던 교차로", mediaType: "photo", subject: "서윤", theme: "winter", date: "2024-11-15", caption: "횡단보도 건너편에서 손을 흔들던 흰 패딩.", aspectRatio: "4:3", accentColor: "#38bdf8" },
  { id: "m22", title: "목도리 하나로 둘이서", mediaType: "photo", subject: "민서", theme: "winter", date: "2024-12-01", caption: "찬 바람 속에 꼭 붙어 걷던 겨울 저녁.", aspectRatio: "1:1", accentColor: "#60a5fa" },
  { id: "m23", title: "크리스마스 트리 앞", mediaType: "photo", subject: "하린", theme: "celebration", date: "2024-12-24", caption: "반짝이는 대형 트리 조명 아래 남긴 한 장.", aspectRatio: "4:3", accentColor: "#10b981", isMainPath: true },
  { id: "m24", title: "새해 첫 해돋이 약속", mediaType: "photo", subject: "지우", theme: "milestone", date: "2025-01-01", caption: "새로운 한 해도 서로의 곁에 있기를 다짐하며.", aspectRatio: "16:9", accentColor: "#f59e0b" },

  // 12 Video Moments
  { id: "m25", title: "공원 버스킹 즉흥 연주", mediaType: "video", subject: "하린", theme: "stage", date: "2024-03-30", caption: "통기타 멜로디에 맞춰 손뼉 치던 봄날의 기록.", aspectRatio: "16:9", accentColor: "#f43f5e", videoSrc: "video-busking-01.mp4" },
  { id: "m26", title: "카페 어쿠스틱 라이브", mediaType: "video", subject: "민서", theme: "stage", date: "2024-04-15", caption: "작은 무대 위, 관객들의 숨소리마저 음악이 되던 밤.", aspectRatio: "16:9", accentColor: "#ec4899", videoSrc: "video-acoustic-02.mp4", isMainPath: true },
  { id: "m27", title: "스튜디오 리허설 클립", mediaType: "video", subject: "지우", theme: "stage", date: "2024-05-10", caption: "땀방울과 웃음이 교차하던 녹음실 리허설 컷.", aspectRatio: "16:9", accentColor: "#d946ef", videoSrc: "video-rehearsal-03.mp4" },
  { id: "m28", title: "해변 모닥불 노래", mediaType: "video", subject: "서윤", theme: "travel", date: "2024-07-16", caption: "타오르는 장작 소리와 파도 소리가 어우러진 노래.", aspectRatio: "16:9", accentColor: "#a855f7", videoSrc: "video-bonfire-04.mp4" },
  { id: "m29", title: "소극장 쇼케이스 인트로", mediaType: "video", subject: "하린", theme: "stage", date: "2024-08-20", caption: "암전 속 조명이 켜지며 시작된 떨리는 첫 곡.", aspectRatio: "16:9", accentColor: "#8b5cf6", videoSrc: "video-showcase-05.mp4", isMainPath: true },
  { id: "m30", title: "메인 코러스 하이라이트", mediaType: "video", subject: "민서", theme: "stage", date: "2024-08-20", caption: "관객 모두가 한목소리로 따라 부르던 절정의 순간.", aspectRatio: "16:9", accentColor: "#6366f1", videoSrc: "video-chorus-06.mp4" },
  { id: "m31", title: "백스테이지 서프라이즈", mediaType: "video", subject: "지우", theme: "intimate", date: "2024-08-20", caption: "공연 직후 대기실 문을 열며 터져 나온 감격의 포옹.", aspectRatio: "16:9", accentColor: "#3b82f6", videoSrc: "video-backstage-07.mp4" },
  { id: "m32", title: "빗속 재즈 페스티벌", mediaType: "video", subject: "서윤", theme: "travel", date: "2024-09-12", caption: "우비를 입고 음악에 맞춰 리듬을 타던 야외 잔디밭.", aspectRatio: "16:9", accentColor: "#0ea5e9", videoSrc: "video-jazz-08.mp4" },
  { id: "m33", title: "피아노 듀엣 즉흥곡", mediaType: "video", subject: "하린", theme: "daily", date: "2024-10-14", caption: "건반 위에 나란히 얹은 손으로 만든 첫 멜로디.", aspectRatio: "16:9", accentColor: "#06b6d4", videoSrc: "video-piano-09.mp4", isMainPath: true },
  { id: "m34", title: "연말 갈라 콘서트 피날레", mediaType: "video", subject: "민서", theme: "celebration", date: "2024-12-28", caption: "금빛 컨페티가 쏟아져 내리던 화려한 피날레 무대.", aspectRatio: "16:9", accentColor: "#14b8a6", videoSrc: "video-finale-10.mp4" },
  { id: "m35", title: "카운트다운 순간 스케치", mediaType: "video", subject: "지우", theme: "celebration", date: "2024-12-31", caption: "5, 4, 3, 2, 1 함성과 함께 터진 환호의 순간.", aspectRatio: "16:9", accentColor: "#10b981", videoSrc: "video-countdown-11.mp4" },
  { id: "m36", title: "새벽 드라이브 브이로그", mediaType: "video", subject: "서윤", theme: "daily", date: "2025-01-10", caption: "가로등 불빛이 흐르는 고속도로 위의 나지막한 대화.", aspectRatio: "16:9", accentColor: "#84cc16", videoSrc: "video-drive-12.mp4" },

  // 10 Memo Moments
  { id: "m37", title: "영수증 뒷면의 낙서", mediaType: "memo", subject: "하린", theme: "first-meet", date: "2024-03-12", caption: "그날 마신 커피 영수증에 몰래 적어둔 전화번호.", memoText: "‘오늘 날씨가 좋아서 다행이었어요. 다음에 또 커피 마셔요.’ 영수증 한구석에 볼펜으로 꾹꾹 눌러쓴 글씨.", aspectRatio: "1:1", accentColor: "#fbbf24" },
  { id: "m38", title: "노트북에 붙은 노란 포스트잇", mediaType: "memo", subject: "민서", theme: "daily", date: "2024-04-18", caption: "야근하던 밤 모니터 옆에 붙어 있던 따뜻한 응원.", memoText: "‘너무 무리하지 마요. 서랍 안에 초콜릿 넣어뒀어요. 오늘도 고생 많았어요.’", aspectRatio: "1:1", accentColor: "#f59e0b", isMainPath: true },
  { id: "m39", title: "서로에게 쓴 짧은 시 한 편", mediaType: "memo", subject: "지우", theme: "intimate", date: "2024-05-20", caption: "다이어리 맨 뒷장에 남겨둔 네 줄의 시.", memoText: "바람이 불어오는 쪽으로 고개를 돌리면 / 언제나 네가 서 있었다. / 계절이 지나가도 / 이 자리는 비워두지 않을게.", aspectRatio: "1:1", accentColor: "#ea580c" },
  { id: "m40", title: "화해하던 날 건넨 쪽지", mediaType: "memo", subject: "서윤", theme: "daily", date: "2024-06-12", caption: "서운했던 마음을 풀고 카페 냅킨에 적어 건넨 진심.", memoText: "‘내가 먼저 이해해주지 못해서 미안해. 네 마음이 아팠을 텐데 내 생각만 했어. 손잡고 걷자.’", aspectRatio: "1:1", accentColor: "#e11d48" },
  { id: "m41", title: "기차 안에서 나눈 버킷리스트", mediaType: "memo", subject: "하린", theme: "travel", date: "2024-07-02", caption: "바다로 가는 길, 스마트폰 메모장에 채운 10가지 소원.", memoText: "1. 새벽 바다 달리기 2. 모래사장에 이름 쓰기 3. 조개껍데기 목걸이 만들기 4. 밤하늘 별 헤기 5. 1년 뒤 다시 오기.", aspectRatio: "1:1", accentColor: "#be185d", isMainPath: true },
  { id: "m42", title: "100일 기념 손편지 발췌", mediaType: "memo", subject: "민서", theme: "anniversary", date: "2024-10-05", caption: "두툼한 편지봉투 속 가장 마음을 울렸던 한 줄.", memoText: "‘100일이라는 숫자보다 더 소중한 건, 매일 네가 내 일상이 되어준 기적 같은 시간들이야.’", aspectRatio: "1:1", accentColor: "#9d174d" },
  { id: "m43", title: "겨울밤 핫팩에 적힌 낙서", mediaType: "memo", subject: "지우", theme: "winter", date: "2024-11-20", caption: "주머니에서 꺼내준 핫팩 겉면에 그려진 웃는 얼굴.", memoText: "‘손 시려우면 꼭 쥐고 있어. 감기 걸리면 절대 안 돼!’ 유성매직으로 그린 서투른 하트 스마일.", aspectRatio: "1:1", accentColor: "#831843" },
  { id: "m44", title: "자작곡 첫 가사 초안", mediaType: "memo", subject: "서윤", theme: "stage", date: "2024-12-05", caption: "새벽 3시 연습장 구석에 끄적여 내려간 멜로디 가사.", memoText: "‘너를 만나기 전엔 세상이 흑백인 줄 알았어 / 네가 웃어주었을 때 온 세상에 색이 번졌지’", aspectRatio: "1:1", accentColor: "#701a75" },
  { id: "m45", title: "크리스마스 카드 뒷장", mediaType: "memo", subject: "하린", theme: "celebration", date: "2024-12-25", caption: "선물 상자 밑에 깔려 있던 정성스런 카드.", memoText: "‘올 한 해 가장 잘한 일은 너의 손을 놓지 않은 것. 내년 크리스마스도 꼭 같이 보내자.’", aspectRatio: "1:1", accentColor: "#4a044e", isMainPath: true },
  { id: "m46", title: "새해 목표 1번", mediaType: "memo", subject: "민서", theme: "milestone", date: "2025-01-01", caption: "다이어리 첫 페이지를 장식한 다짐.", memoText: "‘1. 더 많이 웃게 해주기. 2. 바빠도 하루 한 번 목소리 듣기. 3. 힘든 날엔 말없이 안아주기.’", aspectRatio: "1:1", accentColor: "#3b0764" },

  // 8 Link Moments
  { id: "m47", title: "공동 플레이리스트 스트리밍", mediaType: "link", subject: "하린", theme: "daily", date: "2024-03-15", caption: "둘만의 곡들로 채운 스트리밍 플레이리스트 링크.", linkUrl: "https://music.example.com/playlist/our-spring-2024", linkDomain: "music.example.com", aspectRatio: "16:9", accentColor: "#0284c7" },
  { id: "m48", title: "우리가 고른 독립출판 사진집", mediaType: "link", subject: "민서", theme: "intimate", date: "2024-04-29", caption: "소장하기로 약속했던 독립 출판사 아트북 페이지.", linkUrl: "https://books.example.com/art/seoul-analog-love", linkDomain: "books.example.com", aspectRatio: "16:9", accentColor: "#0369a1" },
  { id: "m49", title: "여름 펜션 예약 확정 페이지", mediaType: "link", subject: "지우", theme: "travel", date: "2024-06-25", caption: "바다가 보이는 하얀 독채 펜션 예약 내역.", linkUrl: "https://stay.example.com/booking/ocean-breeze-0714", linkDomain: "stay.example.com", aspectRatio: "16:9", accentColor: "#075985", isMainPath: true },
  { id: "m50", title: "쇼케이스 티켓 예매 증명", mediaType: "link", subject: "서윤", theme: "stage", date: "2024-08-01", caption: "1열 정중앙 좌석을 성공했던 예매 완료 화면.", linkUrl: "https://ticket.example.com/seat/showcase-row1-center", linkDomain: "ticket.example.com", aspectRatio: "16:9", accentColor: "#0c4a6e" },
  { id: "m51", title: "기념일 레스토랑 예약 바우처", mediaType: "link", subject: "하린", theme: "anniversary", date: "2024-09-28", caption: "창가 석으로 특별 요청해 예약한 코스 디너.", linkUrl: "https://dining.example.com/voucher/100days-candle", linkDomain: "dining.example.com", aspectRatio: "16:9", accentColor: "#1e3a8a" },
  { id: "m52", title: "함께 만든 디지털 포토북", mediaType: "link", subject: "민서", theme: "growth", date: "2024-11-10", caption: "봄부터 가을까지의 사진을 엮은 클라우드 앨범.", linkUrl: "https://cloud.example.com/album/our-first-season", linkDomain: "cloud.example.com", aspectRatio: "16:9", accentColor: "#172554", isMainPath: true },
  { id: "m53", title: "새해 카운트다운 라이브 링크", mediaType: "link", subject: "지우", theme: "celebration", date: "2024-12-30", caption: "실시간 타종 행사를 함께 보았던 온라인 스트림.", linkUrl: "https://live.example.com/broadcast/bell-2025", linkDomain: "live.example.com", aspectRatio: "16:9", accentColor: "#312e81" },
  { id: "m54", title: "LoveTree 공유 아카이브 허브", mediaType: "link", subject: "서윤", theme: "milestone", date: "2025-01-15", caption: "54개의 기억을 영구 보존하는 공식 공유 허브.", linkUrl: "https://lovetree.example.com/archive/tree-54-final", linkDomain: "lovetree.example.com", aspectRatio: "16:9", accentColor: "#3730a3" },
];

export const TRACK63_MOMENT_BY_ID = new Map(
  TRACK63_MOMENTS.map((m) => [m.id, m]),
);

/**
 * 8 Canonical Seed Sets:
 * Each represents a curated subset of the master 54 moments.
 */
export const TRACK63_SEED_SETS: readonly Track63SeedSet[] = [
  {
    id: "mixed-54",
    label: "전체 54 모먼트 (Full Archive)",
    description: "사진 24, 영상 12, 메모 10, 링크 8 전체 컬렉션",
    momentIds: TRACK63_MOMENTS.map((m) => m.id),
  },
  {
    id: "romantic",
    label: "로맨틱 모먼트 (Romantic Arc)",
    description: "첫 만남, 고백, 기념일, 겨울 저녁의 따뜻한 순간들",
    momentIds: [
      "m1", "m2", "m3", "m4", "m6", "m10", "m11", "m15", "m16", "m19",
      "m22", "m23", "m24", "m26", "m29", "m31", "m33", "m37", "m38", "m39",
      "m40", "m42", "m43", "m45", "m46", "m47", "m51", "m52",
    ],
  },
  {
    id: "stage-performance",
    label: "공연 & 음악 여정 (Stage & Sound)",
    description: "버스킹, 합주, 쇼케이스, 라이브 무대 중심 컬렉션",
    momentIds: [
      "m8", "m15", "m25", "m26", "m27", "m28", "m29", "m30", "m31", "m32",
      "m33", "m34", "m35", "m44", "m47", "m50", "m53", "m3", "m6", "m11",
      "m16", "m19", "m23", "m54",
    ],
  },
  {
    id: "daily-life",
    label: "소소한 일상 기록 (Daily Warmth)",
    description: "창가 카페, 골목길, 서점, 포스트잇 쪽지 등 일상 모먼트",
    momentIds: [
      "m1", "m3", "m4", "m5", "m7", "m8", "m17", "m18", "m21", "m22",
      "m33", "m36", "m37", "m38", "m40", "m43", "m46", "m47", "m48", "m52",
      "m6", "m10",
    ],
  },
  {
    id: "milestone",
    label: "기념일 & 터닝포인트 (Milestones)",
    description: "첫 만남, 100일, 크리스마스, 새해 카운트다운 핵심 지점",
    momentIds: [
      "m1", "m6", "m11", "m16", "m19", "m23", "m24", "m26", "m29", "m33",
      "m34", "m41", "m42", "m45", "m49", "m52",
    ],
  },
  {
    id: "acoustic-sessions",
    label: "어쿠스틱 & 리허설 세션 (Acoustic)",
    description: "통기타, 피아노, 미공개 연습실 클립과 손글씨 가사",
    momentIds: [
      "m25", "m26", "m27", "m28", "m30", "m31", "m33", "m39", "m44", "m47",
      "m50", "m2", "m5", "m9", "m14", "m18", "m22", "m36",
    ],
  },
  {
    id: "travel-odyssey",
    label: "바다 & 여행 오디세이 (Travel Odyssey)",
    description: "기차 티켓, 동해안 일출, 야경, 펜션 예약 기록",
    momentIds: [
      "m9", "m12", "m13", "m14", "m20", "m28", "m32", "m36", "m41", "m48",
      "m49", "m54", "m1", "m5", "m8", "m15", "m17", "m21", "m24", "m35",
    ],
  },
  {
    id: "curated-highlights",
    label: "큐레이티드 하이라이트 (14 Core Moments)",
    description: "LoveTree 전체 서사를 관통하는 가장 핵심적인 14개 순간",
    momentIds: [
      "m1", "m6", "m11", "m16", "m19", "m23", "m26", "m29", "m33", "m38",
      "m41", "m45", "m49", "m52",
    ],
  },
];

/**
 * 57 Canonical Connections:
 * Sequential, Main Path, and Cross-theme associative edges.
 */
export const TRACK63_CONNECTIONS: readonly Track63Connection[] = [
  // 12 Main Path edges (m1 -> m6 -> m11 -> m16 -> m19 -> m23 -> m26 -> m29 -> m33 -> m38 -> m41 -> m45 -> m49)
  { id: "c1", sourceId: "m1", targetId: "m6", relation: "main-path", whyNext: "첫 만남의 설렘이 둘만의 비밀 공간으로 이어집니다.", strength: 1.0 },
  { id: "c2", sourceId: "m6", targetId: "m11", relation: "main-path", whyNext: "비밀 정원의 대화가 빗속 고백으로 깊어집니다.", strength: 1.0 },
  { id: "c3", sourceId: "m11", targetId: "m16", relation: "main-path", whyNext: "고백 후 첫 여름밤 타워 야경에서 소원을 빕니다.", strength: 1.0 },
  { id: "c4", sourceId: "m16", targetId: "m19", relation: "main-path", whyNext: "여름의 약속이 가을 100일 기념 저녁으로 완성됩니다.", strength: 1.0 },
  { id: "c5", sourceId: "m19", targetId: "m23", relation: "main-path", whyNext: "100일의 감사가 첫 크리스마스 트리 앞에서 빛납니다.", strength: 1.0 },
  { id: "c6", sourceId: "m23", targetId: "m26", relation: "main-path", whyNext: "연말의 온기가 새봄 어쿠스틱 라이브 무대로 도약합니다.", strength: 0.95 },
  { id: "c7", sourceId: "m26", targetId: "m29", relation: "main-path", whyNext: "소규모 카페 라이브에서 소극장 쇼케이스로 무대를 넓힙니다.", strength: 0.95 },
  { id: "c8", sourceId: "m29", targetId: "m33", relation: "main-path", whyNext: "쇼케이스 성공 후 둘만의 피아노 즉흥 듀엣이 탄생합니다.", strength: 0.9 },
  { id: "c9", sourceId: "m33", targetId: "m38", relation: "main-path", whyNext: "음악 속 응원이 야근하는 밤 노란 포스트잇으로 전해집니다.", strength: 0.9 },
  { id: "c10", sourceId: "m38", targetId: "m41", relation: "main-path", whyNext: "지친 일상 끝에 기차를 타고 떠나는 버킷리스트 여행.", strength: 0.9 },
  { id: "c11", sourceId: "m41", targetId: "m45", relation: "main-path", whyNext: "여행의 버킷리스트가 두 번째 크리스마스 카드로 결실을 맺습니다.", strength: 0.9 },
  { id: "c12", sourceId: "m45", targetId: "m49", relation: "main-path", whyNext: "서로의 진심이 다음 해 여름 펜션 예약으로 이어집니다.", strength: 0.9 },

  // Sequential photo edges (m1 -> m2 -> ... -> m24)
  { id: "c13", sourceId: "m1", targetId: "m2", relation: "chronological", whyNext: "벤치에서의 첫 대화 후 이어진 벚꽃길 산책.", strength: 0.8 },
  { id: "c14", sourceId: "m2", targetId: "m3", relation: "chronological", whyNext: "산책을 마치고 들어간 카페 창가의 햇살.", strength: 0.8 },
  { id: "c15", sourceId: "m3", targetId: "m4", relation: "chronological", whyNext: "카페 데이트 후 헤어지기 아쉬운 현관 앞 인사.", strength: 0.75 },
  { id: "c16", sourceId: "m4", targetId: "m5", relation: "chronological", whyNext: "비 내리는 정류장에서 함께 버스를 기다리던 시간.", strength: 0.75 },
  { id: "c17", sourceId: "m5", targetId: "m7", relation: "chronological", whyNext: "비 온 뒤 맑아진 날 함께 심은 작은 바질 화분.", strength: 0.7 },
  { id: "c18", sourceId: "m7", targetId: "m8", relation: "chronological", whyNext: "화분을 가꾸고 서점 골목으로 떠난 주말 데이트.", strength: 0.7 },
  { id: "c19", sourceId: "m8", targetId: "m9", relation: "chronological", whyNext: "서점 산책 후 강변길을 시원하게 달린 자전거 데이트.", strength: 0.75 },
  { id: "c20", sourceId: "m9", targetId: "m10", relation: "chronological", whyNext: "노을빛 아래 자전거를 멈추고 조심스레 맞잡은 손.", strength: 0.85 },
  { id: "c21", sourceId: "m10", targetId: "m12", relation: "chronological", whyNext: "손을 잡은 뒤 함께 계획한 첫 바다 기차 여행.", strength: 0.8 },
  { id: "c22", sourceId: "m12", targetId: "m13", relation: "chronological", whyNext: "기차를 타고 도착한 동해안의 푸른 새벽 여명.", strength: 0.85 },
  { id: "c23", sourceId: "m13", targetId: "m14", relation: "chronological", whyNext: "일출을 바라보며 해변 모래사장에 남긴 두 발자국.", strength: 0.85 },
  { id: "c24", sourceId: "m14", targetId: "m15", relation: "chronological", whyNext: "해변의 밤을 수놓은 작은 불꽃놀이 스파클라.", strength: 0.8 },
  { id: "c25", sourceId: "m15", targetId: "m17", relation: "chronological", whyNext: "여름의 열기가 지나가고 찾아온 가을 은행잎 골목.", strength: 0.75 },
  { id: "c26", sourceId: "m17", targetId: "m18", relation: "chronological", whyNext: "가을바람에 포근한 니트를 입고 마신 따뜻한 라떼.", strength: 0.75 },
  { id: "c27", sourceId: "m18", targetId: "m20", relation: "chronological", whyNext: "라떼를 테이크아웃해 찾아간 붉은 단풍 숲 벤치.", strength: 0.8 },
  { id: "c28", sourceId: "m20", targetId: "m21", relation: "chronological", whyNext: "단풍이 지고 하얗게 내리기 시작한 첫눈 교차로.", strength: 0.85 },
  { id: "c29", sourceId: "m21", targetId: "m22", relation: "chronological", whyNext: "첫눈 오는 날 목도리 하나를 둘이 나눠 두르고 걸음.", strength: 0.85 },
  { id: "c30", sourceId: "m22", targetId: "m24", relation: "chronological", whyNext: "겨울밤의 온기를 모아 맞이한 새해 첫 해돋이 약속.", strength: 0.9 },

  // Video performance & narrative edges (m25 -> m27 -> m28 -> m30 -> m31 -> m32 -> m34 -> m35 -> m36)
  { id: "c31", sourceId: "m25", targetId: "m27", relation: "stage-flow", whyNext: "공원 버스킹의 호응에 힘입어 시작된 정식 녹음실 리허설.", strength: 0.8 },
  { id: "c32", sourceId: "m27", targetId: "m28", relation: "stage-flow", whyNext: "스튜디오 리허설을 마치고 해변 모닥불 앞에서 나눈 어쿠스틱 세션.", strength: 0.8 },
  { id: "c33", sourceId: "m28", targetId: "m30", relation: "stage-flow", whyNext: "모닥불 감성이 소극장 메인 코러스 떼창으로 증폭됩니다.", strength: 0.85 },
  { id: "c34", sourceId: "m30", targetId: "m31", relation: "stage-flow", whyNext: "절정의 코러스 무대 직후 대기실에서 터진 감격의 환호.", strength: 0.9 },
  { id: "c35", sourceId: "m31", targetId: "m32", relation: "stage-flow", whyNext: "쇼케이스 성료 후 가을 빗속 재즈 페스티벌 무대로 확장.", strength: 0.8 },
  { id: "c36", sourceId: "m32", targetId: "m34", relation: "stage-flow", whyNext: "재즈 페스티벌의 열정이 연말 갈라 콘서트 피날레로 이어짐.", strength: 0.85 },
  { id: "c37", sourceId: "m34", targetId: "m35", relation: "stage-flow", whyNext: "갈라 콘서트 엔딩 후 이어진 새해 카운트다운의 함성.", strength: 0.9 },
  { id: "c38", sourceId: "m35", targetId: "m36", relation: "stage-flow", whyNext: "카운트다운 파티를 마치고 달린 고요한 새벽 드라이브.", strength: 0.75 },

  // Memo & intimacy associative connections
  { id: "c39", sourceId: "m1", targetId: "m37", relation: "memo-anchor", whyNext: "첫 만남의 벤치에서 커피를 마시며 영수증에 적은 첫 메모.", strength: 0.85 },
  { id: "c40", sourceId: "m3", targetId: "m38", relation: "memo-anchor", whyNext: "카페 창가의 다정함이 지친 날의 포스트잇 응원으로.", strength: 0.8 },
  { id: "c41", sourceId: "m6", targetId: "m39", relation: "memo-anchor", whyNext: "비밀 옥상 정원에서 낭독한 네 줄의 자작시.", strength: 0.85 },
  { id: "c42", sourceId: "m11", targetId: "m40", relation: "memo-anchor", whyNext: "고백 이후 사소한 다툼을 풀며 냅킨에 건넨 손글씨 쪽지.", strength: 0.8 },
  { id: "c43", sourceId: "m12", targetId: "m41", relation: "memo-anchor", whyNext: "첫 기차표를 끊고 메모장에 빼곡히 적은 여행 버킷리스트.", strength: 0.9 },
  { id: "c44", sourceId: "m19", targetId: "m42", relation: "memo-anchor", whyNext: "100일 기념 저녁 식사 자리에서 낭독한 손편지.", strength: 0.95 },
  { id: "c45", sourceId: "m22", targetId: "m43", relation: "memo-anchor", whyNext: "목도리를 나눠 두른 겨울밤 주머니 속 핫팩에 남긴 낙서.", strength: 0.85 },
  { id: "c46", sourceId: "m27", targetId: "m44", relation: "memo-anchor", whyNext: "리허설 도중 악보 여백에 메모한 신곡 첫 가사 초안.", strength: 0.8 },
  { id: "c47", sourceId: "m23", targetId: "m45", relation: "memo-anchor", whyNext: "크리스마스 트리 아래 선물과 함께 놓인 카드 뒷장.", strength: 0.9 },
  { id: "c48", sourceId: "m24", targetId: "m46", relation: "memo-anchor", whyNext: "새해 첫 해돋이를 보며 다이어리 1번에 적은 약속.", strength: 0.9 },

  // Link & digital archive connections
  { id: "c49", sourceId: "m2", targetId: "m47", relation: "digital-link", whyNext: "벚꽃길을 걸으며 함께 들었던 노래들을 담은 플레이리스트.", strength: 0.75 },
  { id: "c50", sourceId: "m8", targetId: "m48", relation: "digital-link", whyNext: "서점 골목에서 함께 주문한 독립출판 감성 사진집.", strength: 0.75 },
  { id: "c51", sourceId: "m12", targetId: "m49", relation: "digital-link", whyNext: "첫 기차 여행에서 예약한 바닷가 독채 펜션 바우처.", strength: 0.85 },
  { id: "c52", sourceId: "m29", targetId: "m50", relation: "digital-link", whyNext: "첫 소극장 쇼케이스 1열 예매에 성공했던 티켓 링크.", strength: 0.9 },
  { id: "c53", sourceId: "m19", targetId: "m51", relation: "digital-link", whyNext: "100일 기념 코스 요리를 사전 예약했던 다이닝 바우처.", strength: 0.9 },
  { id: "c54", sourceId: "m20", targetId: "m52", relation: "digital-link", whyNext: "가을 단풍 여행까지의 사진을 엮어 제작한 디지털 포토북.", strength: 0.85 },
  { id: "c55", sourceId: "m35", targetId: "m53", relation: "digital-link", whyNext: "새해 카운트다운을 함께 지켜보았던 실시간 방송 스트림.", strength: 0.8 },
  { id: "c56", sourceId: "m24", targetId: "m54", relation: "digital-link", whyNext: "새해 다짐과 함께 54개 모먼트를 보존한 LoveTree 아카이브.", strength: 0.95 },
  { id: "c57", sourceId: "m52", targetId: "m54", relation: "digital-link", whyNext: "디지털 포토북이 최종 canonical LoveTree 아카이브로 통합됨.", strength: 1.0 },
];
