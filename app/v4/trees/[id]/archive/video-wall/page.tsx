import Codex13LiquidGlassVideoWall from "./Codex13LiquidGlassVideoWall";

export default async function Codex13LiquidGlassVideoWallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Codex13LiquidGlassVideoWall treeId={id} />;
}
