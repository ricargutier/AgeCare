# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

This repo is in an early "spec + prototype" phase. There is no build system, package manager, test runner, or framework — just specs and a single static HTML prototype.

- [SPEC.md](SPEC.md) — UI/UX/functional spec for the **login page only**. This is what the current code implements.
- [docs/](docs/) — broader product spec kit (PRD, user personas, user stories, technical architecture) for the full IoT elder-care platform. The product *vision* described here is much larger than what is built; treat it as forward-looking context, not a description of the current code.
- [index.html](index.html) — the entire current implementation. Single self-contained file with inline CSS and inline JS (no external scripts beyond Google Fonts). The form's "submit" is a simulated 1.5s `setTimeout` that ends in `alert()`.
- `.github/workflows/` — `claude.yml` (PR assistant) and `claude-code-review.yml` (auto code review). No CI build/test pipelines.

## Running / developing

- No build step. Open [index.html](index.html) in a browser, or serve the directory with any static server (`python -m http.server`, etc.).
- No tests, no linter configured. Don't fabricate `npm test` / `npm run build` instructions.

## Working in this repo

- The product docs in [docs/](docs/) describe a HIPAA-bound IoT platform with hardware, cloud backend, and mobile apps. **None of that exists in code.** Don't infer architecture (auth service, MQTT, AWS IoT, etc.) from those docs when reasoning about the current `index.html` — the login form has no backend.
- When extending the login page, keep the design tokens in [SPEC.md §2](SPEC.md) (color palette, typography, spacing) as the source of truth — they're mirrored as CSS variables at the top of `index.html`.
- If asked to add a real backend, framework, or build tooling, surface that this is a structural change (introducing the first build system) and confirm direction before scaffolding.
