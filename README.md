# TTRPG Handouts Generator

A focused tool for game masters to create, manage, and share handouts for tabletop RPG sessions.

## Problem

Physical TTRPG handouts get lost after distribution. Players rely on incomplete notes, and GMs lose access to handouts they created. This tool provides a permanent source of truth for session handouts.

## Features

- **Create handouts**: Write markdown text over themed background images
- **Instant preview**: See rendered handouts before sharing
- **Share via link**: Generate permanent read-only links for players (no login required)
- **Organize**: Tag handouts for easy reference across sessions
- **Manage**: Edit or delete handouts from your personal library

## Tech Stack

- **Framework**: Astro
- **Database & Auth**: Supabase
- **Deployment**: Cloudflare Pages
- **CI/CD**: GitHub Actions

## Getting Started

```bash
npm install
npm run dev
```

## Project Structure

- `context/foundation/` - Product requirements and architecture decisions
- `src/` - Application source code
- `.github/workflows/` - CI/CD pipeline

## MVP Scope

- 3 pre-loaded category backgrounds (grimdark, high fantasy, postapo)
- Markdown-based handout editing
- Link-only sharing (no PDF export in v1)
- Single default font
- Auth via email/password

---

**Timeline**: 3-week MVP | **Status**: In development
