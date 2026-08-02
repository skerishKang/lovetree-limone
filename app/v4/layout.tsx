import type { ReactNode } from "react";
import V4JourneyDock from "@/app/components/v4/V4JourneyDock";
import "@/app/styles/v4/journey-dock.css";

export default function V4Layout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <V4JourneyDock />
    </>
  );
}
