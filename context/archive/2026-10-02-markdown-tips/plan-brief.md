# Markdown tips Plan Brief

> Full plan: `context/changes/markdown-tips/plan.md`
> Roadmap item: `context/foundation/roadmap.md` (S-16)

## What and Why

A GM writing a handout can open a help icon beside the markdown field and read a short guide with examples. The examples are the syntax the preview already renders. Raw HTML is left out so the guide does not teach markup the renderer drops. This is FR-017.

## Starting Point

`HandoutEditor` is shared by the new-handout page and the edit page. It has a markdown textarea and a live preview through `renderHandoutHtml`. It has no help control. The renderer tests already name nine syntaxes and show that raw HTML is stripped.

## Desired End State

Both editor routes show a "Markdown help" button beside the markdown label. The button opens a "Markdown tips" dialog with those nine examples, each shown as source text and as rendered preview. Closing the dialog keeps the draft. The shared page has no help control.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Complexity | Low | One organism, the existing dialog, and static copy | Plan confirmation |
| Example set | The nine syntaxes in the renderer tests | The preview already renders them | Roadmap risk, renderer tests |
| Raw HTML | Out of the guide | The renderer strips it | FR-017, S-16 |
| Where the control lives | `HandoutEditor` only | New and edit both mount that organism | Code |
| How examples render | `renderHandoutHtml` | The dialog uses the same pipeline as the preview | S-16 risk |

## Scope

**In scope:**

- A static guide of the nine tested syntaxes
- A help button and dialog on the shared editor
- Tests that the examples render, that raw HTML is absent, and that the draft is unchanged

**Out of scope:**

- WYSIWYG editing
- Raw HTML, strikethrough, task lists, images, and language-tagged highlighting
- The shared handout page
- Changes to the renderer or the save API

## Approach

Phase 1 adds the guide module and its test. Phase 2 adds a dialog organism and a help button on the markdown label, covered by the existing editor tests.

## Phases at a Glance

| Phase | Deliverable | Key risk |
| --- | --- | --- |
| 1. Guide content | Nine examples locked to the renderer | An example documents syntax the preview drops |
| 2. Help modal | Help button and dialog on both editor routes | Opening the dialog clears or dirties the draft |

## Risks and Assumptions

- The guide can drift from the preview if an example is rendered by a different function. Phase 1 calls `renderHandoutHtml`.
- `CircleQuestionMark` from `lucide-react` is the icon. The package is already used in the app.
- `HandoutArticle` is not reused for snippets, because it always prints a handout title.

## Success Criteria

- The GM can open Markdown help beside the markdown field on a new handout and on an existing handout.
- The dialog shows rendered examples of the syntax the preview already accepts, and no raw HTML.
- Closing the dialog leaves the typed markdown in place.
