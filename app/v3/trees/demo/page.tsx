import V3Shell from "@/app/components/v3/V3Shell";
import V3TreeWorkspace from "@/app/components/v3/V3TreeWorkspace";
import { v3TreesById } from "@/app/components/v3/fixtures/v3-fixtures";
import "@/app/styles/v3/index.css";

export default function V3TreeDemoPage() {
  const tree = v3TreesById("demo");
  if (!tree) return null;
  return (
    <V3Shell>
      <div className="v3-page">
        <div className="v3-garden-header">
          <div>
            <p className="v3-eyebrow">tree workspace</p>
            <h1>{tree.title}</h1>
            {tree.memo && <p>{tree.memo}</p>}
          </div>
        </div>
        <V3TreeWorkspace tree={tree} />
      </div>
    </V3Shell>
  );
}
