'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SOURCE_TRACK_24_V1_DONOR } from '@/lib/sourceTrack24V1DonorNative';
import styles from './SourceTrack24V1DonorNativePage.module.css';

const stages = [
  {
    eyebrow: '01 · CAPTURE',
    title: '기억을 고릅니다',
    body: '사진과 영상을 고르는 첫 단계를 짧고 명확하게 유지합니다. 이 proof에서는 실제 업로드나 저장을 흉내 내지 않습니다.',
  },
  {
    eyebrow: '02 · COMPOSE',
    title: '장면의 의미를 붙입니다',
    body: 'Track24의 단계형 흐름을 가져오되 타이머 기반 가짜 처리 대신 LoveTree의 canonical Moment 흐름으로 넘길 준비만 보여줍니다.',
  },
  {
    eyebrow: '03 · REVIEW',
    title: '저장 전에 다시 봅니다',
    body: '영상과 기억의 관계를 한 번 더 확인하는 리듬을 donor로 유지합니다. 외부 영상 iframe은 이 native proof에서 사용하지 않습니다.',
  },
  {
    eyebrow: '04 · CONTINUE',
    title: 'LoveTree에서 이어갑니다',
    body: '실제 Auth · Tree · Moment · Connection truth는 현재 /v4가 소유합니다. 이 화면은 별도 editor backend를 만들지 않습니다.',
  },
] as const;

export default function SourceTrack24V1DonorNativePage() {
  const [activeStage, setActiveStage] = useState(0);
  const stage = stages[activeStage];

  return (
    <main className={styles.page} data-source-track="24" data-disposition={SOURCE_TRACK_24_V1_DONOR.disposition}>
      <div className={styles.ambient} aria-hidden="true" />
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>LoveTree · Design Lab · Track 24 V1</p>
          <h1>Video Memory Workflow</h1>
        </div>
        <span className={styles.badge}>VISUAL / FUNCTION DONOR</span>
      </header>

      <section className={styles.shell} aria-labelledby="workflow-title">
        <nav className={styles.rail} aria-label="영상기억 워크플로우 단계">
          {stages.map((item, index) => (
            <button
              key={item.eyebrow}
              type="button"
              className={index === activeStage ? styles.stepActive : styles.step}
              aria-current={index === activeStage ? 'step' : undefined}
              onClick={() => setActiveStage(index)}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{item.title}</strong>
            </button>
          ))}
        </nav>

        <article className={styles.stage} id="workflow-title" aria-live="polite">
          <p className={styles.eyebrow}>{stage.eyebrow}</p>
          <h2>{stage.title}</h2>
          <p>{stage.body}</p>

          <div className={styles.memoryCard} aria-label="워크플로우 예시 카드">
            <div className={styles.poster} aria-hidden="true">
              <span>MEMORY</span>
              <b>{activeStage + 1}</b>
            </div>
            <div>
              <small>DONOR PROOF</small>
              <h3>한 장면에서 하나의 기억으로</h3>
              <p>실제 미디어와 저장 상태는 이 proof에 복제하지 않습니다.</p>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              disabled={activeStage === 0}
              onClick={() => setActiveStage((value) => Math.max(0, value - 1))}
            >
              이전 단계
            </button>
            {activeStage < stages.length - 1 ? (
              <button
                type="button"
                className={styles.primary}
                onClick={() => setActiveStage((value) => Math.min(stages.length - 1, value + 1))}
              >
                다음 단계
              </button>
            ) : (
              <Link className={styles.primaryLink} href={SOURCE_TRACK_24_V1_DONOR.canonicalHandoff}>
                LoveTree에서 계속
              </Link>
            )}
          </div>
        </article>
      </section>

      <footer className={styles.footer}>
        <p>
          Source-faithful donor proof. Track24의 workflow rhythm만 검증하며 canonical Auth/API/Tree/Moment/Connection 상태를 대체하지 않습니다.
        </p>
        <Link href="/v4">현재 LoveTree 열기</Link>
      </footer>
    </main>
  );
}
