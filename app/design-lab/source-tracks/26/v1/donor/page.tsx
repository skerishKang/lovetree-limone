import Track26MemoryFilmStudioDonor from "./Track26MemoryFilmStudioDonor";

export default async function Track26MemoryFilmStudioPage({
  searchParams,
}: {
  searchParams: Promise<{ treeId?: string }>;
}) {
  const params = await searchParams;
  return <Track26MemoryFilmStudioDonor treeId={params.treeId?.trim() || ""} />;
}
