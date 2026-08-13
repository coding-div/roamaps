# MIGRATION_CHECKLIST.md — Roamaps

## Pre-Migration Checklist (Items Already Completed)

- [x] Full codebase audit completed (all files reviewed)
- [x] Project context documented (PROJECT_CONTEXT.md)
- [x] Requirements documented (REQUIREMENTS.md)
- [x] Architecture documented (ARCHITECTURE.md)
- [x] Current state documented (CURRENT_STATE.md)
- [x] Decisions and reasoning documented (DECISIONS_AND_REASONING.md)
- [x] Known issues documented (KNOWN_ISSUES.md)
- [x] Database/data model documented (DATABASE.md)
- [x] Integrations and config documented (INTEGRATIONS_AND_CONFIG.md)
- [x] Pending work documented (PENDING_WORK.md)
- [x] Continuation instructions written (CONTINUATION_INSTRUCTIONS.md)
- [x] GitHub repository created and pushed: `https://github.com/coding-div/roamaps`
- [x] All 8 Manus checkpoints preserved in Git history

## Post-Migration Checklist (For the New Account)

- [ ] Import/clone the project from GitHub into the new Manus account
- [ ] Verify the dev server starts and the app runs
- [ ] Take a screenshot of the landing page to confirm it works
- [ ] Open Tree 1 and verify it renders
- [ ] Open Tree 2 and verify it renders
- [ ] Test zoom in/out (pinch-to-zoom if on tablet, or +/- buttons)
- [ ] Test pan/drag
- [ ] Test long-press on a node (verify action panel appears)
- [ ] Read all documentation files in the order specified in CONTINUATION_INSTRUCTIONS.md
- [ ] Fix Bug 1 (arrow perpendicular direction)
- [ ] Fix Bug 2 (crossing arrow visibility)
- [ ] Fix Bug 3 (remove independent tree root)
- [ ] Confirm all 3 bugs are fixed before adding new features
- [ ] Push fixed code to GitHub
- [ ] Ask the user the pending questions from PENDING_WORK.md (persistence, new tree creation, etc.)

## Files in the Migration Package

| File | Purpose |
|------|---------|
| `PROJECT_CONTEXT.md` | What the project is, who the user is, overall vision |
| `REQUIREMENTS.md` | All confirmed requirements (current + obsolete) |
| `ARCHITECTURE.md` | How the code is structured, data model, rendering, state management |
| `CURRENT_STATE.md` | What works, what doesn't, file structure, key code locations |
| `DECISIONS_AND_REASONING.md` | Why things were built this way, rejected alternatives, lessons learned |
| `KNOWN_ISSUES.md` | Active bugs (with root causes and fix suggestions), fixed bugs, potential risks |
| `DATABASE.md` | Data model details, proposed flat model, persistence options |
| `INTEGRATIONS_AND_CONFIG.md` | Env vars, build config, theme config, fonts, Manus-specific settings |
| `PENDING_WORK.md` | Feature backlog in priority order, rejected features, pending user questions |
| `CONTINUATION_INSTRUCTIONS.md` | Step-by-step guide to continue development |
| `MIGRATION_CHECKLIST.md` | This file — pre and post migration checklists |

## GitHub Repository

- **URL:** `https://github.com/coding-div/roamaps`
- **Branch:** `main`
- **Visibility:** Public
- **Commit history:** 8 checkpoints from initial bootstrap to latest arrow fixes

## Manus Project Details (Original Account)

- **Project name:** roamaps
- **Latest checkpoint:** `4221609e`
- **Dev server URL:** `https://3000-iegfbk28297hvfijxmrbn-df6483a7.sg1.manus.computer`
- **Template:** web-static (React 19 + Tailwind 4)
