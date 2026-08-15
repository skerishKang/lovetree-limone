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
  const [isV12] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.firstMoment?.url) return false;
      }
    } catch { /* ignore */ }
    return true;
  });

  return (
    <>
      {isV12 ? <V4FirstJourneyV12 /> : <V4FirstJourney />}
      <V4FirstJourneyFidelityBridge />
    </>
  );
}