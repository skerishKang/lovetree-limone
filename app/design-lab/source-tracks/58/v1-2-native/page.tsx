import SourceTrack58LivingMemoryBoard from "@/components/source-track-58/SourceTrack58LivingMemoryBoard";
import mobileSpatialStyles from "./source58-mobile-spatial-p0.module.css";
import repairStyles from "./source58-visual-repair.module.css";

export const dynamic = "force-dynamic";

type SourceTrack58PageProps = {
  searchParams?: Promise<{ treeId?: string | string[] }>;
};

export default async function SourceTrack58NativePage({ searchParams }: SourceTrack58PageProps) {
  const params = searchParams ? await searchParams : {};
  const rawTreeId = params.treeId;
  const treeId = Array.isArray(rawTreeId) ? rawTreeId[0] ?? "" : rawTreeId ?? "";

  return (
    <div className={`${repairStyles.repairScope} ${mobileSpatialStyles.mobileSpatialScope}`}>
      <SourceTrack58LivingMemoryBoard treeId={treeId.trim()} />
    </div>
  );
}
