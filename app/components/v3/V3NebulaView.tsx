"use client";

import { useMemo, useState } from "react";
import type { V3PreviewMemory } from "./v3-types";

const STAR_COLORS = ["#d36f7d", "#78916f", "#9f7ac5", "#d4a05b", "#7ba5b2"];

interface V3NebulaViewProps {
  memories: V3PreviewMemory[];
  total: number;
}

export default function V3NebulaView({ memories, total }: V3NebulaViewProps) {
  const [density, setDensity] = useState<100 | 300 | 1000>(100);

  const stars = useMemo(() => {
    // 요약 보기: 실제 데이터의 감정별 대표 별을 표현하고,
    // 밀도 스위치는 요약 비율만 바꿉니다 (실제 데이터 수가 아님).
    const count = Math.max(memories.length, 1);
    return memories.map((memory, index) => {
      const angle = (index / count) * Math.PI * 2;
      const radius = 70 + (index % 7) * 52;
      const color = STAR_COLORS[index % STAR_COLORS.length];
      return {
        memory,
        x: 420 + Math.cos(angle) * radius,
        y: 250 + Math.sin(angle) * radius,
        color,
      };
    });
  }, [memories]);

  const emotionCounts = useMemo(() => {
    const map = new Map<string, number>();
    memories.forEach((memory) => {
      (memory.emotionTags?.length ? memory.emotionTags : []).forEach((tag) => {
        map.set(tag, (map.get(tag) ?? 0) + 1);
      });
    });
    return [...map.entries()];
  }, [memories]);

  return (
    <div className="v3-view">
      <h2>성운</h2>
      <p className="v3-view-note">
        100개 이상의 순간이 쌓였을 때를 가정한 요약 보기예요. 별 하나가 하나의
        순간이고, 색 하나가 그때의 감정이에요.
      </p>
      <div className="v3-nebula-wrap" aria-label="감정 성운 요약 보기">
        <div className="v3-nebula-stars" aria-hidden="true">
          {stars.map((star) => (
            <i
              className="v3-nebula-star"
              key={star.memory.id}
              style={{
                left: star.x,
                top: star.y,
                width: density === 100 ? 8 : density === 300 ? 6 : 5,
                height: density === 100 ? 8 : density === 300 ? 6 : 5,
                background: star.color,
                boxShadow: `0 0 ${density === 100 ? 10 : 7}px ${star.color}88`,
              }}
              title={star.memory.title}
            />
          ))}
        </div>
        <div className="v3-nebula-metrics">
          <span className="v3-nebula-metric">
            생겨난 순간 <b>{total}개</b>
          </span>
          <span className="v3-nebula-metric">
            이어진 마음 <b>{total > 0 ? total - 1 : 0}개</b>
          </span>
          <span className="v3-nebula-metric">
            감정 클러스터 <b>{emotionCounts.length}개</b>
          </span>
        </div>
        <div className="v3-nebula-controls">
          <span className="v3-chip-group" role="group" aria-label="요약 밀도 선택">
            {([100, 300, 1000] as const).map((value) => (
              <button
                className="v3-chip"
                type="button"
                key={value}
                aria-pressed={density === value}
                onClick={() => setDensity(value)}
              >
                {value}개
              </button>
            ))}
          </span>
        </div>
        <div className="v3-nebula-note">
          이 화면은 기본 CRUD 화면이 아니라 <b>요약 보기</b>예요. 별을 선택해 개별
          순간으로 이동하는 기능은 Phase 2에서 연결돼요.
        </div>
      </div>
      {emotionCounts.length > 0 && (
        <div className="v3-chip-group" aria-label="감정별 순간 수">
          {emotionCounts.map(([tag, count]) => (
            <span className="v3-nebula-metric" key={tag}>
              {tag} <b>{count}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
