import { getCollection } from "astro:content";
import getSortedPosts from "@/utils/getSortedPosts";
import { getPath } from "@/utils/getPath";

export async function GET() {
  const posts = getSortedPosts(await getCollection("blog")).map(post => ({
    slug: post.id,
    path: getPath(post.id, post.filePath),
    title: post.data.title,
    description: post.data.description,
    pubDatetime: post.data.pubDatetime.toISOString(),
    modDatetime: post.data.modDatetime?.toISOString() ?? null,
    draft: Boolean(post.data.draft),
    tags: post.data.tags,
  }));

  return new Response(JSON.stringify({ posts }, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
