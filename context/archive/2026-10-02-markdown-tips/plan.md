# Markdown tips Implementation Plan

## Overview

A GM writing a new or existing handout can open a help icon next to the markdown field. The icon opens a modal with a short guide and examples of syntax the preview already renders. Raw HTML stays out of the guide. This is roadmap S-16 and PRD FR-017. FR-004 stays as it is: the GM still types markdown into the same field.

## Current State Analysis

`HandoutEditor` is the only editor. `/handouts/new` mounts it with no props (`src/pages/handouts/new.astro` line 6). `/handouts/[id]/edit` mounts it with `initialHandout` (`src/pages/handouts/[id]/edit.astro` lines 24-25). The markdown label and textarea are in `src/components/organisms/HandoutEditor.tsx` lines 202-216. The preview calls `renderHandoutHtml` at line 84.

`src/lib/handout-renderer.ts` lines 9-16 run remark-gfm, refuse raw HTML, and sanitize. `__tests__/lib/handout-renderer.test.ts` lines 5-61 cover headings, bold, italic, unordered lists, ordered lists, blockquotes, inline code, fenced code, tables, and links. Lines 95-97 show that a raw `<b>` tag does not pass through.

The organism already opens `Dialog` for unsaved edits (lines 322-343) and `ShareDialog` (lines 314-319). `lucide-react` is already used for icons. No help control exists.

## Desired End State

On the new-handout page and the edit page, a button named "Markdown help" sits beside the "Content (Markdown)" label. Activating it opens a dialog titled "Markdown tips". The dialog lists nine examples. Each example shows its source as text and its preview through `renderHandoutHtml`. Closing the dialog leaves the textarea value unchanged. The shared handout page has no help control.

Verify with `npm test -- --project unit` on the new guide test and `HandoutEditor.test.tsx`, then open both editor routes and the shared page.

## What We're NOT Doing

- A WYSIWYG editor. The PRD parks that.
- Raw HTML examples. FR-017 and the S-16 risk line keep them out.
- Syntax the renderer tests do not cover: strikethrough, task lists, images, and language-tagged highlighting.
- A help control on `/share/<token>`.
- Any change to `renderHandoutHtml` or the handout save API.

## Implementation Approach

Add a static guide module, then a dialog organism opened from `HandoutEditor`. Both editor routes already share that organism, so one control covers new and edit. The dialog follows `ShareDialog`: `open` and `onClose` props, and the existing `Dialog` atoms.

## Critical Implementation Details

Each example is rendered with `renderHandoutHtml`, the same function the preview uses. The source string is shown as text, not as HTML. Do not reuse `HandoutArticle` for the snippets. That component always prints a handout title (`src/components/molecules/HandoutArticle.tsx` lines 15-16).

The help control is `type="button"`. Its click only opens the dialog. It does not call `setMarkdownContent`.

## Phase 1: Guide content

### Overview

A static list of the nine syntaxes the renderer tests already cover, with a test that each example renders and that none of the source strings contain raw HTML.

### Changes Required

#### 1. Guide module

**File:** `src/lib/markdown-guide.ts`

**Intent:** Hold the guide copy in one place so the dialog and the test share it.

**Contract:** Export `MARKDOWN_GUIDE_EXAMPLES`, a readonly array of `{ id, label, markdown }`. The ids are `heading`, `emphasis`, `unordered-list`, `ordered-list`, `blockquote`, `inline-code`, `fenced-code`, `table`, and `link`. The `markdown` values follow the inputs in `__tests__/lib/handout-renderer.test.ts` lines 7-59. No entry contains a raw HTML tag.

#### 2. Guide test

**File:** `__tests__/lib/markdown-guide.test.ts`

**Intent:** Fail if an example stops rendering, or if raw HTML is added to the guide.

**Contract:** For each entry, `renderHandoutHtml(markdown)` contains the fragment paired with its id: `heading` to `<h1>`, `emphasis` to `<strong>` and `<em>`, `unordered-list` to `<ul>`, `ordered-list` to `<ol>`, `blockquote` to `<blockquote>`, `inline-code` to `<code>`, `fenced-code` to `<pre`, `table` to `<table>`, and `link` to `href="https://example.com"`. A separate assertion rejects `<` followed by a letter in every `markdown` string.

### Success Criteria

#### Automated Verification

- `MARKDOWN_GUIDE_EXAMPLES` has one entry for each of the nine ids.
- Each entry renders to the fragment paired with its id in the test contract.
- No example `markdown` string contains a raw HTML tag.
- `npm test -- --project unit` passes `__tests__/lib/markdown-guide.test.ts`, and `npm run lint` passes.

#### Manual Verification

- A reader of `src/lib/markdown-guide.ts` sees those nine examples and no raw HTML.

---

## Phase 2: Help modal

### Overview

The markdown label gains a help icon. The icon opens a dialog that shows the guide. The draft is left alone.

### Changes Required

#### 1. Tips dialog

**File:** `src/components/organisms/MarkdownTipsDialog.tsx`

**Intent:** Show the guide in the same dialog pattern as `ShareDialog`.

**Contract:** Props are `{ open: boolean; onClose: () => void }`. The title is "Markdown tips". For each `MARKDOWN_GUIDE_EXAMPLES` entry, the dialog shows `label`, the `markdown` source as text, and `renderHandoutHtml(markdown)` as sanitized HTML. An inner wrapper scrolls inside a max height. `DialogContent` keeps overflow visible so the close control stays put. Closing calls `onClose`.

#### 2. Editor control

**File:** `src/components/organisms/HandoutEditor.tsx`

**Intent:** Put the help control on the markdown field for both editor routes.

**Contract:** Beside the label at lines 202-205, add a `Button` with `type="button"`, `variant="ghost"`, `size="icon"`, `aria-label="Markdown help"`, and the lucide `CircleQuestionMark` icon. Local state, same shape as `shareDialogOpen` at line 54, opens `MarkdownTipsDialog`. The button does not change `markdownContent`.

#### 3. Editor tests

**File:** `__tests__/components/organisms/HandoutEditor.test.tsx`

**Intent:** Lock the button, the dialog, and the unchanged draft.

**Contract:** Follow the existing `userEvent` setup in that file. Cover a fresh editor and an editor rendered with `initialHandout`.

### Success Criteria

#### Automated Verification

- A fresh `HandoutEditor` and one rendered with `initialHandout` both show a button named "Markdown help" beside "Content (Markdown)".
- Activating that button shows a dialog titled "Markdown tips" that includes every guide label and one rendered fragment per example.
- After typing in the markdown textarea, opening the dialog and closing it leaves the textarea value unchanged.
- `npm test -- --project unit` passes `__tests__/components/organisms/HandoutEditor.test.tsx`, and `npm run lint` passes.

#### Manual Verification

- On `/handouts/new` and on an edit URL, the help icon sits beside the markdown label, the dialog shows the guide, and closing it keeps the typed draft.
- `/share/<token>` has no Markdown help control.

---

## Testing Strategy

### Unit Tests

- Guide entries match the nine renderer cases and contain no raw HTML.
- The editor shows the help button for a new handout and an existing handout.
- Opening and closing the dialog does not change the textarea.

### Integration Tests

- None. The guide and the dialog do not cross an API or database boundary.

### Manual Testing Steps

1. Open `/handouts/new`. Confirm the help icon is beside "Content (Markdown)".
2. Type a line in the textarea. Open the dialog, read one rendered example, and close it. Confirm the typed line is still there.
3. Open an existing handout edit URL and repeat step 2.
4. Open a shared handout. Confirm there is no Markdown help control.

## References

- Roadmap: `context/foundation/roadmap.md` (S-16)
- PRD: `context/foundation/prd.md` (FR-004, FR-017)
- Editor label: `src/components/organisms/HandoutEditor.tsx` lines 202-216
- Preview render: `src/components/organisms/HandoutEditor.tsx` line 84
- Renderer: `src/lib/handout-renderer.ts` lines 9-16
- Renderer cases: `__tests__/lib/handout-renderer.test.ts` lines 5-61 and 95-97
- Dialog pattern: `src/components/organisms/ShareDialog.tsx` lines 14-20
- New handout mount: `src/pages/handouts/new.astro` line 6
- Edit mount: `src/pages/handouts/[id]/edit.astro` lines 24-25

## Progress

> `- [ ]` is pending and `- [x]` is complete. Append a commit SHA when a step lands.

### Phase 1: Guide content

#### Automated

- [x] 1.1 `MARKDOWN_GUIDE_EXAMPLES` has one entry for each of the nine ids. c5e07f0
- [x] 1.2 Each entry renders to the fragment paired with its id in the test contract. c5e07f0
- [x] 1.3 No example `markdown` string contains a raw HTML tag. c5e07f0
- [x] 1.4 `npm test -- --project unit` passes `__tests__/lib/markdown-guide.test.ts`, and `npm run lint` passes. c5e07f0

#### Manual

- [ ] 1.5 A reader of `src/lib/markdown-guide.ts` sees those nine examples and no raw HTML.

### Phase 2: Help modal

#### Automated

- [x] 2.1 A fresh `HandoutEditor` and one rendered with `initialHandout` both show a button named "Markdown help" beside "Content (Markdown)". d58312c
- [x] 2.2 Activating that button shows a dialog titled "Markdown tips" that includes every guide label and one rendered fragment per example. d58312c
- [x] 2.3 After typing in the markdown textarea, opening the dialog and closing it leaves the textarea value unchanged. d58312c
- [x] 2.4 `npm test -- --project unit` passes `__tests__/components/organisms/HandoutEditor.test.tsx`, and `npm run lint` passes. d58312c

#### Manual

- [ ] 2.5 On `/handouts/new` and on an edit URL, the help icon sits beside the markdown label, the dialog shows the guide, and closing it keeps the typed draft.
- [ ] 2.6 `/share/<token>` has no Markdown help control.
