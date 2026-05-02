import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

const DEFAULT_BLOG_DIR = path.resolve(process.cwd(), "src/data/blog");
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const FrontmatterPatchSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    tags: z.array(z.string().min(1)).optional(),
    pubDatetime: z.iso.datetime().optional(),
    modDatetime: z.iso.datetime().nullable().optional(),
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

export interface AppendNoteToTopicInput {
  slug: string;
  content: string;
  date?: string;
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

function todayInSiteTimezone() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric",
  }).format(new Date());
}

function validateDate(date: string) {
  if (!DATE_PATTERN.test(date)) {
    throw new Error(`Invalid date: ${date}`);
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }

  const normalized = parsed.toISOString().slice(0, 10);

  if (normalized !== date) {
    throw new Error(`Invalid date: ${date}`);
  }

  return date;
}

function appendToDatedSection(markdown: string, date: string, content: string) {
  const trimmedMarkdown = markdown.trimEnd();
  const trimmedContent = content.trim();
  const heading = `## ${date}`;
  const headingPattern = new RegExp(`^## ${date}$`, "m");
  const headingMatch = headingPattern.exec(trimmedMarkdown);

  if (!headingMatch) {
    return `${trimmedMarkdown}\n\n${heading}\n\n${trimmedContent}\n`;
  }

  const sectionStart = headingMatch.index;
  const searchStart = sectionStart + heading.length;
  const nextHeadingIndex = trimmedMarkdown.slice(searchStart).search(/\n## /);
  const insertAt =
    nextHeadingIndex === -1
      ? trimmedMarkdown.length
      : searchStart + nextHeadingIndex;

  return `${trimmedMarkdown.slice(0, insertAt).trimEnd()}\n\n${trimmedContent}\n${trimmedMarkdown.slice(insertAt).trimStart() ? `\n${trimmedMarkdown.slice(insertAt).trimStart()}` : ""}`;
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

    const source = matter.stringify(
      input.body?.trim() ? `${input.body.trim()}\n` : "",
      {
        title: input.title,
        author: "Jin Pan",
        pubDatetime: new Date().toISOString(),
        slug,
        featured: false,
        draft: true,
        tags: input.tags?.length ? input.tags : ["Draft"],
        description: input.description,
      }
    );

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

  async function appendNoteToTopic(input: AppendNoteToTopicInput) {
    const content = input.content.trim();

    if (!content) {
      throw new Error("Note content cannot be empty");
    }

    const date = validateDate(input.date ?? todayInSiteTimezone());
    const filePath = fileForSlug(input.slug);
    const parsed = matter(await readFile(filePath, "utf8"));
    const nextContent = appendToDatedSection(parsed.content, date, content);
    const next = matter.stringify(nextContent, {
      ...parsed.data,
      modDatetime: new Date(`${date}T00:00:00.000Z`),
    });

    await writeFile(filePath, next, "utf8");
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
    appendNoteToTopic,
    appendRevision,
    createDraft,
    listPosts,
    readPost,
    updateFrontmatter,
  };
}
