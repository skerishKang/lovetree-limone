"use client";

import type { ReactNode } from "react";
import { MomentContextActions } from "@/app/components/MomentContextActions";

export default function TreeWorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <MomentContextActions />
    </>
  );
}
