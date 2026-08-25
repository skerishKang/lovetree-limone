import type { Metadata } from "next";
import { Source57LivingGlassNative } from "./Source57LivingGlassNative";
import "@/app/styles/source-track-57-living-glass.css";

export const metadata: Metadata = {
  title: "Source57 Living Glass Moment Cards · Design Lab",
  description: "Source57 V1.3 collision-safe native staging candidate.",
};

export default function Source57LivingGlassNativePage() {
  return <Source57LivingGlassNative />;
}
