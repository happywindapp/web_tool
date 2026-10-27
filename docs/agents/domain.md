# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

**Layout: single-context.** ⚠️ Repo-specific deviation: ADRs live in **`docs/decisions/`** (this template's standard structure), NOT `docs/adr/`. Wherever a skill says `docs/adr/`, read/write `docs/decisions/` instead.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root (if absent, `ai-context/project-context.md` is the closest equivalent — read it for project overview, but domain vocabulary belongs in `CONTEXT.md` once it exists).
- **`docs/decisions/`** — read ADRs that touch the area you're about to work in.
- **`docs/glossary.md`** — existing domain vocabulary; keep it and `CONTEXT.md` consistent.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The producer skill (`/grill-with-docs`) creates them lazily when terms or decisions actually get resolved.

## File structure

```
/
├── CONTEXT.md                 ← created lazily by /grill-with-docs
├── ai-context/project-context.md   ← project overview (read first per template rules)
├── docs/decisions/            ← ADRs (this repo's equivalent of docs/adr/)
└── docs/glossary.md           ← domain terms
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md` / `docs/glossary.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/grill-with-docs`).

## Flag ADR conflicts

If your output contradicts an existing ADR in `docs/decisions/`, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
