import RotatingMemoryIndexArchive from "./RotatingMemoryIndexArchive";

export default async function RotatingMemoryIndexArchivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RotatingMemoryIndexArchive treeId={id} />;
}
