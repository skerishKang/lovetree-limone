"use client";

import { useEffect, useState } from "react";
import V4FirstJourney from "@/app/components/v4/V4FirstJourney";
import V4FirstJourneyV12 from "@/app/components/v4/V4FirstJourneyV12";
import V4FirstJourneyFidelityBridge from "@/app/components/v4/V4FirstJourneyFidelityBridge";
import "@/app/styles/v4/first-journey.css";
import "@/app/styles/v4/first-journey-v12.css";
import "@/app/styles/v4/existing-fidelity-remediation.css";

const STORAGE_KEY = "lovetree-first-journey-unified";

type JourneyMode = "loading" | "canonical" | "legacy-demo";

export default function V4FirstJourneyPage() {
  const [mode, setMode] = useState<JourneyMode>("loading");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setMode(params.get("legacy") === "1" ? "legacy-demo" : "canonical");
  }, []);

  if (mode === "loading") return null;

  if (mode === "legacy-demo") {
    return (
      <>
        <V4FirstJourney />
        <V4FirstJourneyFidelityBridge />
      </>
    );
  }

  return <V4FirstJourneyV12 storageKey={STORAGE_KEY} />;
}
