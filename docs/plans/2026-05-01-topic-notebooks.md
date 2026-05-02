# Topic Notebooks Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the blog from a chronological post stream into a small set of
living topic notebooks.

**Architecture:** Keep Astro content collections and Markdown files as the
source of truth. Treat each Markdown file in `src/data/blog` as one durable
topic page that receives dated updates over time. Adjust visible IA and copy so
the site reads as notebooks/topics instead of articles/posts.

**Tech Stack:** Astro 5, Markdown content collections, Tailwind CSS 4,
existing handwritten paper theme.

---

### Task 1: Reshape Content Into Living Topic Pages

**Files:**
- Modify: `src/data/blog/starting-ios-and-seo.md`
- Modify: `src/data/blog/day-1-of-ios-swiftui-padding.md`

**Steps:**
1. Convert the broad starter post into an `SEO Notes` living notebook.
2. Convert the SwiftUI day-one post into an `iOS + SwiftUI Notes` living
   notebook.
3. Use dated sections for updates.
4. Keep frontmatter compatible with the existing Astro schema.

### Task 2: Rename Public IA

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/pages/posts/[...page].astro`
- Modify: `src/pages/tags/index.astro`
- Modify: `src/components/Header.astro`

**Steps:**
1. Rename visible `Posts` navigation to `Notes`.
2. Rename the posts index title from posts/articles to notebooks/topics.
3. Make the home page intro explain the “one topic, one living page” model.
4. Soften tags into a secondary index.

### Task 3: Tune Cards and Article Metadata

**Files:**
- Modify: `src/components/Card.astro`
- Modify: `src/layouts/PostDetails.astro`

**Steps:**
1. Present cards as topic notebook entries rather than article teasers.
2. Use labels such as `Updated` where the component can still rely on existing
   date fields.
3. Keep URLs unchanged for now to avoid routing churn.

### Task 4: Update MCP Roadmap Notes

**Files:**
- Modify: `docs/mcp.md`
- Modify: `docs/plans/2026-05-01-handwritten-blog-mcp-design.md`

**Steps:**
1. Note that MCP should prioritize appending dated notes to existing topic
   pages.
2. Keep existing MCP implementation intact during this visual/content pass.

### Task 5: Verify

**Steps:**
1. Run `pnpm run format:check`.
2. Run `pnpm run lint`.
3. Run `pnpm build`.
4. Check home, notes index, and one notebook page in the browser.
