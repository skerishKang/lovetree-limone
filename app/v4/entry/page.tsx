import type { Metadata } from "next";

import MvpEntryFlow from "./MvpEntryFlow";

export const metadata: Metadata = {
  title: "LoveTree MVP · Moonlit Blossom Entry",
  description:
    "MVP demo entry flow (issue #318): Moonlit Blossom first screen → ENTER MY TREE → /v4/trees/demo/graph editor.",
};

export default function MvpEntryPage() {
  return <MvpEntryFlow />;
}
