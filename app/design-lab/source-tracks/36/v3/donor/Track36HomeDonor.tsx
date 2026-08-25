"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./track36-home-donor.module.css";
import {
  SOURCE_TRACK_36_CANONICAL_TARGET,
  SOURCE_TRACK_36_DISPOSITION,
  SOURCE_TRACK_36_DONOR_ELEMENTS,
  SOURCE_TRACK_36_EXISTING_NATIVE_COMPARATOR,
  SOURCE_TRACK_36_FAMILY,
} from "@/lib/source-track-36/donor";

const petals = Array.from({ length: 22 }, (_, index) => ({
  id: index,
  left: `${8 + ((index * 17) % 84)}%`,
  top: `${9 + ((index * 23) % 78)}%`,
  delay: `${(index % 7) * 90}ms`,
}));

export default function Track36HomeDonor() {
  const router = useRouter();
  const [entering, setEntering] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  function enterCanonicalHome() {
    if (entering) return;
    setEntering(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timerRef.current = setTimeout(
      () => router.push(SOURCE_TRACK_36_CANONICAL_TARGET),
      reduced ? 0 : 820,
    );
  }

  return (
    <main
      className={`${styles.scope} ${entering ? styles.entering : ""}`}
      data-track36-disposition={SOURCE_TRACK_36_DISPOSITION}
      data-track36-family-anchor={SOURCE_TRACK_36_FAMILY.masterAnchorId}
    >
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/design-lab" aria-label="LoveTree Design Lab">
          <span className={styles.brandMark} aria-hidden="true">✦</span>
          <span>LoveTree</span>
          <small>Track36 V3 donor proof</small>
        </Link>
        <nav className={styles.nav} aria-label="Track36 donor review navigation">
          <Link href={SOURCE_TRACK_36_EXISTING_NATIVE_COMPARATOR}>Track74 비교</Link>
          <Link href={SOURCE_TRACK_36_CANONICAL_TARGET}>현재 /v4</Link>
        </nav>
      </header>

      <section className={styles.stage} aria-labelledby="track36-donor-title">
        <div className={styles.sky} aria-hidden="true" />
        <div className={styles.depth} aria-hidden="true">
          <i /><i /><i /><i />
        </div>
        <div className={styles.petals} aria-hidden="true">
          {petals.map((petal) => (
            <i
              key={petal.id}
              style={{
                left: petal.left,
                top: petal.top,
                animationDelay: petal.delay,
              }}
            />
          ))}
        </div>

        <article className={styles.copy}>
          <p className={styles.eyebrow}>BRIGHT LOCAL ENTRY · DONOR ONLY</p>
          <h1 id="track36-donor-title">
            기억으로 들어가는 순간만,
            <span>Track36에서 빌립니다.</span>
          </h1>
          <p className={styles.summary}>
            밝은 로컬 진입, 겹겹의 깊이 링, 꽃잎과 종이-유리 재질, 짧은 cinematic transition만
            재사용합니다. 로그인, API, DB, 첫 Moment 저장과 returning-user 분기는 기존 /v4가 계속
            소유합니다.
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={enterCanonicalHome} disabled={entering}>
              {entering ? "LoveTree로 연결 중…" : "현재 LoveTree로 들어가기"}
            </button>
            <Link className={styles.secondary} href={SOURCE_TRACK_36_EXISTING_NATIVE_COMPARATOR}>
              Track74 native와 비교
            </Link>
          </div>
          <p className={styles.contract} role="note">
            Canonical target: <code>{SOURCE_TRACK_36_CANONICAL_TARGET}</code> · static/demo iframe 없음 ·
            master 1/2/3은 한 family로만 취급
          </p>
        </article>

        <aside className={styles.portal} aria-label="Track36 donor visual preview">
          <div className={styles.portalGlass}>
            <span className={styles.windowLabel}>CANONICAL PRODUCT SPINE</span>
            <strong>Auth → Tree resolution → first Moment</strong>
            <p>시각 진입만 바뀌고 데이터 권위는 바뀌지 않습니다.</p>
            <ul aria-label="Track36 donor elements">
              {SOURCE_TRACK_36_DONOR_ELEMENTS.slice(0, 4).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}
