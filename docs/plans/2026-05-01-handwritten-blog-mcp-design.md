# Handwritten Blog With Local MCP Design

## Approved Direction

Build the first version as:

**Paper manuscript visual design + Markdown revision syntax + local MCP content tools.**

The site stays an Astro static blog. Markdown files under `src/data/blog` now
act as living topic notebooks: one durable page per category, updated over
time. The new MCP layer runs locally and edits repository content through
controlled tools instead of adding a hosted CMS or backend.

## Goals

- Redesign the blog so it feels like a warm paper notebook or handwritten
  manuscript.
- Keep the site focused on short topic notes and learning-in-public writing.
- Support visible revision marks: old text can be struck through, and revised
  text can appear directly underneath.
- Add a local MCP server so AI tools can list notes, read topic pages, append
  dated updates, and revise existing text.
- Preserve static deployment and the existing Astro content workflow.

## Non-Goals

- No hosted CMS in the first version.
- No browser-based editor or login system in the first version.
- No remote write API in the first version.
- No database. Markdown remains the source of truth.
- No full version history UI yet. Git remains the version history.

## Visual Thesis

The site should feel like a private field notebook made public: warm parchment,
soft ink, handwritten headings, and quiet manuscript marks. It should borrow
Kami's "good content deserves good paper" restraint, but move away from formal
serif document design toward a more personal handwritten writing surface.

## Visual System

### Canvas

- Use a parchment background in the warm cream range.
- Avoid pure white and cool gray surfaces.
- Add subtle paper grain with CSS gradients or a lightweight texture.
- Keep depth soft: hairlines, faint shadows, and ink-like separators.

### Typography

- Use a handwriting-style display font for the site title, section headings,
  and article titles.
- Use a readable long-form body font for article text. It can have handwritten
  warmth, but must remain comfortable for English essays.
- Keep code blocks in a readable monospace stack.
- Avoid making every paragraph look like decorative handwriting if it hurts
  reading speed.

### Layout

- Home page starts as the notebook itself: author identity, short intro, and
  living topic pages.
- Article pages should read like manuscript pages with comfortable measure,
  margin notes for dates/tags, and restrained navigation.
- Existing routes remain: home, posts, tags, archives, search, about.
- Do not add a marketing-style hero. The first screen is the writing surface.

### Motion

- Use subtle page-load reveals and ink-like hover states.
- Avoid decorative motion that distracts from reading.
- Respect reduced-motion preferences.

## Revision Markup

The first version uses standard Markdown strikethrough for old text:

```md
~~I used to think SEO was just keywords.~~

Now I see SEO as a feedback loop between search intent, product clarity, and
useful writing.
```

The rendered style should make this read as a manuscript correction:

- Old line is struck through and visually muted.
- New line appears directly below.
- Paragraph spacing keeps old and new lines connected.
- The CSS should support plain Markdown without requiring a custom editor.

Optional later enhancement:

```md
:::revision
~~Old sentence.~~

New sentence.
:::
```

Do not require the custom container in v1 unless standard Markdown is not enough
to achieve the desired visual style.

## MCP Architecture

Use the official TypeScript MCP SDK through a local stdio server. The server
lives inside this repository, runs from the command line, and reads/writes
Markdown files in `src/data/blog`.

### Resources

- `posts://all`: all post metadata.
- `posts://slug/{slug}`: raw Markdown for a single post.
- `site://config`: safe site metadata such as title, domain, author, language,
  and content paths.

### Tools

- `list_posts`: return post slugs, titles, dates, draft status, and tags.
- `read_post`: return the raw Markdown for a selected post.
- `create_draft`: create a new Markdown draft with frontmatter.
- `append_note_to_topic`: add a short note under a dated section in an existing
  topic notebook.
- `append_revision`: append a revision block using strikethrough old text and
  replacement text below it.
- `update_frontmatter`: update safe frontmatter fields such as title,
  description, tags, dates, featured, and draft.

### Prompts

- `draft_blog_post`: draft a post from a topic and notes.
- `revise_with_strikethrough`: rewrite a passage while preserving the old line
  as struck-through text.
- `summarize_post`: summarize a post for AI context.

## Safety

- Restrict all MCP file writes to `src/data/blog`.
- Validate slugs before reading or writing files.
- Parse frontmatter with a library instead of ad hoc string replacement.
- Avoid overwriting existing posts unless the tool explicitly supports the
  operation.
- Default new posts to drafts.
- Keep destructive operations out of v1.

## Testing

- Add unit tests for slug validation, frontmatter parsing, draft creation, and
  revision appending.
- Add build verification with `pnpm build`.
- Add visual verification for desktop and mobile after the theme is implemented.
- Verify the MCP server with a simple list/read/create flow.

## Rollout

1. Implement visual theme and revision styling.
2. Add AI-readable static outputs such as `llms.txt` or a generated posts index
   if useful for MCP and search.
3. Add the local MCP server and tests.
4. Document how to run the MCP server from local AI tools.

## Open Decisions

- Final font choice should be selected during implementation after checking
  readability on real article pages.
- MCP client configuration should be documented generically first, then tailored
  to the user's preferred AI client once known.
