import { redirect } from "next/navigation";

type Params = Promise<{ id: string }>;

export default async function EditTreePage({ params }: { params: Params }) {
  const { id } = await params;
  redirect(`/pages/editor.html?id=${encodeURIComponent(id)}`);
}
