import { Suspense } from "react";
import V3Shell from "@/app/components/v3/V3Shell";
import V3SubjectAlbums from "@/app/components/v3/V3SubjectAlbums";
import "@/app/styles/v3/index.css";

export default function V3SubjectDemoPage() {
  return (
    <V3Shell>
      <Suspense
        fallback={
          <div className="v3-page">
            <p className="v3-seed-note">아카이브를 불러오는 중...</p>
          </div>
        }
      >
        <V3SubjectAlbums />
      </Suspense>
    </V3Shell>
  );
}
