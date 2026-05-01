# Handwritten Blog MCP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the Astro blog as a warm handwritten paper manuscript and add a local MCP server that can read, draft, and revise Markdown posts.

**Architecture:** Keep Astro as a static site and keep Markdown files in `src/data/blog` as the source of truth. Add a root-level `mcp/` module with tested filesystem utilities plus an MCP stdio server using the official TypeScript SDK. Visual changes stay in existing Astro components and CSS.

**Tech Stack:** Astro 5, Tailwind CSS 4, TypeScript, Vitest, tsx, gray-matter, zod, official `@modelcontextprotocol/sdk`, Fontsource fonts.

---

## Current Code Context

- Posts live in `src/data/blog/*.md`.
- Content schema lives in `src/content.config.ts`.
- Site metadata lives in `src/config.ts`.
- Global theme styles live in `src/styles/global.css` and `src/styles/typography.css`.
- Home page is `src/pages/index.astro`.
- Article layout is `src/layouts/PostDetails.astro`.
- Post cards are `src/components/Card.astro`.
- Header/navigation is `src/components/Header.astro`.
- There is no current test script.

## Implementation Rules

- Use TDD for MCP/content behavior.
- Do not add a database.
- Do not add hosted auth, CMS, or remote write API.
- All MCP writes must stay inside `src/data/blog`.
- New posts default to `draft: true`.
- Slugs must match `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- `append_revision` must only transform a unique exact text match; if the old text is missing or appears multiple times, return an error.
- Use `gray-matter` for frontmatter parsing/stringifying.

---

### Task 1: Add Test, MCP, Frontmatter, and Font Dependencies

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `vitest.config.ts`

**Step 1: Install dependencies**

Run:

```bash
pnpm add @modelcontextprotocol/sdk gray-matter zod @fontsource-variable/caveat @fontsource/kalam
pnpm add -D vitest tsx
```

Expected: dependencies install and `pnpm-lock.yaml` changes.

**Step 2: Add scripts**

Modify `package.json` scripts to include:

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "mcp:blog": "tsx mcp/server.ts",
  "mcp:smoke": "tsx mcp/smoke.ts"
}
```

Keep existing scripts.

**Step 3: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["mcp/**/*.test.ts", "src/**/*.test.ts"],
  },
});
```

**Step 4: Verify**

Run:

```bash
pnpm test
```

Expected: Vitest runs successfully with no tests found or passes after later tasks add tests.

**Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts
git commit -m "chore: add MCP test tooling"
```

---

### Task 2: Build Tested Blog Content Utilities

**Files:**
- Create: `mcp/content.ts`
- Create: `mcp/content.test.ts`

**Step 1: Write failing tests**

Create `mcp/content.test.ts` with tests for slug validation, draft creation, exact-match revision insertion, duplicate-match refusal, and frontmatter patching.

Core test cases:

```ts
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createBlogStore, validateSlug } from "./content";

let blogDir: string;

beforeEach(async () => {
  blogDir = await mkdtemp(path.join(tmpdir(), "blog-mcp-"));
});

afterEach(async () => {
  await rm(blogDir, { recursive: true, force: true });
});

describe("validateSlug", () => {
  it("accepts lowercase kebab-case slugs", () => {
    expect(validateSlug("day-1-of-ios")).toBe("day-1-of-ios");
  });

  it("rejects traversal and unsafe characters", () => {
    expect(() => validateSlug("../secret")).toThrow("Invalid slug");
    expect(() => validateSlug("Bad Slug")).toThrow("Invalid slug");
  });
});

describe("createBlogStore", () => {
  it("creates drafts with safe frontmatter", async () => {
    const store = createBlogStore({ blogDir });
    const created = await store.createDraft({
      title: "My First Draft",
      description: "A test draft.",
      tags: ["Writing"],
      body: "Hello paper.",
    });

    const text = await readFile(created.path, "utf8");
    expect(created.slug).toBe("my-first-draft");
    expect(text).toContain("draft: true");
    expect(text).toContain("Hello paper.");
  });

  it("inserts a revision after a unique exact match", async () => {
    const store = createBlogStore({ blogDir });
    const file = path.join(blogDir, "note.md");
    await writeFile(
      file,
      [
        "---",
        "title: Note",
        "pubDatetime: 2026-05-01T00:00:00.000Z",
        "draft: false",
        "tags:",
        "  - Test",
        "description: Note description.",
        "---",
        "",
        "Old sentence.",
      ].join("\n")
    );

    await store.appendRevision({
      slug: "note",
      oldText: "Old sentence.",
      newText: "New sentence.",
    });

    const text = await readFile(file, "utf8");
    expect(text).toContain("~~Old sentence.~~\n\nNew sentence.");
  });

  it("refuses ambiguous duplicate revision matches", async () => {
    const store = createBlogStore({ blogDir });
    const file = path.join(blogDir, "note.md");
    await writeFile(file, "---\ntitle: Note\n---\n\nSame.\n\nSame.\n");

    await expect(
      store.appendRevision({
        slug: "note",
        oldText: "Same.",
        newText: "Different.",
      })
    ).rejects.toThrow("matched more than once");
  });

  it("updates only safe frontmatter fields", async () => {
    const store = createBlogStore({ blogDir });
    const file = path.join(blogDir, "note.md");
    await writeFile(file, "---\ntitle: Note\ndraft: true\n---\n\nBody");

    await store.updateFrontmatter({
      slug: "note",
      patch: { title: "Updated Note", draft: false },
    });

    const text = await readFile(file, "utf8");
    expect(text).toContain("title: Updated Note");
    expect(text).toContain("draft: false");
    expect(text).toContain("Body");
  });
});
```

**Step 2: Run tests and verify RED**

Run:

```bash
pnpm test mcp/content.test.ts
```

Expected: FAIL because `mcp/content.ts` does not exist.

**Step 3: Implement minimal content utilities**

Create `mcp/content.ts` with:

```ts
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

const DEFAULT_BLOG_DIR = path.resolve(process.cwd(), "src/data/blog");
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const FrontmatterPatchSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    tags: z.array(z.string().min(1)).optional(),
    pubDatetime: z.string().datetime().optional(),
    modDatetime: z.string().datetime().nullable().optional(),
    featured: z.boolean().optional(),
    draft: z.boolean().optional(),
  })
  .strict();

export type FrontmatterPatch = z.infer<typeof FrontmatterPatchSchema>;

export interface CreateDraftInput {
  title: string;
  description: string;
  tags?: string[];
  body?: string;
  slug?: string;
}

export interface AppendRevisionInput {
  slug: string;
  oldText: string;
  newText: string;
}

export interface UpdateFrontmatterInput {
  slug: string;
  patch: FrontmatterPatch;
}

export function validateSlug(slug: string) {
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(`Invalid slug: ${slug}`);
  }
  return slug;
}

export function slugifyTitle(title: string) {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return validateSlug(slug || "untitled");
}

export function createBlogStore(options: { blogDir?: string } = {}) {
  const blogDir = path.resolve(options.blogDir ?? DEFAULT_BLOG_DIR);

  function fileForSlug(slug: string) {
    const safeSlug = validateSlug(slug);
    const filePath = path.resolve(blogDir, `${safeSlug}.md`);

    if (!filePath.startsWith(`${blogDir}${path.sep}`)) {
      throw new Error("Resolved path escaped blog directory");
    }

    return filePath;
  }

  async function readPost(slug: string) {
    return readFile(fileForSlug(slug), "utf8");
  }

  async function createDraft(input: CreateDraftInput) {
    const slug = input.slug ? validateSlug(input.slug) : slugifyTitle(input.title);
    const filePath = fileForSlug(slug);

    try {
      await stat(filePath);
      throw new Error(`Post already exists: ${slug}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    await mkdir(blogDir, { recursive: true });

    const source = matter.stringify(input.body?.trim() ? `${input.body.trim()}\n` : "", {
      title: input.title,
      author: "Jin Pan",
      pubDatetime: new Date().toISOString(),
      slug,
      featured: false,
      draft: true,
      tags: input.tags?.length ? input.tags : ["Draft"],
      description: input.description,
    });

    await writeFile(filePath, source, "utf8");
    return { slug, path: filePath };
  }

  async function appendRevision(input: AppendRevisionInput) {
    const filePath = fileForSlug(input.slug);
    const source = await readFile(filePath, "utf8");
    const first = source.indexOf(input.oldText);
    const last = source.lastIndexOf(input.oldText);

    if (first === -1) {
      throw new Error("Old text was not found");
    }

    if (first !== last) {
      throw new Error("Old text matched more than once");
    }

    const replacement = `~~${input.oldText}~~\n\n${input.newText}`;
    await writeFile(filePath, source.replace(input.oldText, replacement), "utf8");
  }

  async function updateFrontmatter(input: UpdateFrontmatterInput) {
    const patch = FrontmatterPatchSchema.parse(input.patch);
    const filePath = fileForSlug(input.slug);
    const parsed = matter(await readFile(filePath, "utf8"));
    const next = matter.stringify(parsed.content.trimStart(), {
      ...parsed.data,
      ...patch,
    });

    await writeFile(filePath, next, "utf8");
  }

  async function listPosts() {
    await mkdir(blogDir, { recursive: true });
    const entries = await readdir(blogDir, { withFileTypes: true });
    const posts = await Promise.all(
      entries
        .filter(entry => entry.isFile() && entry.name.endsWith(".md"))
        .map(async entry => {
          const slug = entry.name.replace(/\.md$/, "");
          const parsed = matter(await readFile(fileForSlug(slug), "utf8"));
          return {
            slug,
            title: String(parsed.data.title ?? slug),
            description: String(parsed.data.description ?? ""),
            pubDatetime: parsed.data.pubDatetime ?? null,
            draft: Boolean(parsed.data.draft),
            tags: Array.isArray(parsed.data.tags) ? parsed.data.tags : [],
          };
        })
    );

    return posts.sort((a, b) => a.slug.localeCompare(b.slug));
  }

  return {
    appendRevision,
    createDraft,
    listPosts,
    readPost,
    updateFrontmatter,
  };
}
```

**Step 4: Run tests and verify GREEN**

Run:

```bash
pnpm test mcp/content.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add mcp/content.ts mcp/content.test.ts
git commit -m "feat: add blog content utilities"
```

---

### Task 3: Add Local MCP Server and Smoke Test

**Files:**
- Create: `mcp/server.ts`
- Create: `mcp/smoke.ts`

**Step 1: Write MCP server**

Create `mcp/server.ts`:

```ts
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
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
  content: [{ type: "text", text: JSON.stringify(await store.listPosts(), null, 2) }],
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
    content: [{ type: "text", text: JSON.stringify(await store.createDraft(input), null, 2) }],
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
```

If the installed SDK version requires small API adjustments, keep the same tool
names, resource URIs, and prompt names, then document the exact SDK adjustment
in the commit message.

**Step 2: Add smoke client**

Create `mcp/smoke.ts`:

```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "pnpm",
  args: ["mcp:blog"],
});

const client = new Client({
  name: "jinpan-blog-smoke",
  version: "0.1.0",
});

await client.connect(transport);

const tools = await client.listTools();
const resources = await client.listResources();

if (!tools.tools.some(tool => tool.name === "list_posts")) {
  throw new Error("list_posts tool was not registered");
}

if (!resources.resources.some(resource => resource.uri === "posts://all")) {
  throw new Error("posts://all resource was not registered");
}

await client.close();
console.log("MCP smoke test passed");
```

**Step 3: Run smoke test**

Run:

```bash
pnpm mcp:smoke
```

Expected: PASS with `MCP smoke test passed`.

**Step 4: Commit**

```bash
git add mcp/server.ts mcp/smoke.ts
git commit -m "feat: add local blog MCP server"
```

---

### Task 4: Add AI-Friendly Static Endpoints

**Files:**
- Create: `src/pages/llms.txt.ts`
- Create: `src/pages/posts.json.ts`

**Step 1: Add posts JSON endpoint**

Create `src/pages/posts.json.ts`:

```ts
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
```

**Step 2: Add llms.txt endpoint**

Create `src/pages/llms.txt.ts`:

```ts
import { getCollection } from "astro:content";
import { SITE } from "@/config";
import getSortedPosts from "@/utils/getSortedPosts";
import { getPath } from "@/utils/getPath";

export async function GET() {
  const posts = getSortedPosts(await getCollection("blog")).filter(
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
    "## Posts",
    "",
    ...posts.map(
      post =>
        `- [${post.data.title}](${new URL(getPath(post.id, post.filePath), SITE.website).href}): ${post.data.description}`
    ),
    "",
    "## AI Editing Notes",
    "",
    "This blog preserves revisions using Markdown strikethrough followed by the replacement text below it.",
  ];

  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
```

**Step 3: Build**

Run:

```bash
pnpm build
```

Expected: Astro build succeeds and includes `/llms.txt` and `/posts.json`.

**Step 4: Commit**

```bash
git add src/pages/llms.txt.ts src/pages/posts.json.ts
git commit -m "feat: add AI-readable blog endpoints"
```

---

### Task 5: Apply Paper and Handwritten Theme

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/styles/typography.css`
- Modify: `src/layouts/Layout.astro`

**Step 1: Update global theme CSS**

In `src/styles/global.css`, import fonts before Tailwind:

```css
@import "@fontsource-variable/caveat";
@import "@fontsource/kalam/400.css";
@import "@fontsource/kalam/700.css";
@import "tailwindcss";
@import "./typography.css";
```

Replace light theme variables:

```css
:root,
html[data-theme="light"] {
  --background: #f4ecd8;
  --foreground: #29231c;
  --accent: #19466f;
  --muted: #e7dcc3;
  --border: #d7c8a9;
  --paper: #fbf5e6;
  --paper-deep: #eadfc6;
  --ink-soft: #5d5144;
  --revision: #8a3d2b;
  --font-hand: "Kalam", "Segoe Print", "Bradley Hand", cursive;
  --font-display: "Caveat Variable", "Kalam", cursive;
}
```

Replace dark theme with a warm ink-on-brown variant, not cool slate:

```css
html[data-theme="dark"] {
  --background: #211b15;
  --foreground: #f0e3ca;
  --accent: #8eb6d9;
  --muted: #3a3025;
  --border: #5b4b39;
  --paper: #2b241b;
  --paper-deep: #3a3025;
  --ink-soft: #d6c5a6;
  --revision: #f0a080;
}
```

Update `body` to use the handwritten body font and paper grain:

```css
body {
  @apply flex min-h-svh flex-col text-foreground selection:bg-accent/75 selection:text-background;
  font-family: var(--font-hand);
  background:
    radial-gradient(circle at 18% 12%, rgb(255 255 255 / 0.22), transparent 28rem),
    linear-gradient(90deg, rgb(120 90 45 / 0.035) 1px, transparent 1px),
    linear-gradient(180deg, rgb(120 90 45 / 0.03) 1px, transparent 1px),
    var(--background);
  background-size: auto, 34px 34px, 34px 34px, auto;
}
```

Add utilities:

```css
.manuscript-title {
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: 0;
}

.paper-sheet {
  background: var(--paper);
  box-shadow:
    0 1px 0 rgb(64 45 20 / 0.08),
    0 18px 48px rgb(76 55 25 / 0.10);
}
```

**Step 2: Update typography CSS**

In `src/styles/typography.css`, style revisions:

```css
.app-prose {
  @apply prose;
  font-family: var(--font-hand);

  h1,
  h2,
  h3,
  h4 {
    font-family: var(--font-display);
    letter-spacing: 0;
  }

  del {
    color: var(--ink-soft);
    text-decoration-color: var(--revision);
    text-decoration-thickness: 0.14em;
    text-decoration-skip-ink: none;
  }

  del + br,
  del + p {
    margin-top: 0.25rem;
  }
}
```

Keep existing code block styles, but tune backgrounds to `--paper-deep`.

**Step 3: Set theme color**

In `src/layouts/Layout.astro`, update:

```astro
<meta name="theme-color" content="#f4ecd8" />
```

**Step 4: Build**

Run:

```bash
pnpm build
```

Expected: Build succeeds.

**Step 5: Commit**

```bash
git add src/styles/global.css src/styles/typography.css src/layouts/Layout.astro
git commit -m "feat: apply handwritten paper theme"
```

---

### Task 6: Reshape Home, Cards, Header, and Article Layout

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/components/Card.astro`
- Modify: `src/components/Header.astro`
- Modify: `src/components/Hr.astro`
- Modify: `src/layouts/PostDetails.astro`
- Modify: `src/layouts/Main.astro`

**Step 1: Home page**

Update the hero area to act like a notebook opening page:

- Use `manuscript-title` on `Jin Pan - Learning in Public`.
- Wrap main home content in a `paper-sheet` surface with responsive padding.
- Keep RSS and social links, but make them quiet margin marks.
- Rename `Recent Posts` visually to read like a notebook section while keeping URL/content semantics unchanged.

Concrete classes to use:

```astro
<main id="main-content" data-layout="index" class="mx-auto w-full max-w-app px-4">
  <div class="paper-sheet my-6 rounded-sm border border-border/70 px-5 py-8 sm:my-10 sm:px-10 sm:py-12">
    ...
  </div>
</main>
```

**Step 2: Cards**

Update `src/components/Card.astro` so each post item reads like a written entry:

```ts
const headerProps = {
  style: { viewTransitionName: slugifyStr(title) },
  class: "manuscript-title text-2xl leading-tight decoration-dashed hover:underline",
};
```

Use a left ink rule or faint separator instead of card boxes:

```astro
<li class="my-7 border-s-2 border-accent/45 ps-4">
```

**Step 3: Header**

Keep the existing routes and mobile menu behavior. Change visual tone:

- Site title uses `manuscript-title`.
- Header background should be transparent or paper-toned.
- Nav links should feel like handwritten tabs, not app buttons.
- Existing theme toggle and search remain.

**Step 4: Article layout**

Wrap article content in a paper sheet:

```astro
<main id="main-content" class="mx-auto w-full max-w-app px-4 pb-12" data-pagefind-body>
  <div class="paper-sheet rounded-sm border border-border/70 px-5 py-8 sm:px-10 sm:py-12">
    ...
  </div>
</main>
```

Keep edit link, tags, share links, previous/next links.

**Step 5: Generic list layout**

In `src/layouts/Main.astro`, keep the breadcrumb and session storage script, but
make generic pages share the same paper language:

```astro
<main
  data-backUrl={backUrl}
  id="main-content"
  class="mx-auto w-full max-w-app px-4 pb-8"
>
  <div class="paper-sheet rounded-sm border border-border/70 px-5 py-8 sm:px-10 sm:py-12">
    ...
    <slot />
  </div>
</main>
```

Use `manuscript-title` on the `h1` elements and remove the current italic tone
from the page description.

**Step 6: Visual check**

Run:

```bash
pnpm dev
```

Open:

- `http://localhost:4321/`
- `http://localhost:4321/posts/day-1-of-ios-swiftui-padding/`

Check desktop and 375px mobile:

- No overlapping text.
- Header menu still opens.
- Article line length is readable.
- Strikethrough text is visible and not too harsh.

**Step 7: Build**

Run:

```bash
pnpm build
```

Expected: Build succeeds.

**Step 8: Commit**

```bash
git add src/pages/index.astro src/components/Card.astro src/components/Header.astro src/components/Hr.astro src/layouts/PostDetails.astro src/layouts/Main.astro
git commit -m "feat: shape pages as paper manuscript"
```

---

### Task 7: Document MCP Usage

**Files:**
- Create: `docs/mcp.md`
- Modify: `README.md`

**Step 1: Add docs**

Create `docs/mcp.md`:

````md
# Blog MCP Server

This repository includes a local MCP server for AI tools that need to read or
edit blog posts.

## Run

```bash
pnpm mcp:blog
```

## Example Client Config

```json
{
  "mcpServers": {
    "jinpan-blog": {
      "command": "pnpm",
      "args": ["mcp:blog"],
      "cwd": "/Users/jin/Dropbox/Notes/my-notes"
    }
  }
}
```

## Tools

- `list_posts`: list post metadata.
- `read_post`: read one Markdown post by slug.
- `create_draft`: create a new draft post.
- `append_revision`: replace one exact old sentence with struck-through old text
  and new text below it.
- `update_frontmatter`: update safe frontmatter fields.

## Revision Style

Use Markdown strikethrough for the old line, followed by the new line:

```md
~~Old sentence.~~

New sentence.
```
````

**Step 2: Link from README**

Add a short section to `README.md`:

```md
## AI / MCP

This blog includes a local MCP server for AI-assisted drafting and revision.
See `docs/mcp.md`.
```

**Step 3: Verify docs and smoke**

Run:

```bash
pnpm mcp:smoke
pnpm build
```

Expected: both pass.

**Step 4: Commit**

```bash
git add docs/mcp.md README.md
git commit -m "docs: explain blog MCP workflow"
```

---

### Task 8: Final Verification

**Files:**
- No planned edits unless verification finds issues.

**Step 1: Run full checks**

Run:

```bash
pnpm test
pnpm run lint
pnpm run format:check
pnpm build
pnpm mcp:smoke
```

Expected: all pass.

**Step 2: Browser verification**

Run dev server:

```bash
pnpm dev
```

Verify:

- Home page loads at desktop width.
- Home page loads at 375px mobile width.
- Article page loads at desktop width.
- Article page loads at 375px mobile width.
- Menu opens and closes on mobile.
- Theme toggle still works.
- Search route still loads.
- Paper texture is visible but does not reduce readability.
- Handwritten font is readable in long paragraphs.

**Step 3: Fix only verification issues**

If any check fails, fix the smallest related issue, rerun the failing command,
then rerun the full checks.

**Step 4: Commit final fixes if needed**

```bash
git add <changed-files>
git commit -m "fix: polish handwritten blog MCP rollout"
```

Only commit if verification required fixes.

---

## Rollback

Each task is committed separately. To roll back the MCP server while keeping the
visual redesign, revert the commits from Tasks 2, 3, and 7. To roll back the
visual redesign while keeping MCP, revert Tasks 5 and 6.
