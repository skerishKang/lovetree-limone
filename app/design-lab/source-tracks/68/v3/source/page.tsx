import SourceTrack68Runner from "./SourceTrack68Runner";
import { SOURCE_TRACK_68_SOURCE_RUNNER } from "@/lib/source-track-68/provenance";

export const metadata = {
  title: "Track 68 V3 Source Runner — LoveTree Design Lab",
  description:
    "Exact Living Media Sphere V3 pinned source execution — SOURCE RUNNER, NOT CANONICAL PRODUCT.",
};

export default function SourceTrack68SourceRunnerPage() {
  return <SourceTrack68Runner runner={SOURCE_TRACK_68_SOURCE_RUNNER} />;
}
