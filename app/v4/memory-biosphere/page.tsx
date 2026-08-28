import type { Metadata } from "next";
import Codex15MemoryBiosphereHomeDonor from "@/app/components/v4/Codex15MemoryBiosphereHomeDonor";

export const metadata: Metadata = {
  title: "Memory Biosphere · LoveTree HOME donor",
  description: "Codex15 Memory Biosphere high-visual HOME donor proof over the canonical /v4 product spine.",
};

export default function MemoryBiosphereHomeDonorPage() {
  return <Codex15MemoryBiosphereHomeDonor />;
}
