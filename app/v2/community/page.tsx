"use client";

import { AuthProvider } from "@/lib/auth";
import "../../styles/v2/community.css";
import V2CommunityView from "../../components/v2/V2CommunityView";

export default function V2CommunityPage() {
  return (
    <AuthProvider>
      <V2CommunityView />
    </AuthProvider>
  );
}
