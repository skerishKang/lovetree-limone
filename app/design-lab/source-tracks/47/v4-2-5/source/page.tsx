import SourceTrack47Runner from "./SourceTrack47Runner";
import { SOURCE_TRACK_47_SOURCE_RUNNER } from "@/lib/source-track-47/provenance";

export const metadata = {
  title: "Track 47 V4.2.5 Source Runner — LoveTree Design Lab",
  description:
    "Exact Cinematic Front Door V4.2.5 pinned source execution — SOURCE RUNNER, NOT CANONICAL PRODUCT.",
};

export default function SourceTrack47SourceRunnerPage() {
  return <SourceTrack47Runner runner={SOURCE_TRACK_47_SOURCE_RUNNER} />;
}
