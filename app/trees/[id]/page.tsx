import { redirect } from "next/navigation";

type Params = Promise<{ id: string }>;

export default async function TreeDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  redirect(`/pages/detail.html?id=${encodeURIComponent(id)}`);
}
