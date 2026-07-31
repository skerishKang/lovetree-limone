"use client";

import { AuthProvider } from "@/lib/auth";
import "../../styles/v2/home.css";
import "../../styles/v2/tree.css";
import V2MyTrees from "../../components/v2/V2MyTrees";

export default function V2MyTreesPage() {
  return (
    <AuthProvider>
      <V2MyTrees />
    </AuthProvider>
  );
}
