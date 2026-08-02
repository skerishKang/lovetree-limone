import { notFound } from "next/navigation";
import V3Shell from "@/app/components/v3/V3Shell";
import V3PublicTree from "@/app/components/v3/V3PublicTree";
import { v3TreesById } from "@/app/components/v3/fixtures/v3-fixtures";
import "@/app/styles/v3/index.css";

export default async function V3CommunityTreeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tree = v3TreesById(id);
  if (!tree || tree.visibility !== "public") notFound();
  return (
    <V3Shell>
      <div className="v3-page">
        <V3PublicTree treeId={id} />
      </div>
    </V3Shell>
  );
}
