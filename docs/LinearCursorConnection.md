# Linear MCP Connection in Cursor on Linux (Arch)

This document records findings from connecting Linear to Cursor on Linux when the official Linear MCP plugin OAuth flow fails to complete. Originally hit on an Arch-based system, but this is a **known, Cursor-staff-confirmed Linux bug** that also reproduces on Ubuntu, Debian, and Fedora across `.deb`, `.rpm`, and `.AppImage` installs.

**Decision date**: 2026-06-06

---

## Prerequisites

| Step | Detail |
|------|--------|
| Cursor | Installed as an `.AppImage` on an Arch-based distribution |
| Linear account | Required for integration |
| Linear plugin | Installed in Cursor (Settings → MCP) |

---

## The Problem

The official Linear MCP plugin uses an OAuth flow that breaks on Linux:

1. Click **Connect** in **Settings → MCP → Linear**
2. Browser opens — authorize the application
3. Browser redirects to a `cursor://(...)` callback URL
4. Cursor opens in a **new window**, **without** the authorization context from the original session

Result: OAuth never completes; the Linear MCP server stays in `needsAuth` / disconnected.

This is not Linear-specific — the same failure is reported for the Notion MCP server and any MCP that relies on the browser → `cursor://` OAuth callback.

---

## Root Cause

The `cursor://` URL scheme handler **is** registered correctly. The failure is that the callback is delivered to a **new Cursor process/window** instead of being routed to the already-running instance that started the OAuth flow, so the in-flight auth session never receives the callback.

| Item | Detail |
|------|--------|
| **Flow** | Browser-based OAuth → `cursor://` deep-link callback |
| **Expected behavior** | Callback attaches auth to the existing Cursor instance |
| **Actual behavior** | Callback spawns a fresh Cursor window with no MCP auth state |
| **Scheme handler** | `x-scheme-handler/cursor` is registered — not a missing-handler issue |
| **Impact** | Official plugin **Connect** button cannot finish authorization |

Diagnostic observations from the community reports:

| Command | Result |
|---------|--------|
| `xdg-open 'cursor://test'` | Opens a **new** window |
| `gio open 'cursor://test'` | Opens a **new** window |
| `/usr/share/cursor/cursor --open-url 'cursor://test'` | Does **not** open a new window (routes correctly) |

Cursor logs during the failed flow show:

```text
OAuth provider needs auth callback during connection
Connect failed after auth_required; returning needsAuth
```

---

## The Fix (recommended): API key instead of OAuth

Remove the Linear plugin and add a **custom MCP** server authenticated with a personal API key. This skips the browser → `cursor://` callback entirely, so the deep-link bug is irrelevant.

### 1. Remove the official plugin

In **Settings → MCP**, remove or disable the Linear plugin.

### 2. Add custom MCP configuration

Click **Add custom MCP** and paste:

```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.linear.app/mcp"],
      "env": {
        "LINEAR_API_KEY": "<API_KEY>"
      }
    }
  }
}
```

Replace `<API_KEY>` with a personal API key from Linear:

**Linear → Settings → Security & access → New personal API key**

> **Alternative server command.** Cursor staff suggested the local Linear server package instead of the `mcp-remote` proxy. Either works; pick one:
>
> ```json
> "args": ["-y", "@linear/mcp-server"]
> ```

### 3. Verify

Restart Cursor if needed, then confirm the Linear MCP server shows as connected in **Settings → MCP**.

---

## Alternative Fix: repair the `cursor://` deep-link handler

If you would rather keep the OAuth flow, the underlying issue is that your browser/desktop doesn't route `cursor://` to the running instance. AppImage installs in particular often lack a proper URL handler. Register one that uses `--open-url`:

1. Create `~/.local/share/applications/cursor-url-handler.desktop`:

```ini
[Desktop Entry]
Name=Cursor URL Handler
Exec=/path/to/cursor --open-url %U
Type=Application
NoDisplay=true
MimeType=x-scheme-handler/cursor;
```

   Replace `/path/to/cursor` with your AppImage path (or `/usr/share/cursor/cursor` for `.deb`/`.rpm` installs).

2. Register the scheme:

```bash
xdg-mime default cursor-url-handler.desktop 'x-scheme-handler/cursor'
```

> **Caveat.** Some browsers (e.g. Edge) do not invoke `xdg-open` the same way, so this workaround is not fully reliable. The API-key approach above avoids the callback altogether and is the more robust fix.

---

## Why the API key approach works

| Approach | Auth method | Linux deep-link impact |
|----------|-------------|------------------------|
| Official plugin | OAuth via browser + `cursor://` callback | Broken — callback opens a new window and loses context |
| Custom MCP + API key | `LINEAR_API_KEY` in env | No browser redirect; works regardless of how Cursor is launched |

The custom setup proxies Linear's hosted MCP endpoint (or runs the local server) and authenticates with a static API key, bypassing the broken deep-link callback entirely.

---

## Security Notes

- Treat the personal API key like a password — do not commit it to git or share it in chat logs.
- Prefer a key scoped to the minimum permissions you need.
- Rotate the key in Linear if it is ever exposed.

---

## References

- [MCP OAuth not completing on Ubuntu (cursor:// callback opens new window) — Cursor Community Forum](https://forum.cursor.com/t/mcp-oauth-not-completing-on-ubuntu-cursor-callback-opens-new-window/158832) — confirms the new-window/new-process callback bug on Ubuntu and Debian; Cursor staff suggest the API-key workaround.
- [OAuth MCP login fails — Cursor Community Forum](https://forum.cursor.com/t/oauth-mcp-login-fails/135488/18) — AppImage/`.rpm` reproduction on Fedora/KDE; details the `cursor-url-handler.desktop` (`--open-url %U`) scheme-registration workaround.
