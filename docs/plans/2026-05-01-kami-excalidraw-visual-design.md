# Kami Excalidraw Visual Design

## Goal

Refine the blog into a short-form handwritten paper journal before continuing
MCP work.

## Direction

- Use Kami as the paper reference: warm off-white canvas, quiet ink blue, soft
  warm gray borders, low depth, and document-like restraint.
- Use an Excalidraw-like handwriting feel across the whole site, including
  headings, body copy, navigation, dates, tags, and controls.
- Optimize for short notes and compact viewpoints instead of long essay
  reading. The writing should feel like public margin notes on good paper.
- Keep the existing Astro routes and content model.
- Do not change MCP files during this visual pass.

## Implementation Plan

1. Update the global palette, font stack, paper texture, and reusable note
   utilities in `src/styles/global.css`.
2. Tune Markdown typography in `src/styles/typography.css` for short
   handwritten notes: larger body text, relaxed line height, clear code blocks,
   and manuscript-style strikethrough revisions.
3. Adjust the home page, header, post cards, generic layout, and article layout
   to feel like one paper notebook rather than boxed app surfaces.
4. Run formatting and build checks.
5. Inspect desktop and mobile pages in a browser, then polish spacing and
   readability issues.
