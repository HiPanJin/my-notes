import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SITE } from "../src/config";
import { createBlogStore } from "./content";

const store = createBlogStore();

const server = new McpServer({
  name: "jinpan-blog",
  version: "0.1.0",
});

server.resource("site-config", "site://config", async uri => ({
  contents: [
    {
      uri: uri.href,
      mimeType: "application/json",
      text: JSON.stringify(
        {
          title: SITE.title,
          author: SITE.author,
          website: SITE.website,
          language: SITE.lang,
          blogPath: "src/data/blog",
        },
        null,
        2
      ),
    },
  ],
}));

server.resource("all-posts", "posts://all", async uri => ({
  contents: [
    {
      uri: uri.href,
      mimeType: "application/json",
      text: JSON.stringify(await store.listPosts(), null, 2),
    },
  ],
}));

server.resource(
  "post-by-slug",
  new ResourceTemplate("posts://slug/{slug}", { list: undefined }),
  async (uri, { slug }) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "text/markdown",
        text: await store.readPost(String(slug)),
      },
    ],
  })
);

server.tool("list_posts", "List blog post metadata", {}, async () => ({
  content: [
    { type: "text", text: JSON.stringify(await store.listPosts(), null, 2) },
  ],
}));

server.tool(
  "read_post",
  "Read a Markdown blog post by slug",
  { slug: z.string() },
  async ({ slug }) => ({
    content: [{ type: "text", text: await store.readPost(slug) }],
  })
);

server.tool(
  "create_draft",
  "Create a draft Markdown post",
  {
    title: z.string().min(1),
    description: z.string().min(1),
    tags: z.array(z.string()).optional(),
    body: z.string().optional(),
    slug: z.string().optional(),
  },
  async input => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(await store.createDraft(input), null, 2),
      },
    ],
  })
);

server.tool(
  "append_revision",
  "Replace one exact old sentence with struck-through old text and new text below it",
  {
    slug: z.string(),
    oldText: z.string().min(1),
    newText: z.string().min(1),
  },
  async input => {
    await store.appendRevision(input);
    return { content: [{ type: "text", text: "Revision inserted." }] };
  }
);

server.tool(
  "update_frontmatter",
  "Update safe frontmatter fields",
  {
    slug: z.string(),
    patch: z.object({
      title: z.string().min(1).optional(),
      description: z.string().min(1).optional(),
      tags: z.array(z.string().min(1)).optional(),
      pubDatetime: z.string().datetime().optional(),
      modDatetime: z.string().datetime().nullable().optional(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
    }),
  },
  async input => {
    await store.updateFrontmatter(input);
    return { content: [{ type: "text", text: "Frontmatter updated." }] };
  }
);

server.prompt(
  "revise_with_strikethrough",
  "Rewrite text while keeping the previous version visible as strikethrough",
  {
    oldText: z.string(),
    newText: z.string(),
  },
  ({ oldText, newText }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Format this revision for the handwritten blog:\n\n~~${oldText}~~\n\n${newText}`,
        },
      },
    ],
  })
);

server.prompt(
  "draft_blog_post",
  "Draft a blog post in Jin Pan's learning-in-public style",
  {
    topic: z.string(),
    notes: z.string().optional(),
  },
  ({ topic, notes }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Draft a concise English blog post about ${topic}.\n\nNotes:\n${notes ?? ""}`,
        },
      },
    ],
  })
);

server.prompt(
  "summarize_post",
  "Summarize a post for AI context",
  { markdown: z.string() },
  ({ markdown }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Summarize this Markdown blog post in 5 bullets:\n\n${markdown}`,
        },
      },
    ],
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
