import RotatingMemoryIndexArchive from "./RotatingMemoryIndexArchive";

export default async function RotatingMemoryIndexArchivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <style>{`
        @media (hover: none), (pointer: coarse) {
          [data-codex14-native="archive"] [data-codex14-card="true"][aria-current="true"] {
            pointer-events: none;
          }
        }
      `}</style>
      <RotatingMemoryIndexArchive treeId={id} />
    </>
  );
}
