"use client";

import { useParams } from "next/navigation";
import V4PublicStorySticky from "@/app/components/v4/product/V4PublicStorySticky";
import "@/app/styles/v4/product-surfaces.css";
import "@/app/styles/v4/product-surfaces-fidelity.css";

export default function TreeStoryPage() {
  const params = useParams<{ id: string | string[] }>();
  const treeId = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  return <V4PublicStorySticky treeId={treeId} />;
}
