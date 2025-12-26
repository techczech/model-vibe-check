import { NextResponse } from "next/server";
import { getPrompts, getRuns } from "@/lib/storage";

export async function GET() {
  try {
    const prompts = await getPrompts();
    const runs = await getRuns();

    // Count responses per prompt
    const responseCountByPrompt: Record<string, number> = {};
    for (const run of runs) {
      for (const result of run.results) {
        responseCountByPrompt[result.promptId] = 
          (responseCountByPrompt[result.promptId] || 0) + 1;
      }
    }

    // Group prompts by category and count
    const categoryMap: Record<string, { 
      promptCount: number; 
      responseCount: number;
      promptIds: string[];
    }> = {};

    for (const prompt of prompts) {
      const cat = prompt.category || "Uncategorized";
      if (!categoryMap[cat]) {
        categoryMap[cat] = { promptCount: 0, responseCount: 0, promptIds: [] };
      }
      categoryMap[cat].promptCount++;
      categoryMap[cat].promptIds.push(prompt.id);
      categoryMap[cat].responseCount += responseCountByPrompt[prompt.id] || 0;
    }

    // Convert to array
    const categories = Object.entries(categoryMap)
      .map(([name, data]) => ({
        name,
        slug: name.toLowerCase().replace(/\s+/g, "-"),
        promptCount: data.promptCount,
        responseCount: data.responseCount,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
