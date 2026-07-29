# RULES.md

Mandatory rules for AI agents working in this repo. These rules apply to **commits and code**. They do NOT apply to the documentation files (README.md, DESIGN.md, HANDOFF.md, STRUCTURE.md, SECURITY.md, CLAUDE.md) — docs may be detailed and use normal English.

## Git
1. Commit messages in simple English (A1 level). Short, present tense, lowercase start is fine.
   - Good: `add card drag sort`, `fix nav pill width`, `update ru texts`
   - Bad: `Implemented comprehensive card reordering functionality with drag-and-drop support`
2. Never mention Claude, AI, or any assistant in commits. Never add `Co-Authored-By: Claude <...>` or similar trailers. No emoji, no `🤖`.
3. Commits always go from the currently active GitHub CLI account (`gh auth status` shows it). Do not change `user.name` / `user.email`, do not use bot identities.
4. One logical change per commit. No giant mixed commits.

## Code style
1. Comments: lowercase, simple English (A1). One short line when needed, none when the code is obvious.
   - Good: `// save to storage`, `// one signature per ip`
   - Bad: `// This function is responsible for persisting the serialized state`
2. Keep functions small. No dead code left behind.
3. UI text: no long dashes (—). Use `-` or `·`.
4. Animate only `transform` and `opacity`. Custom easing `cubic-bezier(.22,1,.36,1)` (the `--ease` CSS var), durations .15-.7s. Respect `prefers-reduced-motion`.

## Content
1. Every user-facing string exists in EN and RU (RU fields use the `*Ru` suffix and fall back to EN when empty).
2. No prices and no selling copy on the public page. It is a personal portfolio: about, work, two links.
3. Contacts are data, not hardcoded: telegram / github / email come from the settings stored by `lib/data.ts`.
4. Secrets never land in code or commits. The admin passphrase lives in the `ADMIN_PASSWORD` env var (`.env.local` locally, Vercel env vars in prod).

## Agent skills
When an AI agent starts working here, it must load the matching skills before touching files:
- **emil-design-eng** — any UI polish, component or animation decision.
- **apple-design** — motion, gestures, materials, fluid-interface work.
- **find-animation-opportunities / improve-animations** — planning or auditing motion.
- **vercel:react-best-practices** — after editing React/TSX components.
Skills that do not match the task must not be initialized. Reading CLAUDE.md + RULES.md is always mandatory.
