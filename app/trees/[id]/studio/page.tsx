"use client";
import { useParams } from "next/navigation";
import V4FinalTreeSurface from "@/app/components/v4/product/V4FinalTreeSurface";
import "@/app/styles/v4/product-surfaces.css";
export default function TreeStudioPage(){const params=useParams<{id:string|string[]}>();const treeId=typeof params.id==="string"?params.id:params.id?.[0]??"";return <V4FinalTreeSurface treeId={treeId} mode="studio"/>;}
