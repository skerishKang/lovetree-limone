import V3Shell from "@/app/components/v3/V3Shell";
import V3SubjectAlbums from "@/app/components/v3/V3SubjectAlbums";
import "@/app/styles/v3/index.css";

export default function V3SubjectDemoPage() {
  return (
    <V3Shell>
      <V3SubjectAlbums />
    </V3Shell>
  );
}
