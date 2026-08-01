"use client";

import { AuthProvider } from "@/lib/auth";
import "../../../styles/v2/home.css";
import "../../../styles/v2/tree.css";
import "../../../styles/v2/diary.css";
import "../../../styles/v2/story.css";
import "../../../styles/v2/album.css";
import "../../../styles/email-auth.css";
import V2TreeDetail from "../../../components/v2/V2TreeDetail";

export default function V2TreeDetailPage() {
  return (
    <AuthProvider>
      <V2TreeDetail />
    </AuthProvider>
  );
}
