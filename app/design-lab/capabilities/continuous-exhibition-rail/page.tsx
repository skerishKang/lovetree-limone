import type { Metadata } from "next";
import { ContinuousExhibitionRailExperience } from "./ContinuousExhibitionRailExperience";
import "./track62-continuous-exhibition-rail.css";

export const metadata: Metadata = {
  title: "Track 62 V1.1 — Continuous Exhibition Rail (capability proof)",
  description:
    "Design Lab capability proof: a single continuous fractional phase couples wheel, drag, touch and node selection into one exhibition rail.",
};

export default function ContinuousExhibitionRailCapabilityPage() {
  return <ContinuousExhibitionRailExperience />;
}
