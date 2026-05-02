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

  it("appends a dated note section to a topic page", async () => {
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
        "Opening note.",
      ].join("\n")
    );

    await store.appendNoteToTopic({
      slug: "note",
      content: "今天先记一句。",
      date: "2026-05-02",
    });

    const text = await readFile(file, "utf8");
    expect(text).toContain("modDatetime: 2026-05-02T00:00:00.000Z");
    expect(text).toContain("Opening note.\n\n## 2026-05-02\n\n今天先记一句。\n");
  });

  it("appends to an existing dated section without duplicating the heading", async () => {
    const store = createBlogStore({ blogDir });
    const file = path.join(blogDir, "note.md");
    await writeFile(
      file,
      [
        "---",
        "title: Note",
        "pubDatetime: 2026-05-01T00:00:00.000Z",
        "modDatetime: 2026-05-01T00:00:00.000Z",
        "draft: false",
        "tags:",
        "  - Test",
        "description: Note description.",
        "---",
        "",
        "Opening note.",
        "",
        "## 2026-05-02",
        "",
        "第一条。",
      ].join("\n")
    );

    await store.appendNoteToTopic({
      slug: "note",
      content: "- 第二条",
      date: "2026-05-02",
    });

    const text = await readFile(file, "utf8");
    expect(text.match(/^## 2026-05-02$/gm)).toHaveLength(1);
    expect(text).toContain("## 2026-05-02\n\n第一条。\n\n- 第二条");
  });

  it("rejects impossible note dates", async () => {
    const store = createBlogStore({ blogDir });
    const file = path.join(blogDir, "note.md");
    await writeFile(file, "---\ntitle: Note\n---\n\nBody");

    await expect(
      store.appendNoteToTopic({
        slug: "note",
        content: "Bad date should not write.",
        date: "2026-99-99",
      })
    ).rejects.toThrow("Invalid date");
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
