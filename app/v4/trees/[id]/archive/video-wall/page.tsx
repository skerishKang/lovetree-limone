import Codex13LiquidGlassVideoWall from "./Codex13LiquidGlassVideoWall";
import fidelityStyles from "./codex13-source-fidelity-overrides.module.css";

export default async function Codex13LiquidGlassVideoWallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className={fidelityStyles.scope}>
      <Codex13LiquidGlassVideoWall treeId={id} />
    </div>
  );
}
