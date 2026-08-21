import type { Metadata } from "next";

import Lineage55MoonlitBlossom from "./Lineage55MoonlitBlossom";
import "@/app/styles/lineage-55-moonlit-blossom.css";

export const metadata: Metadata = {
  title: "Lineage 55 · Moonlit Blossom Hero V1",
  description:
    "Native reimplementation of the LoveTree Memory Blossom Hero v1 fixture (issue #134). Historical source provenance remains unresolved and fail-closed.",
};

export default function Lineage55MoonlitBlossomPage() {
  return <Lineage55MoonlitBlossom />;
}
