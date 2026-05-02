# Blog MCP Server

This repository includes a local MCP server for AI tools that need to read or
edit living topic notes.

The site now treats each Markdown file in `src/data/blog` as one durable topic
notebook. Prefer appending dated notes to an existing topic page over creating
new posts.

## Run

```bash
pnpm mcp:blog
```

## Example Client Config

Use `--silent` when launching through an MCP client so package-manager output
does not mix with the stdio protocol.

```json
{
  "mcpServers": {
    "jinpan-blog": {
      "command": "pnpm",
      "args": ["--silent", "mcp:blog"],
      "cwd": "/Users/jin/Dropbox/Notes/my-notes"
    }
  }
}
```

## Tools

- `list_notes`: list living note metadata.
- `read_note`: read one Markdown note by slug.
- `append_note_to_topic`: append a short Markdown note to a topic page under a
  `YYYY-MM-DD` heading. If that date already exists, the new note is appended
  to the existing section. If not, a new dated section is created.
- `list_posts`: legacy alias for listing note metadata.
- `read_post`: legacy alias for reading one Markdown note by slug.
- `create_draft`: create a new draft post.
- `append_revision`: replace one exact old sentence with struck-through old text
  and new text below it.
- `update_frontmatter`: update safe frontmatter fields.

## Resources

- `site://config`: safe public site metadata.
- `notes://all`: all note metadata.
- `notes://slug/{slug}`: raw Markdown for a single note.
- `posts://all`: all post metadata.
- `posts://slug/{slug}`: raw Markdown for a single post.

## Prompts

- `append_topic_note`: prepare short Markdown suitable for
  `append_note_to_topic`.
- `draft_blog_post`: draft a note from a topic and notes.
- `revise_with_strikethrough`: format a visible revision.
- `summarize_post`: summarize Markdown for AI context.

## Recommended AI Workflow

1. Use `list_notes` to find the right topic slug.
2. Use `read_note` to inspect the existing page.
3. Use `append_note_to_topic` for new thoughts instead of creating a new post.
4. Use `update_frontmatter` only when the title, description, tags, or pinned
   status should change.

## Revision Style

Use Markdown strikethrough for the old line, followed by the new line:

```md
~~Old sentence.~~

New sentence.
```

The MCP server only writes inside `src/data/blog`, creates new posts as drafts,
and refuses ambiguous revision edits when the old text appears more than once.
