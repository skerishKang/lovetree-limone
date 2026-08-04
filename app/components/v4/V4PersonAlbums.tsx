"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PEOPLE = [
  { id: "juyeon", name: "주연", group: "사람", moments: 84, trees: 3, archive: "motion", color: "#b75f72", videoId: "dQw4w9WgXcQ", note: "처음 마음이 멈춘 장면부터 오래 간직할 문장까지" },
  { id: "summer", name: "여름의 여행", group: "여행", moments: 42, trees: 2, archive: "orbit", color: "#658f8a", videoId: "ysz5S6PUM-U", note: "바다와 기차, 밤 산책이 이어진 계절의 앨범" },
  { id: "music", name: "다시 찾은 노래", group: "작품", moments: 61, trees: 4, archive: "accordion", color: "#856aa9", videoId: "M7lc1UVf-VE", note: "추천을 따라가며 발견한 음악과 마음의 순서" },
  { id: "family", name: "우리 가족", group: "사람", moments: 116, trees: 5, archive: "folding", color: "#a47d55", videoId: "aqz-KE-bpKQ", note: "사진과 영상, 함께 나눈 문장을 사람별 책으로 보관" },
  { id: "books", name: "문장이 남은 책", group: "작품", moments: 37, trees: 2, archive: "accordion", color: "#7f8d67", videoId: "ScMzIvxBSi4", note: "오래 밑줄 친 문장과 다시 펼친 페이지" },
  { id: "friends", name: "친구들과 보낸 밤", group: "사람", moments: 53, trees: 3, archive: "motion", color: "#b96f8b", videoId: "jNQXAC9IVRw", note: "짧은 영상과 웃음이 물결처럼 이어지는 기록" },
  { id: "places", name: "다시 가고 싶은 장소", group: "여행", moments: 28, trees: 2, archive: "orbit", color: "#5f8998", videoId: "aqz-KE-bpKQ", note: "지도보다 먼저 마음에 남은 장소의 순간들" },
  { id: "season", name: "첫 번째 계절", group: "계절", moments: 76, trees: 1, archive: "folding", color: "#a87367", videoId: "dQw4w9WgXcQ", note: "하나의 나무 안에서 완성한 첫 시즌의 대표 기억" },
];

const ROUTES: Record<string, string> = {
  motion: "/v4/subjects/demo/motion",
  orbit: "/v4/subjects/demo/orbit",
  accordion: "/v4/subjects/demo/accordion",
  folding: "/v4/subjects/demo/folding",
};

export default function V4PersonAlbums() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("전체");
  const groups = ["전체", ...new Set(PEOPLE.map((person) => person.group))];
  const filtered = useMemo(() => PEOPLE.filter((person) =>
    (group === "전체" || person.group === group) &&
    (!query.trim() || `${person.name} ${person.note}`.includes(query.trim())),
  ), [group, query]);

  const totalMoments = PEOPLE.reduce((sum, person) => sum + person.moments, 0);
  const totalTrees = PEOPLE.reduce((sum, person) => sum + person.trees, 0);

  return (
    <main className="v4-archive-page">
      <div className="v4-archive-app">
        <header className="v4-archive-top">
          <Link href="/v4/trees/demo">← 성장 트리</Link>
          <Link className="v4-archive-brand" href="/v4">LoveTree</Link>
          <div className="v4-archive-title"><strong>사람과 대상의 앨범</strong><small>PERSON ALBUMS · SEARCH · FILTER · ARCHIVE ENTRY</small></div>
          <Link className="v4-archive-link" href="/v4/subjects/demo/motion">Motion</Link>
          <Link className="v4-archive-link" href="/v4/subjects/demo/orbit">Orbit</Link>
          <Link className="v4-archive-link" href="/v4/subjects/demo/accordion">Accordion</Link>
          <Link className="v4-archive-link" href="/v4/subjects/demo/folding">Folding</Link>
        </header>

        <section className="v4-archive-intro">
          <div><p>PERSON & SUBJECT LIBRARY</p><h1>마음이 향한 대상을<br /><em>각자의 앨범으로</em> 모아요.</h1><span>사람, 작품, 여행과 계절마다 다른 기록의 밀도를 한눈에 보고, 그 대상에 어울리는 감상 방식으로 들어갑니다.</span></div>
          <div className="v4-archive-guide"><b>검색</b><b>사람 필터</b><b>요약 통계</b><b>앨범 진입</b></div>
        </section>

        <div className="v4-people-toolbar">
          <input className="v4-people-search" type="search" placeholder="사람, 작품, 장소와 문장을 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
          {groups.map((item) => <button className={`v4-people-chip${group === item ? " is-selected" : ""}`} type="button" key={item} onClick={() => setGroup(item)}>{item}</button>)}
        </div>

        <div className="v4-people-stats">
          <div className="v4-people-stat"><b>{PEOPLE.length}</b><span>사람·대상 앨범</span></div>
          <div className="v4-people-stat"><b>{totalMoments}</b><span>모인 순간</span></div>
          <div className="v4-people-stat"><b>{totalTrees}</b><span>연결된 트리</span></div>
          <div className="v4-people-stat"><b>4</b><span>감상 아카이브</span></div>
        </div>

        <section className="v4-person-grid" aria-label="사람과 대상별 앨범">
          {filtered.map((person) => (
            <button className="v4-person-card" type="button" key={person.id} onClick={() => router.push(ROUTES[person.archive])}>
              <div className="v4-person-card-image" style={{ backgroundImage: `linear-gradient(180deg,rgba(255,255,255,.02),rgba(24,14,19,.22)),url(https://img.youtube.com/vi/${person.videoId}/hqdefault.jpg)` }} />
              <div className="v4-person-card-shade" />
              <span className="v4-person-heart" style={{ color: person.color }} aria-hidden="true">♥</span>
              <div className="v4-person-card-copy">
                <small>{person.group.toUpperCase()} · {person.moments} MOMENTS · {person.trees} TREES</small>
                <strong>{person.name}</strong>
                <span>{person.note}</span>
              </div>
            </button>
          ))}
        </section>
      </div>
    </main>
  );
}
