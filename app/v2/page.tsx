"use client";

import { AuthProvider } from "@/lib/auth";
import "../styles/v2/home.css";
import V2Home from "../components/v2/V2Home";

export default function V2HomePage() {
  return (
    <AuthProvider>
      <V2Home />
    </AuthProvider>
  );
}
