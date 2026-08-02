import V3Shell from "@/app/components/v3/V3Shell";
import V3PublicTree from "@/app/components/v3/V3PublicTree";
import "@/app/styles/v3/index.css";

export default function V3CommunityTreeDemoPage() {
  return (
    <V3Shell>
      <div className="v3-page">
        <V3PublicTree treeId="community-demo" />
      </div>
    </V3Shell>
  );
}
