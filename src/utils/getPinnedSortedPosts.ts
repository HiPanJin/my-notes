import type { CollectionEntry } from "astro:content";
import getSortedPosts from "./getSortedPosts";

const getPinnedSortedPosts = (posts: CollectionEntry<"blog">[]) => {
  const sortedPosts = getSortedPosts(posts);

  return [
    ...sortedPosts.filter(({ data }) => data.featured),
    ...sortedPosts.filter(({ data }) => !data.featured),
  ];
};

export default getPinnedSortedPosts;
