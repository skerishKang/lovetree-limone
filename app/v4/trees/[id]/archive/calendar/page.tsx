import Track37MemoryCalendar from "./Track37MemoryCalendar";
import "./track37-mobile-fidelity.css";

export default async function Track37MemoryCalendarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Track37MemoryCalendar treeId={id} />;
}
