"use client";

import { useParams } from "next/navigation";
import Track14MindmapDonor from "./Track14MindmapDonor";

export default function Track14MindmapPage() {
  const params = useParams<{ id: string | string[] }>();
  const treeId = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  return <Track14MindmapDonor treeId={treeId} />;
}
