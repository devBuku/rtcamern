# Conventions & Agent Behavior

How to work in this repo. These conventions preserve the hand-coded learning approach and keep the codebase maintainable.

---

## Core Principles

- **Non-intrusive:** Don't scaffold large portions. Preserve the hand-written learning approach.
- **Verify before changing:** Read executable sources (scripts/config) over docs if conflict. Investigate unfamiliar files before overwriting.
- **Minimal edits:** Prefer `edit` for targeted changes, `write` only for new files or full replacements. Don't chain noisy shell separators.
- **Read full files when needed:** Diffs are insufficient — read full affected files for context.
- **Simple & specific:** Only keep repo-specific, high-signal guidance. If obvious from code/config, omit.

See [Editing Discipline](#editing-discipline) for the practical application of these principles.

---

## Documentation Sync

When modifying behavior (env, endpoints, sockets, middleware, cron):
1. Update relevant `docs/*.md` files.
2. Keep `README.md` as the entry point.
3. Update `AGENTS.md` and agent-specific docs if the change affects how agents should work.

---

## Commit Style

Follow the existing commit style from git history:
- Conventional-like, concise messages.
- Examples: `feat: add cron-based keep-alive`, `Add HTTP status constants`, `Remove EXPOSE/HEALTHCHECK from Dockerfile`.
- Keep commits focused — one logical change per commit.

---

## Related Documentation

- [`AGENT-COMMANDS.md`](./AGENT-COMMANDS.md) — Commands reference
- [`AGENT-GOTCHAS.md`](./AGENT-GOTCHAS.md) — Gotchas & constraints
- [`AGENT-TYPESCRIPT.md`](./AGENT-TYPESCRIPT.md) — TypeScript & compiler quirks
