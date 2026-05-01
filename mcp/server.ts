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

server.registerResource(
  "site-config",
  "site://config",
  {
    title: "Site config",
    mimeType: "application/json",
  },
  async uri => ({
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
  })
);

server.registerResource(
  "all-posts",
  "posts://all",
  {
    title: "All posts",
    mimeType: "application/json",
  },
  async uri => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(await store.listPosts(), null, 2),
      },
    ],
  })
);

server.registerResource(
  "post-by-slug",
  new ResourceTemplate("posts://slug/{slug}", { list: undefined }),
  {
    title: "Post by slug",
    mimeType: "text/markdown",
  },
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

server.registerTool("list_posts", {
  description: "List blog post metadata",
  inputSchema: {},
}, async () => ({
  content: [
    { type: "text", text: JSON.stringify(await store.listPosts(), null, 2) },
  ],
}));

server.registerTool(
  "read_post",
  {
    description: "Read a Markdown blog post by slug",
    inputSchema: { slug: z.string() },
  },
  async ({ slug }) => ({
    content: [{ type: "text", text: await store.readPost(slug) }],
  })
);

server.registerTool(
  "create_draft",
  {
    description: "Create a draft Markdown post",
    inputSchema: {
      title: z.string().min(1),
      description: z.string().min(1),
      tags: z.array(z.string()).optional(),
      body: z.string().optional(),
      slug: z.string().optional(),
    },
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

server.registerTool(
  "append_revision",
  {
    description:
      "Replace one exact old sentence with struck-through old text and new text below it",
    inputSchema: {
      slug: z.string(),
      oldText: z.string().min(1),
      newText: z.string().min(1),
    },
  },
  async input => {
    await store.appendRevision(input);
    return { content: [{ type: "text", text: "Revision inserted." }] };
  }
);

server.registerTool(
  "update_frontmatter",
  {
    description: "Update safe frontmatter fields",
    inputSchema: {
      slug: z.string(),
      patch: z.object({
        title: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        tags: z.array(z.string().min(1)).optional(),
        pubDatetime: z.iso.datetime().optional(),
        modDatetime: z.iso.datetime().nullable().optional(),
        featured: z.boolean().optional(),
        draft: z.boolean().optional(),
      }),
    },
  },
  async input => {
    await store.updateFrontmatter(input);
    return { content: [{ type: "text", text: "Frontmatter updated." }] };
  }
);

server.registerPrompt(
  "revise_with_strikethrough",
  {
    description:
      "Rewrite text while keeping the previous version visible as strikethrough",
    argsSchema: {
      oldText: z.string(),
      newText: z.string(),
    },
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

server.registerPrompt(
  "draft_blog_post",
  {
    description: "Draft a blog post in Jin Pan's learning-in-public style",
    argsSchema: {
      topic: z.string(),
      notes: z.string().optional(),
    },
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

server.registerPrompt(
  "summarize_post",
  {
    description: "Summarize a post for AI context",
    argsSchema: { markdown: z.string() },
  },
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
