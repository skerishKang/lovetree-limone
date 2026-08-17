import LivingMediaSphereSourceRunner from "./LivingMediaSphereSourceRunner";
import { LIVING_MEDIA_SPHERE_SOURCE_RUNNER } from "@/lib/living-media-sphere-v3/provenance";

export const metadata = {
  title: "Living Media Sphere V3 Source Runner — LoveTree Design Lab",
  description:
    "Exact Living Media Sphere V3 pinned source execution — independent source family, not canonical product.",
};

export default function LivingMediaSphereV3SourceRunnerPage() {
  return <LivingMediaSphereSourceRunner runner={LIVING_MEDIA_SPHERE_SOURCE_RUNNER} />;
}
