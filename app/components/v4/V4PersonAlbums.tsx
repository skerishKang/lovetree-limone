"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { V4_SUBJECT_ALBUMS, V4_SUBJECT_ARCHIVE_ROUTES, v4SubjectPosterUrl } from "./v4-subject-albums";

export default function V4PersonAlbums() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("전체");
  const groups = ["전체", ...new Set(V4_SUBJECT_ALBUMS.map((person) => person.group))];
  const filtered = useMemo(() => V4_SUBJECT_ALBUMS.filter((person) =>
    (group === "전체" || person.group === group) &&
    (!query.trim() || `${person.name} ${person.note}`.includes(query.trim())),
  ), [group, query]);

  const totalMoments = V4_SUBJECT_ALBUMS.reduce((sum, person) => sum + person.moments, 0);
  const totalTrees = V4_SUBJECT_ALBUMS.reduce((sum, person) => sum + person.trees, 0);

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
          <div className="v4-people-stat"><b>{V4_SUBJECT_ALBUMS.length}</b><span>사람·대상 앨범</span></div>
          <div className="v4-people-stat"><b>{totalMoments}</b><span>모인 순간</span></div>
          <div className="v4-people-stat"><b>{totalTrees}</b><span>연결된 트리</span></div>
          <div className="v4-people-stat"><b>4</b><span>감상 아카이브</span></div>
        </div>

        <section className="v4-person-grid" aria-label="사람과 대상별 앨범">
          {filtered.map((person) => (
            <button className="v4-person-card" type="button" key={person.id} onClick={() => router.push(V4_SUBJECT_ARCHIVE_ROUTES[person.archive])}>
              <div className="v4-person-card-image" style={{ backgroundImage: `linear-gradient(180deg,rgba(255,255,255,.02),rgba(24,14,19,.22)),url(${v4SubjectPosterUrl(person)})` }} />
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
