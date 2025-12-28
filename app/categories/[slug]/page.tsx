import { redirect } from "next/navigation";
import { getPrompts } from "@/lib/storage";

export default async function CategoryRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  // Find the actual category name from the slug
  const prompts = await getPrompts();
  const matchedPrompt = prompts.find((p) => {
    const cat = p.category || "Uncategorized";
    const catSlug = cat.toLowerCase().replace(/\s+/g, "-");
    return catSlug === decodedSlug;
  });

  if (matchedPrompt) {
    redirect(`/prompts?category=${encodeURIComponent(matchedPrompt.category)}`);
  } else {
    redirect("/prompts");
  }
}
