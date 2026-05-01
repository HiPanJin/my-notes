# Blog MCP Server

This repository includes a local MCP server for AI tools that need to read or
edit blog posts.

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

- `list_posts`: list post metadata.
- `read_post`: read one Markdown post by slug.
- `create_draft`: create a new draft post.
- `append_revision`: replace one exact old sentence with struck-through old text
  and new text below it.
- `update_frontmatter`: update safe frontmatter fields.

## Resources

- `site://config`: safe public site metadata.
- `posts://all`: all post metadata.
- `posts://slug/{slug}`: raw Markdown for a single post.

## Prompts

- `draft_blog_post`: draft a post from a topic and notes.
- `revise_with_strikethrough`: format a visible revision.
- `summarize_post`: summarize Markdown for AI context.

## Revision Style

Use Markdown strikethrough for the old line, followed by the new line:

```md
~~Old sentence.~~

New sentence.
```

The MCP server only writes inside `src/data/blog`, creates new posts as drafts,
and refuses ambiguous revision edits when the old text appears more than once.
