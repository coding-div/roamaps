# Roamaps UI Registry

This registry records the reusable visual patterns introduced or reaffirmed by the branch-stage editor. The product language is **Obsidian Cartography**: graphite canvas surfaces, cobalt route signals, mono metadata, restrained borders, and precise map-instrument interactions.

## Canvas toolbar controls

Purpose: provide compact tablet-safe editor actions for Add node, Add joiner, Connect nodes, Undo, Redo, Reset, and view controls.

Pattern: `rounded-lg border border-[#2a2a35] bg-[#13131a] px-3 py-2 text-xs text-[#c4c4cc] transition-all active:scale-95`, with cobalt focus or active state for connection mode and a pale silver-white active state for Add Joiner mode. Toolbar actions are mutually exclusive where they change pointer interpretation.

## Joiner marker

Purpose: represent a persistent, unlabeled branch junction that behaves like a node while remaining visually distinct.

Pattern: a fixed-size SVG circular group with a charcoal offset shadow, dark center, silver-white outer ring, inner slate surface, and small highlight. The joiner uses the `white` palette token, has `kind: "joiner"`, and does not render a label or arrowhead. Attached tails remain visible; a free joiner has no tails.

## Joiner action panel

Purpose: edit or remove a joiner without confusing it with a normal labeled node or the arrow beneath it.

Pattern: the existing fixed dark action panel with `bg-[#13131a]`, `border-[#2a2a35]`, mono uppercase heading, `Edit Color`, and `Remove Joiner`. The label editor is intentionally omitted. When a joiner overlaps an arrow, the joiner has selection priority; the underlying arrow remains selectable on another segment.

## Toast feedback

Purpose: explain tablet actions without adding a navigation menu.

Patterns currently used by the branch stage include `Joiner placed`, `Arrow split`, and `Place the joiner on a clear arrow segment`. Success toasts confirm completed structural changes; blocked-placement toasts explain how to retry.

## Route styling

Purpose: keep directed graph relationships legible on a dark technical canvas.

Pattern: manually oriented arrowheads, 18px transparent hit paths, 2px colored visible paths, perpendicular node entry and exit, direct aligned routes when valid, orthogonal fallback routes when needed, and parallel lane offsets for reverse-direction arrows so they do not overlap.

## Registry maintenance rule

New editor controls must reuse these patterns or add a documented variant here before shipping. Hard-coded SVG colors remain centralized in the roadmap palette until the existing canvas token system is migrated to CSS variables in a separate cleanup pass.

