"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import V4Landing from "@/app/components/v4/V4Landing";
import "@/app/styles/v4/onboarding.css";
import "@/app/styles/email-auth.css";

export default function V4Page() {
  const searchParams = useSearchParams();
  const start = searchParams.get("start");

  useEffect(() => {
    if (start !== "1") return;
    const timer = window.setTimeout(() => {
      const button = Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
        .find((item) => item.textContent?.includes("첫 순간 심기"));
      button?.click();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [start]);

  return <V4Landing />;
}
