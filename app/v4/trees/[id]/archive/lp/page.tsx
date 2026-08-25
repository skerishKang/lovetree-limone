import Track35LpArchive from "./Track35LpArchive";

export default async function Track35LpArchivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Track35LpArchive treeId={id} />;
}
