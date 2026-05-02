import { getCollection } from "astro:content";
import { SITE } from "@/config";
import getSortedPosts from "@/utils/getSortedPosts";
import { getPath } from "@/utils/getPath";

export async function GET() {
  const notes = getSortedPosts(await getCollection("blog")).filter(
    post => !post.data.draft
  );

  const lines = [
    `# ${SITE.title}`,
    "",
    SITE.desc,
    "",
    `Website: ${SITE.website}`,
    `Author: ${SITE.author}`,
    "",
    "## Living Notes",
    "",
    ...notes.map(
      post =>
        `- [${post.data.title}](${new URL(getPath(post.id, post.filePath).replace(/^\/posts/, "/notes"), SITE.website).href}): ${post.data.description}`
    ),
    "",
    "## AI Editing Notes",
    "",
    "Each Markdown file is a living topic notebook. Prefer adding dated notes to an existing topic page.",
    "This site preserves revisions using Markdown strikethrough followed by the replacement text below it.",
  ];

  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
