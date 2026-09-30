# Code Review: PR 54 Moon light theme (re-review)

- **PR**: https://github.com/pterodactor3000/ttrpg-handouts-generator/pull/54
- **Branch**: `feature/moon-chrome`
- **Local head**: `d8bd3ab` fix(chrome): keep password text clear of the eye
- **GitHub head**: `83176a7` (the two original commits only; the two fix commits are not pushed)
- **This pass**: 2026-09-28, after `83bbc10` and `d8bd3ab`
- **Verdict**: Ready. Push `feature/moon-chrome` so the pull request contains the fix commits.

## Closed

- **Radius token.** `.moon-chrome` no longer sets `--radius`. `:root` stays `0rem`. 8px controls use the slot rule or `rounded-[0.5rem]`. Cards, the top bar, and dialogs use `0.75rem` in the slot CSS or `rounded-[0.75rem]`. The empty-dashboard link matches the other dashboard buttons at 8px.
- **Auth errors.** `FormField` sets `aria-invalid` when `error` is set. Input and textarea invalid styles use `box-shadow: inset 0 0 0 2px var(--destructive)`, including focus. Hover does not paint over that ring.
- **Status chips.** Badge CSS sets radius only. Draft, published, and archived colors come from `StatusBadge.astro`. Published stays purple (`text-primary` on `bg-primary/10`). Draft and archived share the gray chip on purpose. The label is what separates them.
- **Archive click.** `moveHandoutCardToArchivedSection` sets `data-status="archived"` and the archived class string (`rounded-[0.5rem]`, `border-border`, `bg-muted`, `text-muted-foreground`). `__tests__/lib/archive-handout-card-dom.test.ts` passed (1 test).
- **Keyboard focus.** `box-shadow: none` applies only on `[data-slot='button']:not(:focus-visible)`. Focus draws a 3px ring from `--ring`. Welcome, dashboard, and the card Edit link opt in with `data-slot="button"`.
- **Password eye and server error.** The toggle is `text-muted-foreground` / `hover:text-foreground`. `ServerError` uses `text-destructive` on `bg-destructive/10`.
- **Dashboard actions and confirms.** Archive, Copy link, and Delete use Moon tokens. Copied state is `text-primary` on `bg-primary/10`. Archive and delete dialogs carry `moon-chrome` on `DialogContent`, so the portaled dialog is light.
- **Destructive contrast.** `--destructive` is `#b83848`. White on that fill is **5.68:1**. The color on the page (`#f6f7f9`) is **5.30:1**. The color on a 10% tint over white is **4.90:1**.
- **Shared handout extras reverted.** Title is `text-3xl` again. Article padding is `p-4 md:p-8`. Share gutter is `px-4`. Preview padding is `p-4`. Prose heading overrides and the background-picker phone shrink are gone. Sci-fi below 767px changes `border-width` to 24px and leaves `border-image: … 60 fill` (stretch) in place.
- **DM Sans.** `Layout` loads the Google stylesheet only when `loadChromeFont` is set. Landing, auth, dashboard, and both handout editor routes set it. The share route does not.
- **Preview placeholder.** The empty line uses `text-brand-accent-light`, which reads `--palette-accent-light`, so the Moon `--muted-foreground` does not leak into the preview.
- **Token and duplication cleanup.** Input and textarea share one rule and use `var(--border)`, `var(--ring)`, and `var(--destructive)`. Hover and focus stay at `0.5rem`. Sidebar tokens are gone. `fieldInputClass` is gone. Status color lives only in `StatusBadge`.

## Password clearance (closed in `d8bd3ab`)

`FormField` adds `pr-10` only when `endContent` is set. Sign-in password, sign-up password, and confirm password pass `PasswordToggle`. Email fields do not, so they keep `padding-right: 1rem`.

`.moon-chrome [data-slot='input'].pr-10` sets `padding-right: 2.5rem` after the `padding: 0 1rem` shorthand, same pattern as `.pl-10`. The eye is 16px at `right-3` (it occupies the outer 28px). 40px of padding leaves about 12px between the text and the icon.

`TagsInput` no longer passes `h-auto py-1 text-sm`. The slot rule is what paints that field.

A long title can still wrap on a phone. The frame is 24px below 767px and the title stays `text-3xl` with `break-words`. That is the frame-only choice from the previous pass, not a new defect.

## Summary

The review findings are closed on local `d8bd3ab`. Push the branch so PR 54 is no longer stuck at `83176a7`.
