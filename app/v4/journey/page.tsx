"use client";

import { useState } from "react";
import V4FirstJourney from "@/app/components/v4/V4FirstJourney";
import V4FirstJourneyV12 from "@/app/components/v4/V4FirstJourneyV12";
import V4FirstJourneyFidelityBridge from "@/app/components/v4/V4FirstJourneyFidelityBridge";
import "@/app/styles/v4/first-journey.css";
import "@/app/styles/v4/first-journey-v12.css";
import "@/app/styles/v4/existing-fidelity-remediation.css";

const STORAGE_KEY = "lovetree-first-journey-unified";

export default function V4FirstJourneyPage() {
  // V1.2 활성화(?v12=1 파라미터 또는 localStorage v12Mode)는 클라이언트
  // 마운트 후 V4FirstJourneyV12 내부에서 판단하며, 활성화 시 onActivate로
  // 알려 V1을 언마운트합니다. 기본값(false)은 SSR과 클라이언트 첫 렌더링
  // 모두 V1이 되도록 유지해 hydration 마크업 일치를 보장합니다.
  const [isV12, setIsV12] = useState(false);

  return (
    <>
      {!isV12 && <V4FirstJourney />}
      <V4FirstJourneyV12 onActivate={() => setIsV12(true)} storageKey={STORAGE_KEY} />
      <V4FirstJourneyFidelityBridge />
    </>
  );
}
